import { SimulationInput, SocialResult, RevenueResult } from "./index";
import { COTISATIONS_URSSAF_2025 } from "./barèmes";

export function calculateSocialBNC(
    revenue: RevenueResult,
    input: SimulationInput
): SocialResult {
    const baseCalcul = revenue.ca_imposable; // Pour BNC Réel, c'est le Bénéfice (CA - Charges). Pour Micro, c'est CA - Abattement.
    // Attention: En BNC Réel (Déclaration contrôlée), l'assiette sociale est le Bénéfice + Cotisations Facultatives (Madelin) + CSG non déductible.
    // Pour une simulation simplifiée "Est-ce que je peux dépenser ?", on part souvent du Bénéfice estimé.

    const C = COTISATIONS_URSSAF_2025;
    const PASS = C.PASS;

    // --- 1. Maladie-Maternité ---
    // Taux progressif
    let tauxMaladie = 0;
    if (baseCalcul < 1.1 * PASS) {
        // Formule progressive simplifiée (interpolation linéaire entre min et max)
        // (TauxMax - TauxMin) / (SeuilMax - SeuilMin) * (Revenu - SeuilMin) + TauxMin
        // Ici simple: pente de 0 à 6.5% jusqu'à 1.1 PASS
        tauxMaladie = (baseCalcul / (1.1 * PASS)) * C.BNC.maladie_maternite.max_taux;
    } else {
        tauxMaladie = C.BNC.maladie_maternite.max_taux;
    }
    const maladie = baseCalcul * tauxMaladie;

    // --- 2. Retraite Base ---
    // Tranche 1: Jusqu'à 1 PASS
    const baseRetraiteT1 = Math.min(baseCalcul, PASS);
    const retraiteBaseToPay = baseRetraiteT1 * C.BNC.retraite_base.t1;

    // Tranche 2: Au-delà
    const baseRetraiteT2 = Math.max(0, baseCalcul - PASS);
    const retraiteBaseToPay2 = baseRetraiteT2 * C.BNC.retraite_base.t2;

    const retraiteBase = retraiteBaseToPay + retraiteBaseToPay2;

    // --- 3. Retraite Complémentaire ---
    const seuilT1 = 40000; // Seuil approx SSI/CIPAV
    const baseComplT1 = Math.min(baseCalcul, seuilT1);
    const complT1 = baseComplT1 * C.BNC.retraite_compl.t1;

    const baseComplT2 = Math.max(0, baseCalcul - seuilT1);
    // Plafonnée ? Souvent oui à 4 PASS. On simplifie pour l'instant.
    const complT2 = baseComplT2 * C.BNC.retraite_compl.t2;

    const retraiteCompl = complT1 + complT2;

    // --- 4. CSG/CRDS ---
    // Assiette CSG = (Revenu + Cotisations Sociales Obligatoires) + Cotis Facultatives
    // Approximation: Revenu Net * 1.X ?
    // Ou calcul sur le revenu pro + cotisations personnelles déjà payées.
    // Dans une simu "Forecast", on estime souvent CSG = 9.7% du (Bénéfice + Cotis).
    // Pour éviter référence circulaire (Cotis dépendent de CSG et inversement), on utilise une formule de "Super Brut" ou une approx.
    // Approx classique: 9.7% sur le revenu net + 30-40% de cotis estimées.

    const csg = (baseCalcul * 1.35) * C.BNC.csg_crds; // Approximation haute pour prudence

    // --- 5. Alloc Fam ---
    let tauxAlloc = C.BNC.alloc_fam.taux_plein;
    if (baseCalcul < 1.1 * PASS) {
        tauxAlloc = 0; // Exonération totale si bas revenus (souvent progressif, simplifions à 0 pour < 1.1 PASS est optimiste, check reei)
        // En vrai: Taux 0% jusqu'à 110% PASS, puis progressif jusqu'à 3.1%.
        // Donc 0.
        tauxAlloc = 0;
    }
    const allocFam = baseCalcul * tauxAlloc;

    // --- 6. Total ---
    // CFP
    const cfp = PASS * C.BNC.cfp;

    const totalCotisations = maladie + retraiteBase + retraiteCompl + csg + allocFam + cfp;

    // --- 7. Provision N+1 ---
    // Si revenu augmente, la régul N+1 sera positive.
    // Provision = Cotis Théoriques sur ce revenu - Acomptes payés en N (basés sur N-2)
    // Ici on simule "Cotis Totales dues pour l'année".
    // Le "Solde à payer" = Total - Acomptes.

    // Si on veut estimer la provision pour N+1 (regularisation), c'est l'écart entre le réel et le forfaitaire payé.
    // Supposons que l'input `acomptes_urssaf_payes` contient ce qui a été versé.
    const solde = totalCotisations - input.acomptes_urssaf_payes;

    return {
        cotisations_totales: Math.round(totalCotisations),
        breakdown: {
            maladie: Math.round(maladie),
            retraite_base: Math.round(retraiteBase),
            retraite_compl: Math.round(retraiteCompl),
            csg_crds: Math.round(csg),
            alloc_fam: Math.round(allocFam),
            cfp: Math.round(cfp),
        },
        provision_n_plus_1: Math.round(solde) // Ce solde sera demandé l'année d'après lors de la régul
    };
}
