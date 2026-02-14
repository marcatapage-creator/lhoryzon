import { describe, it, expect } from 'vitest';
import { SASU_IS } from '../profiles/SASU_IS';
import { SimulationInput, WarningCode, MONTHS } from '../index';
import { SASU_RATES_2026 } from '../barèmes';

describe('SASU IS - 2026', () => {
    const baseInput: SimulationInput = {
        year: 2026,
        months: MONTHS,
        ca_facture_ttc: 0,
        ca_encaisse_ttc: 120000 * 100, // 120k€ TTC
        charges_deductibles_ht: 20000 * 100, // 20k€ HT External Charges
        charges_non_deductibles_ttc: 0,
        tva_collectee_reelle: 20000 * 100, // 20k VAT collected -> 100k HT CA
        tva_deductible_reelle: 4000 * 100, // on 20k HT charges
        acomptes_urssaf_payes: 0,
        regularisation_urssaf_n_1: 0,
        nb_parts_fiscales: 1,
        personne_a_charge: 0,
        autres_revenus_foyer: 0,
        prelevement_source_paye: 0,

        // SASU Defaults
        remuneration_mode: 'total_charge',
        remuneration_amount: 40000 * 100, // 40k€ Total Charge Remun
        dividendes_bruts: 10000 * 100 // 10k€ Dividends
    };

    it('should calculate IS with split 15%/25%', () => {
        // Resultat = 100k (CA HT) - 20k (Charges) - 40k (Remun) = 40k.
        // 40k < 42.5k (Plafond 2026). All at 15%.
        // IS = 40,000 * 0.15 = 6,000.

        const rev = SASU_IS.computeRevenue(baseInput);
        const soc = SASU_IS.computeSocial(baseInput, rev);
        const tax = SASU_IS.computeTax(baseInput, rev, soc);

        // Expected Logic verification
        expect(tax.impot_societe).toBeCloseTo(6000 * 100, -2);

        // Case Above Plafond
        // charges=10k, remun=10k. Result=80k.
        // 42.5k * 0.15 = 6375
        // (80-42.5)=37.5k * 0.25 = 9375
        // Total = 15750.
        const highInput = {
            ...baseInput,
            charges_deductibles_ht: 10000 * 100,
            remuneration_amount: 10000 * 100
        };
        const rev2 = SASU_IS.computeRevenue(highInput);
        const soc2 = SASU_IS.computeSocial(highInput, rev2);
        const tax2 = SASU_IS.computeTax(highInput, rev2, soc2); // Re-computes logic internally

        expect(tax2.impot_societe).toBeCloseTo(15750 * 100, -2);
    });

    it('should deduct PFU 31.4% on dividends', () => {
        // Div = 10k. PFU = 3140. Net = 6860.
        const rev = SASU_IS.computeRevenue(baseInput);
        const soc = SASU_IS.computeSocial(baseInput, rev);
        const tax = SASU_IS.computeTax(baseInput, rev, soc);
        const vat = SASU_IS.computeVat(baseInput); // Need proper VAT object
        const forecast = SASU_IS.computeForecast(baseInput, rev, soc, tax, vat);

        // Net Perso = Net Remun + Net Div.
        // Net Remun (Total 40k) = 40k / 1.75 = 22,857.
        // Net Div = 6,860.
        // Total = 29,717.

        const expectedRemunNet = Math.round(40000 * 100 * SASU_RATES_2026.social_president.coef_total_to_net);
        const expectedDivNet = 10000 * 100 * (1 - 0.314);

        expect(forecast.restant_a_vivre_annuel).toBeCloseTo(expectedRemunNet + expectedDivNet, -2);
    });

    it('Invariant: Increasing external charges cannot increase Net Perso', () => {
        // More charges -> Less Result -> Less IS. But Less Cash available.
        // If Dividends + Remun stay same (and Remun uses total_charge mode),
        // Net Perso stays same IF company has enough cash.
        // IF we assume "Available Cash" constrains dividends, then yes.
        // But here inputs are fixed (Remun + Div fixed). 
        // So Net Perso should be constant, BUT "Reste en Société" decreases.

        // If we talk about "Maximized", that's different.
        // Here we test the engine logic stability.

        const rev1 = SASU_IS.computeRevenue(baseInput);
        const soc1 = SASU_IS.computeSocial(baseInput, rev1);
        const tax1 = SASU_IS.computeTax(baseInput, rev1, soc1);
        const vat1 = SASU_IS.computeVat(baseInput);
        const f1 = SASU_IS.computeForecast(baseInput, rev1, soc1, tax1, vat1);

        const inputMoreCharges = { ...baseInput, charges_deductibles_ht: 30000 * 100 };
        const rev2 = SASU_IS.computeRevenue(inputMoreCharges);
        const soc2 = SASU_IS.computeSocial(inputMoreCharges, rev2);
        const tax2 = SASU_IS.computeTax(inputMoreCharges, rev2, soc2);
        const vat2 = SASU_IS.computeVat(inputMoreCharges);
        const f2 = SASU_IS.computeForecast(inputMoreCharges, rev2, soc2, tax2, vat2);

        // Net Perso should be identical (Remun & Div are inputs)
        expect(f2.restant_a_vivre_annuel).toBe(f1.restant_a_vivre_annuel);

        // But Reste en Société must decrease
        // Charges +10k. Result -10k.
        // IS change? 
        // Case 1: Result 40k. IS 6k. Net Result 34k. Reste = 34k - 10k(Div) = 24k.
        // Case 2: Result 30k. IS 4.5k. Net Result 25k. Reste = 25k - 10k(Div) = 15k.
        // Diff Reste = 9k. (10k charges cost - 1k IS saving).
        expect(f2.tresorerie_fin_annee).toBeLessThan(f1.tresorerie_fin_annee);
    });

    it('Warning: Dividends > Available Benefit', () => {
        // Result 40k. IS 6k. Ben Net 34k.
        // Try Div 40k.
        const riskyInput = { ...baseInput, dividendes_bruts: 40000 * 100 };

        const rev = SASU_IS.computeRevenue(riskyInput);
        const soc = SASU_IS.computeSocial(riskyInput, rev);
        const tax = SASU_IS.computeTax(riskyInput, rev, soc);
        const vat = SASU_IS.computeVat(riskyInput);
        const f = SASU_IS.computeForecast(riskyInput, rev, soc, tax, vat);

        expect(f.warnings).toContain(WarningCode.INPUT_INCONSISTENT);
    });

});
