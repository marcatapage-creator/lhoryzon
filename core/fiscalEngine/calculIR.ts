import { IR_2026, BaremeIR } from "./barèmes";
import { TaxResult } from "./index";

export function calculateIncomeTax(
    netTaxableIncome: number,
    nbParts: number,
    bareme: BaremeIR = IR_2026
): TaxResult {
    // 1. Quotient Familial
    // R = Revenu net imposable / N
    const R = Math.floor(netTaxableIncome / nbParts); // Round down to cents

    // 2. Calcul de l'impôt brut par part
    let impotBrutParPart = 0;

    // On itère sur les tranches
    for (const tranche of bareme.tranches) {
        if (R >= tranche.min) {
            // const base = Math.min(R, tranche.max) - tranche.min + (tranche.min === 0 ? 0 : 1);
            // Note: If tranche starts at 0, base is R - 0. If starts at X+1, we count from X+1.
            // Simplified logic usually: 
            // if R > max: add (max - min) * rate. 
            // if R in [min, max]: add (R - min) * rate.
            // Let's use the explicit "amount in tranche" logic.

            // Re-evaluating based on inclusive/exclusive.
            // My tranches are [min, max].
            // Amount in tranche = Math.max(0, Math.min(R, tranche.max) - (tranche.min > 0 ? tranche.min - 1 : 0));
            // Actually, if min is (previous_max + 1), then valid amount is R - previous_max.
            // previous_max is tranche.min - 1.

            const floor = tranche.min > 0 ? tranche.min - 1 : 0;
            const ceiling = tranche.max;

            const taxableInTranche = Math.max(0, Math.min(R, ceiling) - floor);
            impotBrutParPart += taxableInTranche * tranche.taux;
        }
    }

    // 3. Impôt brut total
    const impotBrutTotal = Math.floor(impotBrutParPart * nbParts);

    // 4. Décote
    // Décote = Limite - (Impôt * Coeff)
    // 4. Décote
    // Formule 2026 (revenus 2025) pour célibataire :
    // Décote = Limite - (Impôt * Coeff)
    // Mais attention : la décote ne peut pas dépasser l'impôt lui-même (sinon impôt < 0).
    // Et elle s'applique si Impôt < Seuil (Limit).

    let decote = 0;
    const { limit_single, coeff } = bareme.decote; // seuil_single (~890) removed from use as formula uses limit checks usually.
    // Let's re-verify the formula provided by user:
    // Décote = min(impôt brut, plafond - 0.45 * impôt brut)
    // "plafond" here refers to the flat amount (e.g. 890€). 

    // PLF 2025 / 2026 logic often:
    // Si Impôt Brut < Seuil Application (1970€)
    // Alors Décote = 890€ - 45.25% * Impôt Brut
    // Et Impôt Net = Impôt Brut - Décote.

    // Let's stick to the constants we have in barèmes.ts:
    // seuil_single = 890_00
    // limit_single = 1970_00
    // coeff = 0.4525

    if (impotBrutTotal < limit_single) {
        const montantTheorique = bareme.decote.seuil_single - (impotBrutTotal * coeff);
        decote = Math.max(0, Math.round(montantTheorique));
        // Cap decote at impotBrutTotal (cannot have negative tax)
        decote = Math.min(decote, impotBrutTotal);
    }

    const impotNet = Math.max(0, impotBrutTotal - decote);

    // 5. Calcul TMI
    let tmi = 0;
    for (const tranche of bareme.tranches) {
        if (R >= tranche.min) {
            tmi = tranche.taux;
        }
    }

    return {
        impot_revenu_total: impotNet, // Cents
        impot_brut: impotBrutTotal, // Cents (New)
        decote_appliquee: decote, // Cents (New)
        tmi: tmi,
        taux_moyen: netTaxableIncome > 0 ? impotNet / netTaxableIncome : 0,
        decote_applicables: decote > 0
    };
}
