import { FiscalOutput, FiscalOperation, Month, MONTHS, ScheduleItem, TaxLineItem, TreasuryAnchor, LedgerMonth, LedgerFinal } from "../domain/types";

export function projectLedger(
    output: FiscalOutput,
    normalizedOps: FiscalOperation[],
    anchor: TreasuryAnchor,
    options: {
        vatPaymentFrequency?: 'monthly' | 'yearly';
        hasManualSchedule?: {
            urssaf: boolean;
            ircec: boolean;
            tax: boolean;
        }
    }
): LedgerFinal {
    const byMonth = MONTHS.reduce((acc, m) => {
        acc[m] = {
            month: m,
            income_ttc_cents: 0,
            expense_perso_ttc_cents: 0,
            expense_pro_ttc_cents: 0,
            expense_autre_ttc_cents: 0,
            vat_collected_cents: 0,
            vat_deductible_cents: 0,
            vat_due_cents: 0,
            urssaf_cash_cents: 0,
            ircec_cash_cents: 0,
            ir_cash_cents: 0,
            vat_cash_cents: 0,
            other_taxes_cash_cents: 0,
            net_cashflow_cents: 0,
            closing_treasury_cents: 0,
            provision_social_cents: 0,
            provision_tax_cents: 0,
            provision_vat_cents: 0
        };
        return acc;
    }, {} as Record<Month, LedgerMonth>);

    // 1. Map Normalized Ops
    normalizedOps.forEach(op => {
        const date = new Date(op.date);
        const monthIndex = date.getMonth();
        const monthName = MONTHS[monthIndex];
        const row = byMonth[monthName];

        if (op.direction === 'in') {
            if (op.kind === 'REVENUE') {
                row.income_ttc_cents += op.amount_ttc;
                row.vat_collected_cents += op.amount_tva;
            }
        } else {
            const isIncomeTax = op.category === 'FISCAL' && op.subcategory === 'IR';
            if (op.scope === 'perso' && !isIncomeTax) {
                row.expense_perso_ttc_cents += op.amount_ttc;
            } else {
                if (op.category === 'SOCIAL') {
                    if (op.subcategory === 'URSSAF') row.urssaf_cash_cents += op.amount_ttc;
                    else if (op.subcategory === 'IRCEC') row.ircec_cash_cents += op.amount_ttc;
                } else if (op.category === 'FISCAL') {
                    if (op.subcategory === 'IR') row.ir_cash_cents += op.amount_ttc;
                    else row.other_taxes_cash_cents += op.amount_ttc;
                } else if (op.category === 'VAT') {
                    row.vat_cash_cents += op.amount_ttc;
                } else if (op.category === 'AUTRE') {
                    row.expense_autre_ttc_cents += op.amount_ttc;
                } else {
                    row.expense_pro_ttc_cents += op.amount_ttc;
                    row.vat_deductible_cents += op.amount_tva;
                }
            }
        }
    });

    // 2. Map Schedule
    output.schedule.forEach((item: ScheduleItem) => {
        const date = new Date(item.date);
        if (date.getFullYear() !== output.metadata.rulesetYear) return;

        const monthIndex = date.getMonth();
        const monthName = MONTHS[monthIndex];
        const row = byMonth[monthName];

        if (item.organization === 'URSSAF_AA') {
            if (!options.hasManualSchedule?.urssaf && row.urssaf_cash_cents === 0) row.urssaf_cash_cents += item.amount;
        } else if (item.organization === 'IRCEC') {
            if (!options.hasManualSchedule?.ircec && row.ircec_cash_cents === 0) row.ircec_cash_cents += item.amount;
        } else if (item.organization === 'DGFIP' && item.label.includes('Impôt')) {
            if (!options.hasManualSchedule?.tax && row.ir_cash_cents === 0) row.ir_cash_cents += item.amount;
        } else if (item.organization === 'DGFIP' && item.label.includes('TVA')) {
            if (row.vat_cash_cents === 0) row.vat_cash_cents += item.amount;
        } else {
            row.other_taxes_cash_cents += item.amount;
        }
    });

    // 3. Monthly VAT Projection (Logic from bridge)
    if (options.vatPaymentFrequency === 'monthly') {
        for (let i = 0; i < MONTHS.length - 1; i++) {
            const currentMonth = MONTHS[i];
            const nextMonth = MONTHS[i + 1];
            const netVat = byMonth[currentMonth].vat_collected_cents - byMonth[currentMonth].vat_deductible_cents;
            if (netVat > 0 && byMonth[nextMonth].vat_cash_cents === 0) {
                byMonth[nextMonth].vat_cash_cents += netVat;
            }
        }
    }

    // 4. Provisions calculation
    const totalSocialLiability = output.taxes.urssaf.concat(output.taxes.ircec).reduce((sum, t) => sum + t.amount, 0);
    const totalTaxLiability = output.taxes.ir.reduce((sum, t) => sum + t.amount, 0);
    const totalVatLiability = output.bases.vat.balance;

    let cumulativeSocialPaid = 0;
    let cumulativeTaxPaid = 0;
    let cumulativeVatPaid = 0;

    MONTHS.forEach(m => {
        const row = byMonth[m];
        cumulativeSocialPaid += (row.urssaf_cash_cents + row.ircec_cash_cents);
        cumulativeTaxPaid += row.ir_cash_cents;
        cumulativeVatPaid += row.vat_cash_cents;

        row.provision_social_cents = Math.max(0, totalSocialLiability - cumulativeSocialPaid);
        row.provision_tax_cents = Math.max(0, totalTaxLiability - cumulativeTaxPaid);
        row.provision_vat_cents = Math.max(0, totalVatLiability - cumulativeVatPaid);

        const inflow = row.income_ttc_cents;
        const outflow = row.expense_pro_ttc_cents + row.expense_perso_ttc_cents + row.expense_autre_ttc_cents +
            row.urssaf_cash_cents + row.ircec_cash_cents +
            row.ir_cash_cents + row.vat_cash_cents + row.other_taxes_cash_cents;
        row.net_cashflow_cents = inflow - outflow;
    });

    // 5. Treasury calculation
    let initialTreasury = 0;
    if (anchor.monthIndex === -1) {
        initialTreasury = anchor.amount_cents;
    } else {
        let sumPrevFlows = 0;
        for (let i = 0; i < anchor.monthIndex; i++) {
            sumPrevFlows += byMonth[MONTHS[i]].net_cashflow_cents;
        }
        initialTreasury = anchor.amount_cents - sumPrevFlows;
    }

    let runningTreasury = initialTreasury;
    MONTHS.forEach(m => {
        const row = byMonth[m];
        runningTreasury += row.net_cashflow_cents;
        row.closing_treasury_cents = runningTreasury;
    });

    return {
        byMonth,
        initialTreasury,
        projectedTreasury: runningTreasury,
        currentYearProvisionSocial_cents: totalSocialLiability,
        currentYearProvisionTax_cents: totalTaxLiability,
        currentYearProvisionVat_cents: totalVatLiability
    };
}
