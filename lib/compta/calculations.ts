import { FiscalProfile } from "./types";
import { FiscalContext, Operation } from "@/core/fiscal-v2/domain/types";
import { computeFiscalSnapshot } from "@/core/fiscal-v2";

export function computeFilteredTotals(
    op: Operation,
    _filter: string,
    profile: FiscalProfile | null
) {
    if (!profile) {
        return {
            incomeTTC_cents: 0,
            realTreasuryOutflow_cents: 0,
            projectedTreasury_cents: 0,
            vatNet_cents: 0,
        };
    }

    // Adapt Legacy Profile to V3 Context
    const statusMap: Record<string, FiscalContext['userStatus']> = {
        'micro': 'freelance',
        'ei': 'freelance',
        'url_ir': 'freelance',
        'sas_is': 'sasu'
    };
    const userStatus = statusMap[profile.status] || 'freelance';

    // Default context for single-op view
    const context: FiscalContext = {
        taxYear: op.year,
        now: new Date().toISOString(),
        userStatus,
        fiscalRegime: profile.status === 'micro' ? 'micro' : 'reel',
        vatRegime: profile.vatEnabled ? 'reel_mensuel' : 'franchise',
        household: { parts: 1, children: 0 },
        options: {
            estimateMode: true,
            defaultVatRate: 2000,
            vatPaymentFrequency: op.vatPaymentFrequency === 'quarterly' ? 'monthly' : op.vatPaymentFrequency
        }
    };

    // Calculate V3 Snapshot
    const snapshot = computeFiscalSnapshot([op], context);
    const ledger = snapshot.ledgerFinal;

    let income = 0;
    let outflow = 0;
    let vatNet = 0;

    // Aggregate monthly data
    Object.values(ledger.byMonth).forEach(m => {
        income += m.income_ttc_cents;

        // Outflow = Expenses + Taxes Paid
        const monthlyOutflow = m.expense_pro_ttc_cents +
            m.expense_perso_ttc_cents +
            m.expense_autre_ttc_cents +
            m.urssaf_cash_cents +
            m.ircec_cash_cents +
            m.ir_cash_cents +
            m.vat_cash_cents +
            m.other_taxes_cash_cents;

        outflow += monthlyOutflow;

        // VAT Net (Collected - Deductible)
        // Note: this is theoretical net VAT, not cash payment
        vatNet += (m.vat_collected_cents - m.vat_deductible_cents);
    });

    return {
        incomeTTC_cents: income,
        realTreasuryOutflow_cents: outflow,
        projectedTreasury_cents: ledger.projectedTreasury, // Net Cashflow for the year (since anchor=0)
        vatNet_cents: vatNet
    };
}
