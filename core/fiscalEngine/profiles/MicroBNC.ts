import {
    SimulationInput,
    RevenueResult,
    ChargeResult,
    SocialResult,
    TaxResult,
    VatResult,
    ForecastResult
} from "../index";
import { FiscalProfile } from "../profiles";
import { calculateIncomeTax } from "../calculIR";
import { calculateVAT } from "../calculTVA";
import { MICRO_SOCIAL_RATES_2026, MicroSocialCategory } from "../barèmes";

export const MicroBNC: FiscalProfile = {
    label: "Micro-Entreprise BNC",
    code: "MICRO_BNC",

    computeRevenue(data: SimulationInput): RevenueResult {
        // Micro BNC: Abattement 34%
        const ABATTEMENT = 0.34;
        const MIN_ABATTEMENT_CENTS = 305 * 100;
        const ca_ht = data.ca_encaisse_ttc;

        const montant_abattement = Math.max(
            MIN_ABATTEMENT_CENTS,
            Math.round(ca_ht * ABATTEMENT)
        );

        const base_imposable = Math.max(0, ca_ht - montant_abattement);

        return {
            ca_ht: ca_ht,
            ca_imposable: base_imposable
        };
    },

    computeCharges(data: SimulationInput): ChargeResult {
        return {
            total_charges: data.charges_deductibles_ht + data.charges_non_deductibles_ttc,
            charges_deductibles: 0,
            charges_sociales_deductibles: 0
        };
    },

    computeSocial(data: SimulationInput, revenue: RevenueResult): SocialResult {
        // Category should come from mapping or input. Defaulting to BNC for this profile.
        // In future revisions, we can read `data.microCategory` if added to input.
        const category: MicroSocialCategory = 'BNC';
        const rates = MICRO_SOCIAL_RATES_2026[category];

        const cotisations = revenue.ca_ht * (rates.social + rates.cfp);

        return {
            cotisations_totales: cotisations,
            breakdown: {
                maladie: 0,
                retraite_base: 0,
                retraite_compl: 0,
                csg_crds: 0,
                alloc_fam: 0,
                cfp: revenue.ca_ht * rates.cfp,
            },
            provision_n_plus_1: 0
        };
    },

    computeTax(data: SimulationInput, revenue: RevenueResult, _social: SocialResult): TaxResult { // eslint-disable-line @typescript-eslint/no-unused-vars
        return calculateIncomeTax(revenue.ca_imposable, data.nb_parts_fiscales);
    },

    computeVat(data: SimulationInput): VatResult {
        const isFranchise = (data.tva_collectee_reelle === 0 || data.tva_collectee_reelle === undefined) && (data.ca_facture_ttc < 36800);

        return calculateVAT(data.ca_encaisse_ttc, data.charges_deductibles_ht, {
            ...data,
            ca_facture_ttc: data.ca_facture_ttc,
            charges_deductibles_ht: data.charges_deductibles_ht
        }, isFranchise);
    },

    computeForecast(data: SimulationInput, revenue: RevenueResult, social: SocialResult, tax: TaxResult, vat: VatResult): ForecastResult {
        const total_decaissements =
            data.charges_deductibles_ht +
            data.charges_non_deductibles_ttc +
            vat.tva_due +
            social.cotisations_totales +
            tax.impot_revenu_total;

        const net_pocket = data.ca_encaisse_ttc - total_decaissements;

        return {
            restant_a_vivre_annuel: net_pocket,
            tresorerie_fin_annee: net_pocket,
            epargne_possible: Math.max(0, net_pocket * 0.20),
            monthly_burn_rate: total_decaissements / 12,
            runway_months: net_pocket > 0 ? 12 : 0,

            // Explainability
            impot_brut: tax.impot_brut,
            decote_appliquee: tax.decote_appliquee,
            impot_net: tax.impot_revenu_total,
            tmi: tax.tmi,
            taux_effectif_global: data.ca_facture_ttc > 0 ? (total_decaissements / data.ca_facture_ttc) : 0,
            pression_fiscale_totale: total_decaissements
        };
    }
};
