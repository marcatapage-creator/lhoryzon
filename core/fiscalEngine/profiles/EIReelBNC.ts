import { SimulationInput, RevenueResult, SocialResult, TaxResult, ForecastResult, VatResult, WarningCode } from "../index";
import { FiscalProfile } from "../profiles";
import { EI_BNC_RATES_2026 } from "../barèmes";
import { calculateIncomeTax } from "../calculIR";

export const EIReelBNC: FiscalProfile = {
    label: "EI Réel (BNC)",
    code: 'EI_REEL',

    computeCharges(data: SimulationInput): any { // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
            total_charges: data.charges_deductibles_ht,
            charges_deductibles: data.charges_deductibles_ht,
            charges_sociales_deductibles: 0 // Will be computed in social step
        };
    },

    computeRevenue(data: SimulationInput): RevenueResult {
        // EI Réel (Cash Basis)
        // Résultat = CA Encaissé (HT) - Charges Déductibles (HT) - Charges Sociales Payées (réelles, N-1, acomptes)
        // Note: Social charges are deducted here for "Fiscal Result", but for "Social Base" we iterate on Forecasted Social.

        // Let's distinguish "Fiscal Result" (Imposable) from "Professional Result before social" for solver.

        // const ca_ht = data.ca_encaisse_ttc - (data.tva_collectee_reelle || 0); // Approx valid if no VAT data
        // Better: if input has pre-calculated HT, use it? Fiscal Engine usually re-derives.
        // Let's assume input has HT expenses but TTC revenue? simulating VAT excluded.

        // For standard "Simulateur", we often just have TTC and auto-calc HT.
        // Let's assume simplistic HT derivation if no explicit VAT given
        const VAT_RATE = 0.20; // Default
        const derived_ca_ht = Math.round(data.ca_encaisse_ttc / (1 + VAT_RATE));

        // If TVA data is present in input (future V2), use it. For V1 use derived.
        const ca_ht_final = derived_ca_ht;

        // Fiscal Result (Intermediate): before social deduction of N (forecast).
        // Only deduct PAID social charges (N-1 or Acomptes already paid).

        const social_paid = (data.cotisations_sociales_payees || 0) + data.acomptes_urssaf_payes + data.regularisation_urssaf_n_1;

        const charges_deductibles = data.charges_deductibles_ht;

        // Base Pro = CA HT - Charges Ext.
        const resultat_activite = Math.max(0, ca_ht_final - charges_deductibles);

        // Fiscal Base = Resultat Activite - Social Payé (Cash Basis)
        const resultat_fiscal_intermediary = Math.max(0, resultat_activite - social_paid);

        return {
            ca_ht: ca_ht_final,
            ca_imposable: resultat_fiscal_intermediary // This is only accurate for CURRENT cash flow tax, but for FORECAST we deduct ESTIMATED social.
        };
    },

    computeSocial(data: SimulationInput, revenue: RevenueResult): SocialResult {
        // 2 Modes: Approx vs Interatif
        const mode = data.mode_assiette_sociale || 'approx';
        const target_rate = data.urssaf_taux_effectif_cible || EI_BNC_RATES_2026.taux_urssaf_cible;
        const warnings: string[] = [];

        // Re-calculate "Resultat avant social" (Approx)
        // We know Revenue.ca_imposable currently Deducts PAID social. 
        // For the purpose of ESTIMATING future social (Competence/Provision), we need:
        // Assiette Sociale ≈ Resultat Comptable Avant Impôt et Avant Cotisations Sociales (du futur)
        // plus précisément: Assiette ≈ Resultat + Cotisations Facultatives + CSG Non Déd.

        // Simplify for V1: Base = CA HT - Charges HT.
        const base_activite = Math.max(0, revenue.ca_ht - data.charges_deductibles_ht);

        if (mode === 'approx') {
            // Simple: Cotis = Base * Rate.
            // But Social is deductible from Base... circular?
            // "Approx" mode usually applies an effective rate on the "Profit before social" or "Revenue".
            // Let's say Rate is on "Resultat".
            // Cotis ≈ Base * Rate / (1 + Rate) ? Or just Base * Rate if calibrated on Superbrut?
            // "Taux de charges sociales sur le bénéfice" ~ 45%.
            // So if you have 100€ Benefice (avant social), Social is ~30%?
            // TNS rates are usually expressed on the BASE (net).
            // Let C = Base * Rate.
            // Base = (Activite - C).
            // C = (Activite - C) * rate_urssaf ?
            // C = Activite * rate_urssaf / (1 + rate_urssaf).

            // If rate_urssaf_cible is ~42% (Common TNS shortcut "45% du net"), then input denotes RateOnNet.
            const rateOnNet = target_rate; // 0.42
            const cotisations = Math.round(base_activite * rateOnNet / (1 + rateOnNet));

            return {
                cotisations_totales: cotisations,
                breakdown: {
                    maladie: 0, retraite_base: 0, retraite_compl: 0, csg_crds: 0, alloc_fam: 0, cfp: 0
                },
                provision_n_plus_1: cotisations, // Estimate
                warnings // Empty
            };
        } else {
            // Mode Iteratif - Solver
            // Goal: Find C such that Cotisations(ResultatActivite - C) = C.
            // We iterate.

            let C = 0; // Guess
            const MAX_ITER = EI_BNC_RATES_2026.solver.max_iterations;
            const TOLERANCE = EI_BNC_RATES_2026.solver.tolerance;
            const MAX_RATIO = EI_BNC_RATES_2026.solver.max_social_ratio;
            let converged = false;

            for (let i = 0; i < MAX_ITER; i++) {
                const assiette = Math.max(0, base_activite - C);

                // Compute Social on Assiette (Approximated details for now, or full bareme ?)
                // For V1 "Sans Faille" let's use the precise "Taux calibré" mechanic REPEATEDLY or implement full scale?
                // Requirements say "solveur itératif". Implicitly means full scale rates.
                // BUT "Évite au V1: micro-détails". "V1 (approx) + tests".
                // User said: "Option V1 (recommandée) : taux effectif calibré".
                // "Option V1.1 : mode itératif (...) si l'utilisateur le demande".

                // So if mode 'iteratif' selected, we MUST do better than approx.
                // Let's implement a simplified linear function or reusing 'approx' logic in loop is useless.
                // We will use the EI_BNC_RATES_2026.csg breakdown + a flat rate for the rest for V1?
                // Or standard TNS approx: Assiette * ~45%?
                // If the prompt implies "Implementing EI Réel", let's make the solver logic sound even if the inner function is simple.

                // Let's assume a function f(assiette) -> soc
                // Soc = assiette * 0.45 (simplified bracket) + CSG/CRDS logic
                // CSG is on (Assiette + Cotis).

                // Function: calculateRealTNSCharges(assiette)
                const soc_calc = Math.round(assiette * 0.43); // 43% simplified average TNS
                // Add CSG/CRDS precisely
                const csg = Math.round((assiette + soc_calc) * EI_BNC_RATES_2026.csg.total);

                let new_C = soc_calc + csg; // Total estimated

                // Safety Bound Check
                if (new_C > base_activite * MAX_RATIO) {
                    new_C = Math.round(base_activite * MAX_RATIO);
                }

                if (Math.abs(new_C - C) <= TOLERANCE) {
                    C = new_C;
                    converged = true;
                    break;
                }

                C = new_C; // Update
            }

            // Fallback if not converged
            if (!converged) {
                warnings.push(WarningCode.SOLVER_DIVERGENCE_FALLBACK_APPROX);
                // Fallback to approx
                const rateOnNet = target_rate;
                C = Math.round(base_activite * rateOnNet / (1 + rateOnNet));
            }

            return {
                cotisations_totales: C,
                breakdown: {
                    maladie: 0, retraite_base: 0, retraite_compl: 0, csg_crds: 0, alloc_fam: 0, cfp: 0
                },
                provision_n_plus_1: C,
                warnings
            };
        }
    },

    computeTax(data: SimulationInput, revenue: RevenueResult, social: SocialResult): TaxResult {
        // IR Base = CA - Charges - Social (Deductible only).
        // CSG Non Deductible must be added back.

        // Base Activite
        const base_activite = Math.max(0, revenue.ca_ht - data.charges_deductibles_ht);

        // Deductible Social
        // If approx, assume all deductible or standard ratio?
        // Standard: CSG Non Ded is 2.9% of (Assiette + Cotis).
        // Let's estimate CSG Non Ded part.
        const total_social = social.cotisations_totales;

        // Estimation: Part Non Ded ~ 5-10% of social?
        // More precise: 2.9% of (Net + Social).
        // Let's assume fiscal base ~ (Base Activite - Social).
        // CSG Non Ded ~ (Base Fiscal + Social) * 2.9%.
        // Simplified V1: 2.9% * Base Activite (Net + Social).
        const csg_non_ded = Math.round(base_activite * EI_BNC_RATES_2026.csg.non_deductible);

        const social_deductible = Math.max(0, total_social - csg_non_ded);

        const taxable_income = Math.max(0, base_activite - social_deductible); // Resultat Fiscal

        return calculateIncomeTax(taxable_income, data.nb_parts_fiscales);
    },

    computeVat(data: SimulationInput): VatResult {
        // Simple 20% flat or real from input
        const tva_coll = data.tva_collectee_reelle || Math.round(data.ca_facture_ttc * 0.20 / 1.20);
        const tva_ded = data.tva_deductible_reelle || Math.round(data.charges_deductibles_ht * 0.20);

        return {
            tva_collectee: tva_coll,
            tva_deductible: tva_ded,
            tva_due: Math.max(0, tva_coll - tva_ded),
            regime: 'reel_normal'
        };
    },

    computeForecast(data: SimulationInput, revenue: RevenueResult, social: SocialResult, tax: TaxResult, vat: VatResult): ForecastResult {
        // Cash Flow Forecast
        // const total_decaissements = social.cotisations_totales + tax.impot_revenu_total + vat.tva_due + data.charges_non_deductibles_ttc;
        // const net_pocket = Math.max(0, data.ca_encaisse_ttc - data.charges_deductibles_ht * 1.20 - total_decaissements); // Rough 1.20 for HT->TTC expenses if needed

        // Actually charges_deductibles are HT. We need to pay TTC.
        // If VAT is deductible, we pay TTC but get VAT back. Net cost is HT. 
        // Cash impact: Pay TTC, Receive VAT Refund (or pay less VAT due).
        // Simplest Cash View: (CA TTC) - (Charges TTC) - (Social) - (Tax) - (VAT diff).
        // VAT Diff = (Coll - Ded). 
        // Net Cash = (HT_In + VAT_In) - (HT_Out + VAT_Out) - Social - Tax - (VAT_In - VAT_Out)
        //          = HT_In - HT_Out - Social - Tax.
        // Provided VAT is properly handled.
        // Let's stick to: CA TTC - Charges TTC?
        // data.charges_deductibles_ht -> Need TTC? Assumed 20%?
        const charges_ded_ttc = Math.round(data.charges_deductibles_ht * 1.20);

        // const cash_remaining = data.ca_encaisse_ttc
        //    - charges_ded_ttc
        //    - data.charges_non_deductibles_ttc
        //    - social.cotisations_totales
        //    - tax.impot_revenu_total
        //    - vat.tva_due;
        // Total Paid = Charges TTC + VAT Due = (HtOut + VatOut) + (VatIn - VatOut) = HtOut + VatIn.
        // Total In = CA TTC = HtIn + VatIn.
        // Diff = (HtIn + VatIn) - (HtOut + VatIn) = HtIn - HtOut.
        // So YES, paying Charges TTC + VAT Due is consistent with Net = HtIn - HtOut.
        // But wait, charges_non_deductibles are TTC.

        // Wait, logic check:
        // Cash In: CA TTC
        // Cash Out: Charges TTC
        // Cash Out: Social
        // Cash Out: Tax
        // Cash Out: VAT Payment (diff)

        // Correct.
        const final_cash = data.ca_encaisse_ttc
            - charges_ded_ttc
            - data.charges_non_deductibles_ttc
            - social.cotisations_totales
            - tax.impot_revenu_total
            - vat.tva_due;

        // Collect warnings
        const all_warnings = [
            ...(social.warnings || []),
            ...(vat.regime === 'reel_normal' && vat.tva_due <= 0 ? [] : []) // Example
        ];

        // Assertion: Regularisation < 0 (Warning) - Guard against input error or unexpected credit logic
        if (data.regularisation_urssaf_n_1 < 0) {
            all_warnings.push(WarningCode.NEGATIVE_REGULARIZATION);
        }

        // Assertion: Social > 60% of Result (Warning) - Guard against runaway model
        // Resultat ≈ CA HT - Charges HT
        const base_activite = Math.max(0, revenue.ca_ht - data.charges_deductibles_ht);
        if (base_activite > 0 && social.cotisations_totales > (base_activite * 0.60)) {
            all_warnings.push(WarningCode.EXCESSIVE_SOCIAL_CONTRIBUTIONS);
        }

        return {
            restant_a_vivre_annuel: final_cash,
            tresorerie_fin_annee: final_cash,
            epargne_possible: Math.max(0, final_cash * 0.15),
            monthly_burn_rate: 0,
            runway_months: 6,

            impot_brut: tax.impot_brut,
            decote_appliquee: tax.decote_appliquee,
            impot_net: tax.impot_revenu_total,
            tmi: tax.tmi,
            taux_effectif_global: data.ca_facture_ttc > 0 ? ((social.cotisations_totales + tax.impot_revenu_total) / data.ca_facture_ttc) : 0,
            pression_fiscale_totale: social.cotisations_totales + tax.impot_revenu_total,
            warnings: all_warnings
        };
    }
};
