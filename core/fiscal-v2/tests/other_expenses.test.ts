
import { describe, it, expect } from 'vitest';
import { normalizeToFiscalLedger } from '../engine/normalization';
import { Operation, OtherExpenseItem } from '@/lib/compta/types';

// Helper mock op
const createOp = (items: OtherExpenseItem[]): Operation => ({
    id: `op-main`,
    label: "Test Op",
    date: `2026-01-15`,
    year: 2026,
    isScenario: false,
    isArtistAuthor: false,
    cashCurrent_cents: 0,
    vatPaymentFrequency: 'monthly',
    vatCarryover_cents: 0,
    meta: { version: 2, createdAt: "now", updatedAt: "now" },
    income: { salaryTTCByMonth: {}, items: [] },
    expenses: {
        pro: { items: [], totalOverrideTTC_cents: 0 },
        personal: { items: [] },
        social: { urssaf_cents: 0 },
        taxes: { incomeTax_cents: 0 },
        otherItems: items
    }
} as unknown as Operation);

describe('Other Expenses Normalization', () => {

    it('should spread annual amount over selected months (TVA Reliquat case)', () => {
        const item: OtherExpenseItem = {
            id: 'o1',
            label: 'TVA Reliquat',
            amount_cents: 10000, // 100€ Total
            category: 'other',
            periodicity: 'monthly', // UI artifact, logic uses selectedMonths
            durationMonths: 3,
            selectedMonths: ['Mar', 'Jun', 'Sep']
        };

        const op = createOp([item]);
        const ledger = normalizeToFiscalLedger([op]);

        const expenses = ledger.operations.filter(o => o.label.includes('TVA Reliquat'));

        expect(expenses.length).toBe(3);

        // 100 / 3 = 33 (integer math in normalization used Math.round)
        // 10000 / 3 = 3333.33 -> 3333
        expect(expenses[0].amount_ttc).toBe(3333);
        expect(expenses[0].date).toContain('2026-03-20');

        expect(expenses[1].amount_ttc).toBe(3333);
        expect(expenses[1].date).toContain('2026-06-20');

        expect(expenses[2].amount_ttc).toBe(3333);
        expect(expenses[2].date).toContain('2026-09-20'); // Sep
    });

    it('should handle one-off payment', () => {
        const item: OtherExpenseItem = {
            id: 'o2',
            label: 'Imprévu',
            amount_cents: 5000,
            category: 'other',
            periodicity: 'yearly',
            durationMonths: 1,
            selectedMonths: ['Nov']
        };

        const op = createOp([item]);
        const ledger = normalizeToFiscalLedger([op]);

        const expenses = ledger.operations.filter(o => o.label.includes('Imprévu'));

        expect(expenses.length).toBe(1);
        expect(expenses[0].amount_ttc).toBe(5000);
        expect(expenses[0].date).toContain('2026-11-20');
    });

});
