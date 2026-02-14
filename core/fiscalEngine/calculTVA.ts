import { VatResult, MoneyCents } from "./index";

export function calculateVAT(
    collectedTTC: MoneyCents,
    deductibleHT: MoneyCents, // Note: deductible is usually tracked as the VAT amount itself in accounting, but here we might simulate from expenses
    // Actually, usually we know the VAT amount from the expense receipt.
    // Let's assume input is "Total VAT Collected" and "Total VAT Deductible" for the pure calculation
    // BUT the simulator entry is usually "Dépenses HT" + "Taux Moyen" maybe?
    // Let's look at SimulationInput: charges_deductibles_ht.

    // We need a helper to estimate VAT deductible if we only have HT amounts and an average rate
    // Or we rely on the input "tva_deductible_reelle" if available.

    input: {
        tva_collectee_reelle?: MoneyCents;
        tva_deductible_reelle?: MoneyCents;
        ca_facture_ttc: MoneyCents;
        charges_deductibles_ht: MoneyCents;
    },
    isFranchise: boolean = false
): VatResult {

    if (isFranchise) {
        return {
            tva_collectee: 0,
            tva_deductible: 0,
            tva_due: 0,
            regime: 'franchise'
        };
    }

    // 1. Determine Collected VAT
    // Usage: Real tracked VAT > Estimate from TTC
    let tvaCollectee = input.tva_collectee_reelle ?? 0;

    if (input.tva_collectee_reelle === undefined) {
        // Estimate: CA TTC includes VAT. 
        // Assuming 20% standard rate for simplification if not tracked
        // CA HT = CA TTC / 1.2
        // VAT = CA TTC - CA HT
        const caHT = input.ca_facture_ttc / 1.2;
        tvaCollectee = input.ca_facture_ttc - caHT;
    }

    // 2. Determine Deductible VAT
    let tvaDeductible = input.tva_deductible_reelle ?? 0;

    if (input.tva_deductible_reelle === undefined) {
        // Estimate: 20% on expenses HT
        tvaDeductible = input.charges_deductibles_ht * 0.20;
    }

    const tvaDue = Math.max(0, tvaCollectee - tvaDeductible);

    return {
        tva_collectee: Math.round(tvaCollectee),
        tva_deductible: Math.round(tvaDeductible),
        tva_due: Math.round(tvaDue),
        regime: 'reel_simplifie' // Default fallback
    };
}
