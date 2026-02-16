
import { Operation, Month, MONTHS } from "@/lib/compta/types";
import { LedgerOps, LedgerMonth, AllocationRule, Periodicity } from "./types";

const INITIAL_MONTH_LEDGER: Omit<LedgerMonth, 'month'> = {
    income_ttc_cents: 0,
    expense_perso_ttc_cents: 0,
    expense_pro_ttc_cents: 0,
    vat_collected_cents: 0,
    vat_deductible_cents: 0,
    urssaf_cash_cents: 0,
    ircec_cash_cents: 0,
    ir_cash_cents: 0,
    vat_cash_cents: 0,
    other_taxes_cash_cents: 0,
    net_cashflow_cents: 0,
    closing_treasury_cents: 0,
};

export function normalizeOperationsToLedger(ops: Operation[]): LedgerOps {
    // Initialize empty ledger
    const byMonth: LedgerOps['byMonth'] = {} as any;
    MONTHS.forEach(m => {
        byMonth[m] = {
            income_ttc: 0,
            expense_perso: 0,
            expense_pro: 0,
            manual_social: 0,
            manual_tax: 0,
            vat_collected: 0,
            vat_deductible: 0
        };
    });

    ops.forEach(op => {
        // 1. Income Items
        // Salary
        Object.entries(op.income.salaryTTCByMonth).forEach(([month, amount]) => {
            if (amount > 0) {
                byMonth[month as Month].income_ttc += amount;
                // Salary VAT (if applicable, e.g. Artist-Author logic, but usually salary is 0 VAT in standard BNC, 
                // but checking if user set VAT rate on salary - usually not available in schema, assuming 0 for now or implicit)
                // The schema checks `isArtistAuthor` for validation but simple BNC is 0.
                if (op.isArtistAuthor) {
                    // 10% VAT for AA usually
                    const vat = Math.round(amount * 0.10 / 1.10);
                    byMonth[month as Month].vat_collected += vat;
                }
            }
        });

        // Other Income
        if (op.income.otherIncomeTTC_cents > 0) {
            const hasSpecificMonths = op.income.otherIncomeSelectedMonths && op.income.otherIncomeSelectedMonths.length > 0;
            const rule = hasSpecificMonths ? 'due_on_specific_months' : 'spread_evenly';

            distributeAmount(
                op.income.otherIncomeTTC_cents,
                'yearly',
                rule,
                op.income.otherIncomeSelectedMonths,
                (m, amt) => {
                    byMonth[m].income_ttc += amt;
                    // VAT
                    if (op.income.otherIncomeVATRate_bps > 0) {
                        const rate = op.income.otherIncomeVATRate_bps / 10000;
                        byMonth[m].vat_collected += Math.round(amt * rate / (1 + rate));
                    }
                }
            );
        }

        // Income Items
        op.income.items.forEach(item => {
            distributeAmount(
                item.amount_ttc_cents,
                item.periodicity as Periodicity,
                'spread_evenly', // Default, need schema update if we want granular control per item
                [], // No specific month selection in schema for IncomeItem yet, or inferred?
                // Actually IncomeItemSchema has periodicity.
                (m, amt) => {
                    byMonth[m].income_ttc += amt;
                    const rate = (item.vatRate_bps || 0) / 10000;
                    byMonth[m].vat_collected += Math.round(amt * rate / (1 + rate));
                }
            );
        });

        // 2. Expenses Pro
        // Override
        if (op.expenses.pro.totalOverrideTTC_cents !== null && op.expenses.pro.totalOverrideTTC_cents !== undefined) {
            // If override exists, it CRUSHES items for the totals, but we need to respect it.
            // Usually override is spread evenly.
            const monthly = Math.round(op.expenses.pro.totalOverrideTTC_cents / 12);
            MONTHS.forEach(m => {
                byMonth[m].expense_pro += monthly;
            });
        } else {
            // Items
            op.expenses.pro.items.forEach(item => {
                distributeAmount(
                    item.amount_ttc_cents,
                    item.periodicity as Periodicity,
                    'due_on_period_end', // Default to Cash Basis
                    [],
                    (m, amt) => {
                        if (item.category === 'social') {
                            byMonth[m].manual_social += amt;
                        } else if (item.category === 'tax') {
                            byMonth[m].manual_tax += amt;
                        } else {
                            byMonth[m].expense_pro += amt;
                        }

                        // VAT Deductible logic (applies to all pro/social if user set VAT?)
                        // Usually Social/Tax has 0 VAT, but if user set it, we track it.
                        const rate = (item.vatRate_bps || 0) / 10000;
                        byMonth[m].vat_deductible += Math.round(amt * rate / (1 + rate));
                    }
                );
            });
        }

        // 3. Expenses Personal
        op.expenses.personal.items.forEach(item => {
            distributeAmount(
                item.amount_cents,
                item.periodicity as Periodicity,
                'due_on_period_end',
                [],
                (m, amt) => {
                    byMonth[m].expense_perso += amt;
                }
            );
        });

        // 4. Other Items
        op.expenses.otherItems.forEach(item => {
            // These have explicit selectedWeeks or months
            if (item.selectedMonths && item.selectedMonths.length > 0) {
                const amountPerMonth = Math.round(item.amount_cents / item.selectedMonths.length); // Or is amount global? Schema says amount_cents. usually global.
                // WARNING: existing UI usually treats amount as "Total" or "Per recurrence"?
                // existing `useDashboardData.ts`:
                // if selectedMonths: amount = item.amount_cents (per month??) NO.
                // "events.push... amount: i.amount_cents". It pushes the FULL amount for EACH selected month.
                // So amount is PER OCCURRENCE.
                item.selectedMonths.forEach(m => {
                    byMonth[m].expense_perso += item.amount_cents; // Categorized as personal/other
                });
            } else {
                // Fallback
                distributeAmount(
                    item.amount_cents,
                    item.periodicity as Periodicity,
                    'due_on_period_end',
                    [],
                    (m, amt) => {
                        byMonth[m].expense_perso += amt;
                    }
                );
            }
        });
    });

    return { byMonth };
}


