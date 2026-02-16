import { describe, it, expect } from 'vitest';
import { projectToDashboardData } from '../bridge/dashboard';
import { FiscalOutput, TaxLineItem } from '../domain/types';
import { Operation } from '@/lib/compta/types';
import { MONTHS } from '@/core/fiscal-v2/domain/types';

describe('Dashboard V2 Bridge', () => {
    // Helper to create minimal FiscalOutput
    const createOutput = (taxes: number, scheduleItem: any): FiscalOutput => ({
        metadata: {} as any,
        bases: {
            social: { total: 0, artistic: 0, other: 0 },
            fiscal: { totalNetTaxable: 0, revenue: 0, deductibleExpenses: 0 },
            vat: { collected: 0, deductible: 0, balance: 0, byPeriod: {} }
        },
        taxes: {
            urssaf: [{ amount: taxes, category: 'SOCIAL' } as TaxLineItem],
            ircec: [],
            vat: [],
            ir: []
        },
        schedule: scheduleItem ? [scheduleItem] : [],
        alerts: []
    });

    // Helper to create minimal Ops
    const createOps = (month: string, income: number): Operation[] => ([{
        id: 'op1',
        date: `2026-${month}-15`,
        label: 'Test Op',
        amount_cents: income,
        type: 'receipt',
        category: 'ACCOUNTING',
        description: '',
        status: 'completed',
        year: 2026,
        income: {
            amount_k: income / 100000, // Approximate
            salaryTTCByMonth: {},
            items: [{
                id: 'i1',
                label: 'Item 1',
                amount_ttc_cents: income,
                vatRate_bps: 0,
                type: 'salary',
                periodicity: 'monthly'
            }]
        },
        expenses: {
            pro: { items: [], totalOverrideTTC_cents: 0 },
            personal: { items: [] },
            social: {} as any,
            taxes: {} as any
        },
        vatPaymentFrequency: 'quarterly',
        cashCurrent_cents: 0
    } as any]);

    it('should project Income correctly', () => {
        // Op in Jan
        // Normalize -> Bridge -> Jan Income
        const ops = createOps('01', 10000); // 100€
        const output = createOutput(0, null);

        const ledger = projectToDashboardData(output, ops, 0);

        expect(ledger.byMonth['Jan'].income_ttc_cents).toBe(10000);
        expect(ledger.byMonth['Feb'].income_ttc_cents).toBe(0);
    });

    it('should calculate Provision (Debt) correctly', () => {
        // Scenario:
        // Annual Liability = 1200€ (Social)
        // Jan: Paid 0€ -> Provision = 1200€
        // Feb: Paid 200€ -> Provision = 1000€

        const output = createOutput(120000, {
            date: '2026-02-15',
            amount: 20000, // 200€ Paid in Feb
            organization: 'URSSAF_AA',
            label: 'Cotisation'
        });

        const ops: Operation[] = []; // No income needed for this test

        const ledger = projectToDashboardData(output, ops, 0);

        // Jan
        const jan = ledger.byMonth['Jan'];
        const janPaid = jan.urssaf_cash_cents; // 0
        const janLiability = 120000;
        // Logic in Bridge: provision_social_cents = Liability - CumulativePaid
        // CumulativePaid(Jan) = 0
        expect(jan.provision_social_cents).toBe(120000);

        // Feb
        const feb = ledger.byMonth['Feb'];
        const febPaid = feb.urssaf_cash_cents; // 20000
        // CumulativePaid(Feb) = 20000
        expect(feb.provision_social_cents).toBe(100000);
    });

    it('should calculate Treasury correctly', () => {
        // Initial Treasury = 1000€
        // Jan: Income 500€
        // Feb: Expense 200€ (Tax)

        const ops = createOps('01', 50000); // Jan Income +500€
        const output = createOutput(20000, {
            date: '2026-02-15',
            amount: 20000, // Feb Tax -200€
            organization: 'URSSAF_AA',
            label: 'Tax'
        });

        const ledger = projectToDashboardData(output, ops, 100000); // Initial 1000€

        // Jan
        // In: 500, Out: 0 -> Net: +500
        // Treasury: 1000 + 500 = 1500
        expect(ledger.byMonth['Jan'].net_cashflow_cents).toBe(50000);
        expect(ledger.byMonth['Jan'].closing_treasury_cents).toBe(150000);

        // Feb
        // In: 0, Out: 200 -> Net: -200
        // Treasury: 1500 - 200 = 1300
        expect(ledger.byMonth['Feb'].net_cashflow_cents).toBe(-20000);
        expect(ledger.byMonth['Feb'].closing_treasury_cents).toBe(130000);
    });
});
