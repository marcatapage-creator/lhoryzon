import { describe, it, expect } from 'vitest';
import { IREngine } from './ir_engine';
import { TAX_PARAMETERS } from '../parameters/tax_params';

describe('IREngine', () => {
    const params2024 = TAX_PARAMETERS[2024];
    const engine = new IREngine(params2024);

    describe('calculateParts (Quotient Familial)', () => {
        it('should calculate parts for a single person', () => {
            const context: any = { situationFamiliale: 'celibataire', nbEnfants: 0 };
            expect((engine as any).calculateParts(context)).toBe(1);
        });

        it('should calculate parts for a couple', () => {
            const context: any = { situationFamiliale: 'couple', nbEnfants: 0 };
            expect((engine as any).calculateParts(context)).toBe(2);
        });

        it('should calculate parts for a single parent', () => {
            const context: any = { situationFamiliale: 'parent_isole', nbEnfants: 0 };
            expect((engine as any).calculateParts(context)).toBe(1.5);
        });

        it('should add 0.5 parts for each of the first 2 children', () => {
            const contextSolo: any = { situationFamiliale: 'celibataire', nbEnfants: 2 };
            expect((engine as any).calculateParts(contextSolo)).toBe(2); // 1 + 0.5 + 0.5

            const contextCouple: any = { situationFamiliale: 'couple', nbEnfants: 2 };
            expect((engine as any).calculateParts(contextCouple)).toBe(3); // 2 + 0.5 + 0.5
        });

        it('should add 1 part for the 3rd child onwards', () => {
            const contextCouple: any = { situationFamiliale: 'couple', nbEnfants: 3 };
            expect((engine as any).calculateParts(contextCouple)).toBe(4); // 2 + 0.5 + 0.5 + 1
        });

        it('should handle shared custody (garde alternée)', () => {
            const context: any = { situationFamiliale: 'couple', nbEnfants: 1, gardeAlternee: true };
            expect((engine as any).calculateParts(context)).toBe(2.25); // 2 + (0.5 / 2)
        });
    });

    describe('applyRateScale (Tax Brackets 2024)', () => {
        it('should return 0 for income below first bracket', () => {
            expect((engine as any).applyRateScale(10000)).toBe(0);
        });

        it('should calculate tax correctly for the 11% bracket', () => {
            // 20000 income per part
            // (20000 - 11294) * 0.11 = 957.66
            expect((engine as any).applyRateScale(20000)).toBeCloseTo(957.66, 2);
        });

        it('should calculate tax correctly across multiple brackets (30%)', () => {
            // 50000 income per part
            // Bracket 1: 0 to 11294 (0%) = 0
            // Bracket 2: 28797 - 11294 = 17503 * 11% = 1925.33
            // Bracket 3: 50000 - 28797 = 21203 * 30% = 6360.9
            // Total: 8286.23
            expect((engine as any).applyRateScale(50000)).toBeCloseTo(8286.23, 2);
        });
    });

    describe('applyDecote', () => {
        it('should apply decote for low income single person', () => {
            // Single person, tax of 1000
            // decote = 873 - (1000 * 0.45) = 873 - 450 = 423
            // final tax = 1000 - 423 = 577
            const context: any = { situationFamiliale: 'celibataire' };
            expect(engine['applyDecote'](1000, context)).toBe(577);
        });

        it('should not apply decote if tax is above threshold', () => {
            const context: any = { situationFamiliale: 'celibataire' };
            expect(engine['applyDecote'](2000, context)).toBe(2000);
        });
    });

    describe('calculateTax (Full Logic)', () => {
        it('should handle QF ceiling (Plafonnement du Quotient Familial)', () => {
            // High income single person with 1 child (1.5 parts)
            // income = 200,000
            // Tax with QF (1.5 parts):
            //   Inc/part = 133,333
            //   Tax/part = applyRateScale(133,333) = ~42,000 (roughly)
            //   Total tax = ~63,000
            // Tax without QF (1 part):
            //   Total tax = applyRateScale(200,000) = ~70,000
            // Advantage = 70,000 - 63,000 = 7,000
            // Ceiling for 0.5 extra parts = 1759
            // Final tax should be taxWithoutQF - 1759

            const context: any = { situationFamiliale: 'celibataire', nbEnfants: 1 };
            const revenu = 200000;
            const res = engine.calculateTax(revenu, context);

            const tax1Part = (engine as any).applyRateScale(revenu);
            expect(res.tax_cents).toBeCloseTo(tax1Part - params2024.qfCeilingPerHalfPart_cents, 0);
            expect(res.trace.some(t => t.step === "Plafonnement QF")).toBe(true);
        });

        it('should return 0 for zero or very low income', () => {
            const context: any = { situationFamiliale: 'celibataire', nbEnfants: 0 };
            expect(engine.calculateTax(5000, context).tax_cents).toBe(0);
        });
    });
});
