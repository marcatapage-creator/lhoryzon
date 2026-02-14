import { describe, it, expect } from 'vitest';
import { MicroBNC } from '../profiles/MicroBNC';
import { MONTHS, SimulationInput } from '../index';
import { IR_2026 } from '../barèmes';

describe('Fiscal Engine 2026 (Robust Cents)', () => {

    const EUR = (x: number) => Math.round(x * 100);

    // Factory helper for input
    const createInput = (ca_cents: number): SimulationInput => ({
        year: 2026,
        months: MONTHS,
        ca_facture_ttc: ca_cents,
        ca_encaisse_ttc: ca_cents,
        charges_deductibles_ht: 0,
        charges_non_deductibles_ttc: 0,
        acomptes_urssaf_payes: 0,
        regularisation_urssaf_n_1: 0,
        nb_parts_fiscales: 1,
        personne_a_charge: 0,
        autres_revenus_foyer: 0,
        prelevement_source_paye: 0
    });

    describe('Barèmes Consistency', () => {
        it('should have correct brackets defined in CENTS', () => {
            const t = IR_2026.tranches;
            expect(t[0].max).toBe(11600 * 100);
            expect(t[1].min).toBe((11600 * 100) + 1);
            expect(t[1].max).toBe(29579 * 100);
            // Ensure gaps
            expect(t[1].min - t[0].max).toBe(1);
        });
    });

    describe('Micro-BNC Scenarios', () => {

        it('Scenario 1: 50k CA - Standard', () => {
            const input = createInput(EUR(50_000));

            const revenue = MicroBNC.computeRevenue(input);
            const social = MicroBNC.computeSocial(input, revenue);
            const tax = MicroBNC.computeTax(input, revenue, social);
            const forecast = MicroBNC.computeForecast(input, revenue, social, tax, MicroBNC.computeVat(input));

            // A) Abattement check (34%) -> 17,000€. Base = 33,000€
            const expectedBase = EUR(33_000);
            expect(revenue.ca_imposable).toBe(expectedBase);

            // B) Social check (23.3%)
            // 50,000 * 23.3% = 11,650.00
            const expectedSocial = EUR(11_650);
            expect(Math.abs(social.cotisations_totales - expectedSocial)).toBeLessThanOrEqual(5); // 5 cents tolerance

            // C) Tax Check
            // Base 33,000.
            // Tranche 1 (0-11600): 0
            // Tranche 2 (11601-29579): 17,979 * 11% = 1977.69€
            // Tranche 3 (29580-33000): 3421 * 30% = 1026.30€
            // Total = 3003.99€
            // Decote? Impot > 1970€, so 0.

            const expectedTax = 300399; // Cents
            expect(Math.abs(tax.impot_revenu_total - expectedTax)).toBeLessThanOrEqual(100); // 1€ tolerance for rounding diffs

            // D) Invariant: Net Pocket < CA
            expect(forecast.restant_a_vivre_annuel).toBeLessThan(input.ca_encaisse_ttc);
        });

        it('Scenario 2: 500€ CA - Minimum Abatement Rule', () => {
            const input = createInput(EUR(500));
            const revenue = MicroBNC.computeRevenue(input);

            // Abatement 34% of 500 = 170.
            // BUT min abatement is 305€.
            // So Base = 500 - 305 = 195€.

            expect(revenue.ca_imposable).toBe(EUR(195));
        });

        it('Scenario 3: 10k CA - Decote Application', () => {
            const input = createInput(EUR(10_000));
            const revenue = MicroBNC.computeRevenue(input);
            const tax = MicroBNC.computeTax(input, revenue, MicroBNC.computeSocial(input, revenue));

            // Base = 6,600€
            // Tax Gross = 0 (All in 0% bracket)
            expect(revenue.ca_imposable).toBe(EUR(6_600));
            expect(tax.impot_revenu_total).toBe(0);
        });
    });

    describe('Invariants & Property Tests', () => {
        const input = createInput(EUR(30_000));

        it('Invariant: Net Pocket <= CA Encaisse', () => {
            const revenue = MicroBNC.computeRevenue(input);
            const social = MicroBNC.computeSocial(input, revenue);
            const tax = MicroBNC.computeTax(input, revenue, social);
            const vat = MicroBNC.computeVat(input);
            const forecast = MicroBNC.computeForecast(input, revenue, social, tax, vat);

            expect(forecast.restant_a_vivre_annuel).toBeLessThanOrEqual(input.ca_encaisse_ttc);
        });

        it('Invariant: Adding Non-Deductible Expense Reduces Net Pocket', () => {
            // Base
            const revenue = MicroBNC.computeRevenue(input);
            const social = MicroBNC.computeSocial(input, revenue);
            const tax = MicroBNC.computeTax(input, revenue, social);
            const vat = MicroBNC.computeVat(input);
            const baseForecast = MicroBNC.computeForecast(input, revenue, social, tax, vat);

            // With Expense (1000€)
            const expense = EUR(1000);
            const inputWithExpense = { ...input, charges_non_deductibles_ttc: expense };
            const forecastWithExpense = MicroBNC.computeForecast(inputWithExpense, revenue, social, tax, vat);

            // Net pocket should decrease by EXACTLY the expense amount (since it's non-deductible)
            // Wait, assumes NO impact on Social/Tax (Micro BNC: charges don't reduce base).
            // So: BasePocket - Expense = NewPocket
            expect(forecastWithExpense.restant_a_vivre_annuel).toBe(baseForecast.restant_a_vivre_annuel - expense);
        });
        describe('Detailed Fiscal Scenarios (Auditor Request)', () => {

            it('should handle Partial Decote correctly (Gross Tax ~1500€)', () => {
                // Target Gross Tax ~1500€. 
                // 0% up to 11,600. 11% after.
                // 1500 / 0.11 = 13,636 taxable in bracket 2.
                // Total Taxable ~ 11,600 + 13,636 = 25,236.
                // CA needed = 25,236 / 0.66 = ~38,236.

                const input = createInput(EUR(38_236));
                const revenue = MicroBNC.computeRevenue(input);
                const social = MicroBNC.computeSocial(input, revenue);
                const tax = MicroBNC.computeTax(input, revenue, social);

                // 1. Check Gross Tax Matches Target
                const gross = tax.impot_brut;
                expect(Math.abs(gross - EUR(1500))).toBeLessThanOrEqual(500);

                // 2. Decote Application
                expect(tax.decote_applicables).toBe(true);

                // Formula: 890 - 45.25% * Gross
                const expectedDecote = Math.max(0, Math.round((890 * 100) - (0.4525 * gross)));
                expect(Math.abs(tax.decote_appliquee - expectedDecote)).toBeLessThanOrEqual(5);

                // 3. Final Tax
                expect(tax.impot_revenu_total).toBe(gross - tax.decote_appliquee);
            });

            it('should handle Full 30% Bracket (TMI 30%)', () => {
                const input = createInput(EUR(60_000));
                const revenue = MicroBNC.computeRevenue(input);
                const social = MicroBNC.computeSocial(input, revenue);
                const tax = MicroBNC.computeTax(input, revenue, social);

                // TMI check
                expect(tax.tmi).toBe(0.30);

                // Explanation fields check
                expect(tax.impot_brut).toBeGreaterThan(0);
            });

            it('should demonstrate Marginal Tax Cost (TMI Effect)', () => {
                // Base Scenario: 60k CA (in 30% bracket)
                const inputBase = createInput(EUR(60_000));
                // Marginal Scenario: 60,100 CA (+100€ CA)
                const inputMarginal = createInput(EUR(60_100));

                // Manual pipeline to capture intermediate results
                const revenueBase = MicroBNC.computeRevenue(inputBase);
                const socialBase = MicroBNC.computeSocial(inputBase, revenueBase);
                const taxBase = MicroBNC.computeTax(inputBase, revenueBase, socialBase);
                const vatBase = MicroBNC.computeVat(inputBase);
                const resBase = MicroBNC.computeForecast(inputBase, revenueBase, socialBase, taxBase, vatBase);

                const revenueMarginal = MicroBNC.computeRevenue(inputMarginal);
                const socialMarginal = MicroBNC.computeSocial(inputMarginal, revenueMarginal);
                const taxMarginal = MicroBNC.computeTax(inputMarginal, revenueMarginal, socialMarginal);
                const vatMarginal = MicroBNC.computeVat(inputMarginal);
                const resMarginal = MicroBNC.computeForecast(inputMarginal, revenueMarginal, socialMarginal, taxMarginal, vatMarginal);

                // Added CA = 100€
                const addedCA = EUR(100);

                // Costs Increases
                const addedTax = resMarginal.impot_net - resBase.impot_net;
                const addedSocial = socialMarginal.cotisations_totales - socialBase.cotisations_totales;
                const addedVat = vatMarginal.tva_due - vatBase.tva_due;

                // 1. Theoretical Tax Increase:
                // Base Imposable adds 66€. TMI is 30%.
                // Exp Tax = 66 * 0.30 = 19.80€
                const expectedTaxIncrease = Math.round(EUR(100) * 0.66 * 0.30);
                expect(Math.abs(addedTax - expectedTaxIncrease)).toBeLessThanOrEqual(10);

                // 2. Total Marginal cost (Social + Tax + VAT)
                const totalMarginalCost = addedTax + addedSocial + addedVat;

                // 3. Net Verification
                const netMarginal = resMarginal.restant_a_vivre_annuel - resBase.restant_a_vivre_annuel;

                // Net Pocket should be exactly CA - All Costs
                expect(Math.abs(netMarginal - (addedCA - totalMarginalCost))).toBeLessThanOrEqual(5);
            });
        });
    });
});