// --- Helper ---

function distributeAmount(
    amountCents: number,
    periodicity: Periodicity,
    rule: AllocationRule,
    selectedMonths: Month[] | undefined,
    callback: (month: Month, amount: number) => void
) {
    if (amountCents === 0) return;

    if (periodicity === 'monthly') {
        // Simple: Every month
        // If amount is "Annual Payload" converted to monthly? 
        // USUAL CONVENTION in this app: Input amounts are "Per Period" usually?
        // Let's check `useDashboardData`: 
        // mult = monthly ? 12 : 1... 
        // "return acc + item.amount_ttc_cents * mult" -> This implies amount is PER PERIOD.
        // So if Monthly 100€ -> 100€ every month.
        MONTHS.forEach(m => callback(m, amountCents));
        return;
    }

    if (periodicity === 'quarterly') {
        // "Per Period" = 100€ per quarter.
        // Rule: spread -> 33€ per month.
        // Rule: due -> 100€ in Jan, Apr, Jul, Oct.
        if (rule === 'spread_evenly') {
            const monthly = Math.round(amountCents / 3);
            MONTHS.forEach(m => callback(m, monthly));
        } else {
            // Standard Quarters
            ['Jan', 'Apr', 'Jul', 'Oct'].forEach(m => callback(m as Month, amountCents));
        }
        return;
    }

    if (periodicity === 'yearly') {
        // Amount is 1000€ / year.
        if (rule === 'spread_evenly') {
            const monthly = Math.round(amountCents / 12);
            MONTHS.forEach(m => callback(m, monthly));
        } else if (rule === 'due_on_specific_months' && selectedMonths && selectedMonths.length > 0) {
            // Split over selected months? Or full amount on each?
            // Usually specific month means "Due Date".
            // If multiple months selected for a yearly item -> Ambiguous.
            // Assumption: Single payment date for yearly.
            selectedMonths.forEach(m => callback(m, amountCents));
        } else {
            // Default: Jan? Or Dec?
            callback('Jan', amountCents);
        }
        return;
    }

    if (periodicity === 'once') {
        // One shot.
        if (selectedMonths && selectedMonths.length > 0) {
            selectedMonths.forEach(m => callback(m, amountCents));
        } else {
            callback('Jan', amountCents);
        }
    }
}
