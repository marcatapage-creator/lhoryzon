
import { describe, it, expect } from 'vitest';
import { normalizeToFiscalLedger } from '../engine/normalization';
import { Operation, PersonalExpenseItem } from '@/lib/compta/types';

// Helper mock op
const createOp = (items: PersonalExpenseItem[]): Operation => ({
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
        personal: { items: items },
        social: { urssaf_cents: 0 },
        taxes: { incomeTax_cents: 0 },
        otherItems: []
    }
} as unknown as Operation);

describe('Personal Expenses Normalization', () => {

    it('should normalize Monthly personal expense (12x)', () => {
        const item: PersonalExpenseItem = {
            id: 'p1',
            label: 'Loyer',
            amount_cents: 100000, // 1000€
            category: 'personal',
            periodicity: 'monthly'
        };

        const op = createOp([item]);
        const ledger = normalizeToFiscalLedger([op]);

        const expenses = ledger.operations.filter(o => o.label === 'Loyer');

        expect(expenses.length).toBe(12);
        expect(expenses[0].scope).toBe('perso');
        expect(expenses[0].amount_ttc).toBe(100000);
        expect(expenses[0].amount_tva).toBe(0);
        expect(expenses[0].category).toBe('PERSO');
    });

    it('should normalize Quarterly personal expense (4x)', () => {
        const item: PersonalExpenseItem = {
            id: 'p2',
            label: 'Assurance Trim',
            amount_cents: 30000,
            category: 'personal',
            periodicity: 'quarterly'
        };

        const op = createOp([item]);
        const ledger = normalizeToFiscalLedger([op]);

        const expenses = ledger.operations.filter(o => o.label === 'Assurance Trim');

        expect(expenses.length).toBe(4);
        expect(expenses[0].date).toContain('2026-01-05');
        expect(expenses[1].date).toContain('2026-04-05');
    });

});
