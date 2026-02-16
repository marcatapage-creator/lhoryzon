
import { describe, it, expect } from 'vitest';
import { normalizeToFiscalLedger } from '../engine/normalization';
import { Operation } from '@/lib/compta/types';

// Helper mock op
const createOp = (): Operation => ({
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
        taxes: {
            incomeTax_cents: 0,
            incomeTaxPeriodicity: 'monthly',
            incomeTaxByMonth: {
                'Feb': 33000 // 330€
            }
        },
        otherItems: []
    }
} as unknown as Operation);

describe('Tax Scope Normalization', () => {

    it('should normalize Income Tax as Personal Expense (perso) by default (IR)', () => {
        const op = createOp();

        // Default isIS = false
        const ledger = normalizeToFiscalLedger([op], false);

        const taxOp = ledger.operations.find(o => o.label.includes('Prélèvement Source Feb'));

        expect(taxOp).toBeDefined();
        expect(taxOp?.scope).toBe('perso');
        expect(taxOp?.category).toBe('FISCAL');
        expect(taxOp?.subcategory).toBe('IR');
    });

    it('should normalize Tax as Professional Expense (pro) if IS is true', () => {
        const op = createOp();

        // isIS = true
        const ledger = normalizeToFiscalLedger([op], true);

        const taxOp = ledger.operations.find(o => o.kind === 'TAX_PAYMENT');

        expect(taxOp).toBeDefined();
        expect(taxOp?.scope).toBe('pro');
        expect(taxOp?.category).toBe('FISCAL');
        expect(taxOp?.subcategory).toBe('IS');
        expect(taxOp?.label).toContain('Acompte IS');
    });

});
