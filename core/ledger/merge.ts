import { LedgerFinal, LedgerMonth, LedgerOps, LedgerTaxes, MONTHS } from "./types";

export interface FiscalTotals {
    social_total_cents: number;
    income_tax_total_cents: number;
}

export function mergeLedgers(
    ops: LedgerOps,
    taxes: LedgerTaxes,
    initialTreasury: number,
    fiscalTotals: FiscalTotals = { social_total_cents: 0, income_tax_total_cents: 0 }
): LedgerFinal {
    const byMonth: Record<string, LedgerMonth> = {} as any;

    // 1. Calculate Total Annual Income for Pro-rata
    let totalAnnualIncome = 0;
    MONTHS.forEach(m => {
        totalAnnualIncome += ops.byMonth[m].income_ttc;
    });

    // Avoid division by zero
    if (totalAnnualIncome === 0) totalAnnualIncome = 1;

    MONTHS.forEach(m => {
        const opRow = ops.byMonth[m];
        const taxRow = taxes.byMonth[m];

        // Anti-Double Count Logic:
        // If Manual Tax/Social is present in Ops (User input in "Expenses"), use that.
        // Else use Tax Ledger (Engine/Scheduled).

        // Check if Ops has manual entries for social/tax
        const manualSocial = opRow.manual_social || 0;
        const manualTax = opRow.manual_tax || 0;

        // Priority: Manual Ops > Scheduled Taxes
        const urssaf = manualSocial > 0 ? 0 : taxRow.urssaf;
        const ircec = manualSocial > 0 ? 0 : taxRow.ircec;
        const incomeTax = manualTax > 0 ? 0 : taxRow.ir;

        const finalUrssaf = manualSocial > 0 ? manualSocial : urssaf;
        const finalIrcec = manualSocial > 0 ? 0 : ircec; // If manual social is lump, we zero specific ircec
        const finalIncomeTax = manualTax > 0 ? manualTax : incomeTax;

        // Provisions (Liability) Calculation
        // Weight = Income(M) / TotalIncome
        const weight = opRow.income_ttc / totalAnnualIncome;
        const provisionSocial = Math.round(fiscalTotals.social_total_cents * weight);
        const provisionTax = Math.round(fiscalTotals.income_tax_total_cents * weight);

        // Calculate VAT due (Accrual)
        const vatDue = (opRow.vat_collected || 0) - (opRow.vat_deductible || 0);

        byMonth[m] = {
            month: m,
            income_ttc_cents: opRow.income_ttc,
            expense_perso_ttc_cents: opRow.expense_perso,
            expense_pro_ttc_cents: opRow.expense_pro,

            vat_collected_cents: opRow.vat_collected,
            vat_deductible_cents: opRow.vat_deductible,
            vat_due_cents: vatDue, // Calculated
            vat_cash_cents: taxRow.vat_payment, // From Schedule

            urssaf_cash_cents: finalUrssaf,
            ircec_cash_cents: finalIrcec,
            ir_cash_cents: finalIncomeTax,
            other_taxes_cash_cents: taxRow.other_taxes,

            net_cashflow_cents: 0, // Computed later
            closing_treasury_cents: 0, // Computed later

            provision_social_cents: provisionSocial,
            provision_tax_cents: provisionTax,
            provision_vat_cents: 0 // Not tracked as separate provision usually, covered by vat_due
        };
    });

    return {
        byMonth,
        initialTreasury,
        projectedTreasury: 0
    };
}
