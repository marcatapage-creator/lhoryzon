
import { describe, it, expect } from 'vitest';
import { normalizeOperationsToLedger } from '../normalize';
import { Operation, Month } from '@/lib/compta/types';

describe('Ledger Allocation Rules', () => {

    const baseOp: Operation = {
        id: 'test', year: 2026, isScenario: false, isArtistAuthor: false, cashCurrent_cents: 0,
        vatPaymentFrequency: 'yearly', vatCarryover_cents: 0,
        income: { salaryTTCByMonth: {}, otherIncomeTTC_cents: 0, otherIncomeVATRate_bps: 0, otherIncomeSelectedMonths: [], items: [] },
        expenses: { pro: { items: [], totalOverrideTTC_cents: null }, social: { urssaf_cents: 0, urssafPeriodicity: 'monthly', ircec_cents: 0, ircecPeriodicity: 'yearly' }, taxes: { incomeTax_cents: 0, incomeTaxPeriodicity: 'yearly' }, personal: { items: [] }, otherItems: [] },
        meta: { version: 1, createdAt: '', updatedAt: '' }
    };

    // Helper for deep copy
    const createBaseOp = (): Operation => JSON.parse(JSON.stringify(baseOp));

    it('should handle Monthly Expense (100€/month)', () => {
        const op = createBaseOp();
        op.expenses.pro.items.push({
            id: 'monthly-exp',
            label: 'Test',
            amount_ttc_cents: 10000,
            periodicity: 'monthly',
            category: 'pro',
            vatRate_bps: 0
        });

        const ledger = normalizeOperationsToLedger([op]);

        expect(ledger.byMonth['Jan'].expense_pro).toBe(10000);
        expect(ledger.byMonth['Dec'].expense_pro).toBe(10000);
        // Total
        const total = Object.values(ledger.byMonth).reduce((acc, m) => acc + m.expense_pro, 0);
        expect(total).toBe(120000);
    });

    it('should handle Quarterly Expense (1200€) - Implicit Due on Period', () => {
        // Our current impl defaults Quarterly to Jan/Apr/Jul/Oct
        const op = createBaseOp();
        op.expenses.pro.items.push({
            id: 'qt-exp', label: 'Test', amount_ttc_cents: 120000,
            periodicity: 'quarterly', category: 'pro', vatRate_bps: 0
        });

        const ledger = normalizeOperationsToLedger([op]);

        // Cash checks
        expect(ledger.byMonth['Jan'].expense_pro).toBe(120000); // Payment 1
        expect(ledger.byMonth['Feb'].expense_pro).toBe(0);
        expect(ledger.byMonth['Mar'].expense_pro).toBe(0);
        expect(ledger.byMonth['Apr'].expense_pro).toBe(120000); // Payment 2
    });

});
