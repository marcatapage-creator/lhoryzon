import { describe, it, expect } from 'vitest';
import { migrateOperation } from '../migration';
import { OperationSchema } from '../types';

describe('migrateOperation defensive logic', () => {
    it('should handle legacy array format for pro expenses', () => {
        const legacyData = {
            year: 2025,
            expenses: {
                pro: [
                    { label: 'Test Pro', amountTTC: 100 }
                ]
            }
        };
        const migrated = migrateOperation(legacyData);
        expect(migrated.expenses.pro.items).toBeDefined();
        expect(migrated.expenses.pro.items.length).toBe(1);
        expect(migrated.expenses.pro.items[0].amount_ttc_cents).toBe(10000);
        const result = OperationSchema.safeParse(migrated);
        if (!result.success) {
            console.log('Zod Error:', JSON.stringify(result.error.issues, null, 2));
        }
        expect(result.success).toBe(true);
    });

    it('should handle single number for salary', () => {
        const legacyData = {
            year: 2025,
            income: {
                salaryTTCByMonth: 2000
            }
        };
        const migrated = migrateOperation(legacyData);
        expect(migrated.income.salaryTTCByMonth.Jan).toBe(2000);
        expect(migrated.income.salaryTTCByMonth.Dec).toBe(2000);
        const result = OperationSchema.safeParse(migrated);
        if (!result.success) {
            console.log('Zod Error:', JSON.stringify(result.error.issues, null, 2));
        }
        expect(result.success).toBe(true);
    });

    it('should handle strings as numbers', () => {
        const corruptedData = {
            year: "2025",
            cashCurrent_cents: "15000.5",
            income: {
                salaryTTCByMonth: { Jan: "2500" }
            }
        };
        const migrated = migrateOperation(corruptedData);
        expect(migrated.year).toBe(2025);
        expect(migrated.cashCurrent_cents).toBe(15001); // Rounded
        expect(migrated.income.salaryTTCByMonth.Jan).toBe(2500);
        const result = OperationSchema.safeParse(migrated);
        if (!result.success) {
            console.log('Zod Error:', JSON.stringify(result.error.issues, null, 2));
        }
        expect(result.success).toBe(true);
    });

    it('should handle deeply missing structures', () => {
        const emptyData = { year: 2025 };
        const migrated = migrateOperation(emptyData);
        expect(migrated.income.items).toEqual([]);
        expect(migrated.expenses.pro.items).toEqual([]);
        expect(migrated.expenses.social.urssaf_cents).toBe(0);
        const result = OperationSchema.safeParse(migrated);
        if (!result.success) {
            console.log('Zod Error:', JSON.stringify(result.error.issues, null, 2));
        }
        expect(result.success).toBe(true);
    });
});
