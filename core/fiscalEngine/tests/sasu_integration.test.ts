
import { describe, it, expect } from 'vitest';
import { SASU_IS } from '../profiles/SASU_IS';
import { SimulationInput, WarningCode, MONTHS } from '../index';

// Helper to create base input
const createInput = (ca: number, charges: number, remun: number, div: number): SimulationInput => ({
    year: 2026,
    months: MONTHS,
    ca_facture_ttc: ca * 100,
    ca_encaisse_ttc: ca * 100,
    charges_deductibles_ht: charges * 100,
    charges_non_deductibles_ttc: 0,
    tva_collectee_reelle: 0,
    tva_deductible_reelle: 0,
    acomptes_urssaf_payes: 0,
    regularisation_urssaf_n_1: 0,
    nb_parts_fiscales: 1,
    personne_a_charge: 0,
    autres_revenus_foyer: 0,
    prelevement_source_paye: 0,

    // SASU Config
    remuneration_mode: 'total_charge', // Default for these tests
    remuneration_amount: remun * 100,
    dividendes_bruts: div * 100
});

describe('SASU IS - Scénarios d\'Intégration (Sanity Checks)', () => {

    it('Scenario A: PFU Dividendes (31.4%)', () => {
        // 10 000€ Dividendes Bruts -> Net attendu ~6860€, PFU ~3140€
        // Context: CA high enough to cover everything
        const input = createInput(100000, 20000, 40000, 10000);

        const rev = SASU_IS.computeRevenue(input);
        const social = SASU_IS.computeSocial(input, rev);
        const tax = SASU_IS.computeTax(input, rev, social); // IS
        // Need to simulate forecast step where PFU is applied to Personal Net
        const vat = SASU_IS.computeVat(input);
        const forecast = SASU_IS.computeForecast(input, rev, social, tax, vat);

        // Net Perso includes Remun Net + Div Net.
        // Let's isolate Dividends part. 
        // We know Remun Net from social step.
        const remunNet = (input.remuneration_amount! - social.cotisations_totales);
        const divNet = forecast.restant_a_vivre_annuel - remunNet;

        // Check PFU rate implies 31.4%
        // Div Net = 10000 * (1 - 0.314) = 6860
        expect(divNet).toBeCloseTo(6860 * 100, -2); // Exact to cents
    });

    it('Scenario B: Dividendes > Bénéfice Disponible -> Warning', () => {
        // Resultat = 1000 - 0 = 1000
        // IS (15%) = 150
        // Dispo = 850
        // Dividendes demandés = 2000
        // Note: createInput assumes CA argument is the value to be put in TTC field.
        // To get exactly 1000 HT, we need 1200 TTC.
        const input = createInput(1000 * 1.2, 0, 0, 2000);

        const rev = SASU_IS.computeRevenue(input);
        const social = SASU_IS.computeSocial(input, rev);
        const tax = SASU_IS.computeTax(input, rev, social);
        const vat = SASU_IS.computeVat(input);
        const forecast = SASU_IS.computeForecast(input, rev, social, tax, vat);

        expect(forecast.warnings).toContain(WarningCode.INPUT_INCONSISTENT);
        // Company cash is clamped at 0
        expect(forecast.tresorerie_fin_annee).toBe(0);

        // Verification of Clamping logic for Forecast
        // Available Net Benefit = 850€
        // If clamped, Net Perso = 850 - 31.4% = 583.1€
        // If not clamped, Net Perso = 2000 - 31.4% = 1372€
        expect(forecast.restant_a_vivre_annuel).toBeCloseTo(583.1 * 100, -2);
    });

    it('Scenario C: Variation Marginale (+1000€ Dividendes)', () => {
        const baseInput = createInput(100000, 10000, 40000, 5000);
        const nextInput = createInput(100000, 10000, 40000, 6000); // +1000

        const run = (inp: SimulationInput) => {
            const rev = SASU_IS.computeRevenue(inp);
            const social = SASU_IS.computeSocial(inp, rev);
            const tax = SASU_IS.computeTax(inp, rev, social);
            const vat = SASU_IS.computeVat(inp);
            return SASU_IS.computeForecast(inp, rev, social, tax, vat);
        };

        const f1 = run(baseInput);
        const f2 = run(nextInput);

        const deltaNet = f2.restant_a_vivre_annuel - f1.restant_a_vivre_annuel;
        const deltaCash = f2.tresorerie_fin_annee - f1.tresorerie_fin_annee;

        // +1000 Gross Div -> +686 Net Perso (31.4% tax)
        expect(deltaNet).toBeCloseTo(686 * 100, -2);

        // Company pays 1000 more out.
        expect(deltaCash).toBeCloseTo(-1000 * 100, -2);
    });

    it('Scenario D: IS Split 15% / 25%', () => {
        // Profit 42500 -> IS = 15% * 42500 = 6375
        // Profit 52500 -> IS = 6375 + 10000 * 25% = 6375 + 2500 = 8875

        // Case 1: Exact limit
        const input1 = createInput(42500 * 1.2, 0, 0, 0);
        const t1 = SASU_IS.computeTax(input1, SASU_IS.computeRevenue(input1), SASU_IS.computeSocial(input1, SASU_IS.computeRevenue(input1)));
        expect(t1.impot_societe).toBeCloseTo(6375 * 100, -2);

        // Case 2: Above limit
        const input2 = createInput(52500 * 1.2, 0, 0, 0);
        const t2 = SASU_IS.computeTax(input2, SASU_IS.computeRevenue(input2), SASU_IS.computeSocial(input2, SASU_IS.computeRevenue(input2)));
        expect(t2.impot_societe).toBeCloseTo(8875 * 100, -2);
    });
});
