import { FiscalSnapshot, Month, MONTHS, LedgerMonth } from "../domain/types";

export interface DashboardViewModel {
    kpis: {
        income: number;
        outflow: number;
        balance: number;
        closingTreasury: number;
        provisions: number; // To Set Aside (Current Month Accumulation)
        safeToSpend: number;
        safeToSpendStatus: 'SAFE' | 'TENDU' | 'DANGER';
    };
    nextDue: {
        date: string;
        amount: number;
        label: string;
        daysRemaining: number;
    } | null;
    charts: {
        expenseDistribution: { name: string, value: number, color: string }[];
        incomeDistribution: { name: string, value: number, color: string }[];
        projectionSeries: { month: string, treasury: number, safeLine: number }[];
    };
}

export class DashboardPresenter {
    constructor(private snapshot: FiscalSnapshot) { }

    private getNow(): Date {
        // Strict adherence: use computedAt from metadata
        return new Date(this.snapshot.metadata.computedAt);
    }

    private getMonthIndex(date: Date): number {
        return date.getUTCMonth(); // 0-11
    }

    private getCurrentMonthKey(): Month {
        const now = this.getNow();
        return MONTHS[now.getUTCMonth()];
    }

    public getViewModel(period: { type: 'year' | 'quarter' | 'month', value: string }): DashboardViewModel {
        const now = this.getNow();
        const currentMonthKey = this.getCurrentMonthKey();
        const targetMonths = this.getTargetMonths(period);
        const ledger = this.snapshot.ledgerFinal;

        // --- 1. Basic KPIs (Aggregated over period) ---
        let income = 0;
        let outflow = 0;
        let balance = 0;
        let totalTaxPayments = 0;

        targetMonths.forEach(m => {
            const row = ledger.byMonth[m];
            income += row.income_ttc_cents;

            const taxInMonth = row.urssaf_cash_cents + row.ircec_cash_cents + row.ir_cash_cents +
                row.vat_cash_cents + row.other_taxes_cash_cents;
            totalTaxPayments += taxInMonth;

            // Outflow = Expenses + Taxes Paid
            const rowOutflow = row.expense_pro_ttc_cents + row.expense_perso_ttc_cents + row.expense_autre_ttc_cents + taxInMonth;
            outflow += rowOutflow;
            balance += row.net_cashflow_cents;
        });

        // --- 2. Advanced KPIs (Point in Time: NOW) ---
        // Using Current Month Closing as the baseline for "Now" state
        const currentMonthRow = ledger.byMonth[currentMonthKey];
        const closingTreasury = currentMonthRow.closing_treasury_cents;

        // To Set Aside: Provisions calculated for the CURRENT month (accumulated debt)
        // This is what has been "consumed" in terms of tax debt this month
        const toSetAside = currentMonthRow.provision_social_cents + currentMonthRow.provision_tax_cents + currentMonthRow.provision_vat_cents;

        // Next Due Logic
        const nextDue = this.getNextDue(now);

        // Safe To Spend Logic
        // Formula: ClosingTreasury (End of Month) - Scheduled items in [EndOfMonth+1, Now+30d]
        // This avoids double counting items already paid within the current month (included in closingTreasury)
        const safeToSpend = this.computeSafeToSpend(now, closingTreasury);

        let safeToSpendStatus: 'SAFE' | 'TENDU' | 'DANGER' = 'SAFE';
        if (safeToSpend < 0) safeToSpendStatus = 'DANGER';
        else if (safeToSpend < 100000) safeToSpendStatus = 'TENDU'; // Arbitrary 1000€ threshold for MVP

        return {
            kpis: {
                income,
                outflow,
                balance,
                closingTreasury,
                provisions: toSetAside,
                safeToSpend,
                safeToSpendStatus
            },
            nextDue,
            charts: {
                expenseDistribution: this.getExpenseDistribution(targetMonths),
                incomeDistribution: this.getIncomeDistribution(targetMonths),
                projectionSeries: this.getProjectionSeries(now, 6)
            }
        };
    }

    private getNextDue(now: Date) {
        // Filter schedule items
        const candidates = this.snapshot.schedule.filter(item => {
            const dueDate = new Date(item.date);
            // Must be in future or today (>= start of day)
            // Strict comparison: dueDate >= now (ignoring time if purely date based strings)
            // But item.date is YYYY-MM-DD. now is ISO.
            // Let's rely on string comparison for YYYY-MM-DD to simplify if possible, or simple Date compare
            return dueDate.getTime() >= now.getTime() && item.amount > 0;
        }).sort((a, b) => a.date.localeCompare(b.date));

        if (candidates.length === 0) return null;

        const first = candidates[0];
        const diffTime = Math.abs(new Date(first.date).getTime() - now.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            date: first.date,
            amount: first.amount,
            label: first.label,
            daysRemaining: diffDays
        };
    }

