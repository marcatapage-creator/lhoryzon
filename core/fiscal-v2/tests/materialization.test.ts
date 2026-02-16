import { describe, it, expect } from 'vitest';
import { AppEntrySchema } from '../domain/types';

describe('EntryEditor Logic & Materialization', () => {
    it('should validate a correct INCOME entry', () => {
        const entry = {
            id: 'test-1',
            nature: 'INCOME',
            label: 'Test Income',
            amount_ttc_cents: 10000,
            vatRate_bps: 2000,
            date: '2026-01-15',
            scope: 'pro',
            category: 'OTHER',
            periodicity: 'yearly'
        };
        const result = AppEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
    });

    it('should fail if amount is not an integer', () => {
        const entry = {
            id: 'test-2',
            nature: 'INCOME',
            label: 'Floating Amount',
            amount_ttc_cents: 100.5,
            date: '2026-01-15',
            scope: 'pro'
        };
        const result = AppEntrySchema.safeParse(entry);
        expect(result.success).toBe(false);
    });

    // Materialization simulation logic test
    function simulateMaterialization(validated: any) {
        const entries: any[] = [];
        const periodicity = validated.periodicity || 'yearly';
        if (periodicity === 'yearly') {
            entries.push(validated);
        } else {
            const iterations = periodicity === 'monthly' ? 12 : 4;
            const [y, m, d] = validated.date.split('-').map(Number);
            const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
            const month = baseDate.getUTCMonth();

            for (let i = 0; i < iterations; i++) {
                const occurrenceDate = new Date(baseDate);
                if (periodicity === 'monthly') {
                    occurrenceDate.setUTCMonth(month + i);
                } else {
                    occurrenceDate.setUTCMonth(month + (i * 3));
                }
                const dateStr = occurrenceDate.toISOString().split('T')[0];
                entries.push({
                    ...validated,
                    id: `${validated.id}-${i}`,
                    date: dateStr,
                    periodicity: 'yearly'
                });
            }
        }
        return entries;
    }

    it('should materialize 12 monthly occurrences', () => {
        const entry = {
            id: 'recurring-1',
            nature: 'EXPENSE_PRO',
            label: 'Monthly SAS',
            amount_ttc_cents: 5000,
            date: '2026-01-01',
            scope: 'pro',
            periodicity: 'monthly'
        };
        const validated = AppEntrySchema.parse(entry);
        const results = simulateMaterialization(validated);

        expect(results).toHaveLength(12);
        expect(results[0].date).toBe('2026-01-01');
        expect(results[11].date).toBe('2026-12-01');
        expect(results[5].date).toBe('2026-06-01');
    });

    it('should materialize 4 quarterly occurrences', () => {
        const entry = {
            id: 'recurring-2',
            nature: 'EXPENSE_PRO',
            label: 'Quarterly Rent',
            amount_ttc_cents: 300000,
            date: '2026-01-01',
            scope: 'pro',
            periodicity: 'quarterly'
        };
        const validated = AppEntrySchema.parse(entry);
        const results = simulateMaterialization(validated);

        expect(results).toHaveLength(4);
        expect(results[0].date).toBe('2026-01-01');
        expect(results[1].date).toBe('2026-04-01');
        expect(results[3].date).toBe('2026-10-01');
    });
});
