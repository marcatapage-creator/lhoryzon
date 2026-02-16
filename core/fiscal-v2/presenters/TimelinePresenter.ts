import { FiscalSnapshot, MONTHS } from "../domain/types";

export interface TimelineEvent {
    id: string;
    month: string;
    label: string;
    amount: number;
    type: 'vat' | 'social' | 'tax' | 'pro' | 'personal' | 'other' | 'income';
    status: 'realized' | 'projected';
}

export class TimelinePresenter {
    constructor(private snapshot: FiscalSnapshot) { }

    private getNow(): Date {
        // Strict adherence: use computedAt from metadata
        const nowStr = this.snapshot.metadata.computedAt;
        return nowStr ? new Date(nowStr) : new Date(); // Fallback if missing (should not happen in valid state)
    }

    public getEvents(): TimelineEvent[] {
        const events: TimelineEvent[] = [];
        const now = this.getNow();

        const currentMonthIdx = now.getMonth();
        const currentYear = now.getFullYear();
        const targetYear = this.snapshot.metadata.rulesetYear;

        MONTHS.forEach((m, idx) => {
            const row = this.snapshot.ledgerFinal.byMonth[m];

            // Status logic: 
            // - If targetYear < currentYear -> All realized
            // - If targetYear > currentYear -> All projected
            // - If targetYear == currentYear -> realized if monthIdx <= currentMonthIdx (assuming computing at END of month or realtime)
            // Let's assume computedAt roughly matches realtime, so months <= current are "in progress/done" -> realized (or partially)
            // For MVP simplicity: Current month is 'realized' (as we have actuals mixed with projection). Future is 'projected'.

            let status: 'realized' | 'projected' = 'projected';
            if (targetYear < currentYear) status = 'realized';
            else if (targetYear === currentYear && idx <= currentMonthIdx) status = 'realized';
            else if (targetYear > currentYear) status = 'projected';

            // 1. Income (Aggregated)
            if (row.income_ttc_cents > 0) {
                events.push({ id: `inc-${m}`, month: m, label: "Encaissements", amount: row.income_ttc_cents, type: 'income', status });
            }

            // 2. Pro Expenses (Aggregated)
            if (row.expense_pro_ttc_cents > 0) {
                events.push({ id: `pro-${m}`, month: m, label: "Dépenses Pro", amount: row.expense_pro_ttc_cents, type: 'pro', status });
            }

            // 3. Taxes & Social
            if (row.urssaf_cash_cents > 0) events.push({ id: `urssaf-${m}`, month: m, label: "URSSAF", amount: row.urssaf_cash_cents, type: 'social', status });
            if (row.ircec_cash_cents > 0) events.push({ id: `ircec-${m}`, month: m, label: "IRCEC", amount: row.ircec_cash_cents, type: 'social', status });
            if (row.ir_cash_cents > 0) events.push({ id: `ir-${m}`, month: m, label: "Impôt Revenu", amount: row.ir_cash_cents, type: 'tax', status });
            if (row.vat_cash_cents > 0) events.push({ id: `vat-${m}`, month: m, label: "TVA", amount: row.vat_cash_cents, type: 'vat', status });
            if (row.other_taxes_cash_cents > 0) events.push({ id: `tax-other-${m}`, month: m, label: "Autres Taxes", amount: row.other_taxes_cash_cents, type: 'tax', status });

            // 4. Personal & Other
            if (row.expense_perso_ttc_cents > 0) events.push({ id: `perso-${m}`, month: m, label: "Dépenses Perso", amount: row.expense_perso_ttc_cents, type: 'personal', status });
            if (row.expense_autre_ttc_cents > 0) events.push({ id: `other-${m}`, month: m, label: "Autres Sorties", amount: row.expense_autre_ttc_cents, type: 'other', status });
        });

        // Sort by Month Index? They are already generated in order of MONTHS array.
        return events;
    }
}