    private computeSafeToSpend(now: Date, closingTreasuryCurrentMonth: number): number {
        // 1. Identify "Window of overlap"
        // ClosingTreasury accounts for all payments in Current Month.
        // We look for payments due in (Next 30 Days) BUT NOT in (Current Month).

        const thirtyDaysLater = new Date(now);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

        const upcomingLiabilities = this.snapshot.schedule.filter(item => {
            const d = new Date(item.date);
            // Condition: Date > CurrentMonthEnd AND Date <= Now+30
            return d > currentMonthEnd && d <= thirtyDaysLater;
        }).reduce((sum, item) => sum + item.amount, 0);

        // [HOTFIX V2.5] Include Projected Operations (Expenses) in Safe-to-Spend
        const upcomingExpenses = this.snapshot.projectedOperations.filter(op => {
            if (op.direction !== 'out') return false;
            // Exclude Taxes/Social to avoid double counting with Schedule (if they are in Schedule)
            // Schedule contains: URSSAF, IRCEC, TVA, IR.
            // Operations contains: EXPENSE (Pro/Perso/Autre) and also TAX_PAYMENT.
            // We must ONLY take REAL EXPENSES (Kind = EXPENSE or TRANSFER)
            if (op.kind === 'TAX_PAYMENT') return false;

            const d = new Date(op.date);
            return d > currentMonthEnd && d <= thirtyDaysLater;
        }).reduce((sum, op) => sum + op.amount_ttc, 0);

        return closingTreasuryCurrentMonth - upcomingLiabilities - upcomingExpenses;
    }

    private getProjectionSeries(now: Date, monthsCount: number) {
        const currentMonthIdx = now.getMonth();
        const startIdx = currentMonthIdx;
        const endIdx = Math.min(startIdx + monthsCount, 11);

        const series = [];
        for (let i = startIdx; i <= endIdx; i++) {
            const m = MONTHS[i];
            const row = this.snapshot.ledgerFinal.byMonth[m];

            // Safe Line could be "Projected - ProvisionsAccumulated"? 
            // For MVP, simplistic view: Treasury
            series.push({
                month: m,
                treasury: row.closing_treasury_cents,
                safeLine: row.closing_treasury_cents - (row.provision_social_cents + row.provision_tax_cents) // Visual indication of "net"
            });
        }
        return series;
    }

    private getTargetMonths(period: { type: 'year' | 'quarter' | 'month', value: string }): Month[] {
        if (period.type === 'year') return [...MONTHS];
        if (period.type === 'month') return [period.value as Month];
        if (period.type === 'quarter') {
            if (period.value === 'Q1') return ['Jan', 'Feb', 'Mar'];
            if (period.value === 'Q2') return ['Apr', 'May', 'Jun'];
            if (period.value === 'Q3') return ['Jul', 'Aug', 'Sep'];
            if (period.value === 'Q4') return ['Oct', 'Nov', 'Dec'];
        }
        return [...MONTHS];
    }

    private getExpenseDistribution(months: Month[]) {
        let pro = 0, perso = 0, tax = 0, other = 0, social = 0, vat = 0;
        months.forEach(m => {
            const r = this.snapshot.ledgerFinal.byMonth[m];
            pro += r.expense_pro_ttc_cents;
            perso += r.expense_perso_ttc_cents;
            other += r.expense_autre_ttc_cents;
            social += (r.urssaf_cash_cents + r.ircec_cash_cents);
            tax += r.ir_cash_cents + r.other_taxes_cash_cents;
            vat += r.vat_cash_cents;
        });

        return [
            { name: "Pro", value: pro, color: "#3b82f6" },
            { name: "Perso", value: perso, color: "#a855f7" },
            { name: "Social", value: social, color: "#ec4899" },
            { name: "Impôts", value: tax, color: "#f97316" },
            { name: "Autres", value: other, color: "#64748b" },
            { name: "TVA", value: vat, color: "#eab308" },
        ].filter(item => item.value > 0);
    }

    private getIncomeDistribution(months: Month[]) {
        let salary = 0;
        let other = 0;
        months.forEach(m => {
            const r = this.snapshot.ledgerFinal.byMonth[m];
            salary += r.income_ttc_cents;
        });

        return [
            { name: "Revenus", value: salary, color: "#3b82f6" },
            { name: "Autres", value: other, color: "#10b981" },
        ].filter(item => item.value > 0);
    }
}
