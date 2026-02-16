
import { describe, it, expect } from 'vitest';
import { mergeLedgers } from '../merge';
import { LedgerOps, LedgerTaxes, LedgerMonth, MONTHS } from '../types';

describe('Dashboard V2 KPIs', () => {
    // Helper to create empty LedgerOps
    const createOps = (income: number): LedgerOps => {
        const byMonth: Record<string, LedgerMonth> = {} as any;
        MONTHS.forEach(m => {
            byMonth[m] = {
                month: m,
                income_ttc_cents: income,
                vat_due_cents: 0,
                // ... defaults
                expense_perso_ttc_cents: 0,
                expense_pro_ttc_cents: 0,
                vat_collected_cents: 0,
                vat_deductible_cents: 0,
                vat_cash_cents: 0,
                urssaf_cash_cents: 0, // Paid
                ircec_cash_cents: 0,
                ir_cash_cents: 0,
                other_taxes_cash_cents: 0,
                net_cashflow_cents: 0,
                closing_treasury_cents: 0,
                provision_social_cents: 0,
                provision_income_tax_cents: 0
            };
        });
        return { byMonth };
    };

    const createTaxes = (payment: number): LedgerTaxes => {
        const byMonth: Record<string, LedgerMonth> = {} as any;
        MONTHS.forEach(m => {
            byMonth[m] = {
                month: m,
                vat_cash_cents: 0,
                urssaf_cash_cents: payment, // Paid here
                ircec_cash_cents: 0,
                ir_cash_cents: 0,
                other_taxes_cash_cents: 0,
                // ... defaults
                income_ttc_cents: 0,
                expense_perso_ttc_cents: 0,
                expense_pro_ttc_cents: 0,
                vat_collected_cents: 0,
                vat_deductible_cents: 0,
                vat_due_cents: 0,
                net_cashflow_cents: 0,
                closing_treasury_cents: 0,
                provision_social_cents: 0,
                provision_income_tax_cents: 0
            } as any;
        });
        return { byMonth };
    };

    it('should calculate provisions pro-rata to income in mergeLedgers', () => {
        // Scenario: 1000€ Income in Jan, 0 in Feb...
        // Total Social Liability = 220€
        // Expect: Jan Provision = 220, Other months = 0

        const ops = createOps(0);
        ops.byMonth['Jan'].income_ttc_cents = 10000; // 100€

        const taxes = createTaxes(0); // No payments

        const totals = { social_total_cents: 2200, income_tax_total_cents: 500 }; // 22€ and 5€

        const merged = mergeLedgers(ops, taxes, 0, totals);

        expect(merged.byMonth['Jan'].provision_social_cents).toBe(2200);
        expect(merged.byMonth['Jan'].provision_income_tax_cents).toBe(500);

        expect(merged.byMonth['Feb'].provision_social_cents).toBe(0);
    });

    it('should track Tax Debt correctly (Provision - Paid)', () => {
        // Scenario: 
        // Jan: Income 1000€ -> Provision 220€ (Social)
        // Jan: Payment 0€
        // Feb: Income 0€ -> Provision 0€
        // Feb: Payment 220€ (Social)

        // Expected Debt:
        // Jan End: 220€
        // Feb End: 0€

        const ops = createOps(0);
        ops.byMonth['Jan'].income_ttc_cents = 10000;

        const taxes = createTaxes(0);
        taxes.byMonth['Feb'].urssaf_cash_cents = 2200; // Paid in Feb

        const totals = { social_total_cents: 2200, income_tax_total_cents: 0 };

        const merged = mergeLedgers(ops, taxes, 0, totals);

        // Manual Calc of Debt Timeline (Simulating useDashboardData logic)
        // Jan
        const janProvision = merged.byMonth['Jan'].provision_social_cents; // 2200
        const janPaid = merged.byMonth['Jan'].urssaf_cash_cents; // 0
        const janDebt = janProvision - janPaid; // 2200

        // Feb 
        const febProvision = merged.byMonth['Feb'].provision_social_cents; // 0
        const febPaid = merged.byMonth['Feb'].urssaf_cash_cents; // 2200
        const febDebt = (janProvision + febProvision) - (janPaid + febPaid); // 2200 - 2200 = 0

        expect(merged.byMonth['Jan'].urssaf_cash_cents).toBe(0);
        expect(merged.byMonth['Feb'].urssaf_cash_cents).toBe(2200);

        expect(janDebt).toBe(2200);
        expect(febDebt).toBe(0);
    });
});
