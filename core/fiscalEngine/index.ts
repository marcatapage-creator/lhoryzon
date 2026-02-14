import { z } from "zod";

// --- Base Types ---
export type MoneyCents = number;
export type RateBps = number; // Basis points: 1% = 100 bps

export const MonthSchema = z.enum([
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]);
export type Month = z.infer<typeof MonthSchema>;

export const MONTHS: Month[] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

// --- Input Data Types ---

export enum WarningCode {
    SOLVER_DIVERGENCE_FALLBACK_APPROX = "SOLVER_DIVERGENCE_FALLBACK_APPROX",
    INPUT_INCONSISTENT = "INPUT_INCONSISTENT",
    NEGATIVE_REGULARIZATION = "NEGATIVE_REGULARIZATION",
    EXCESSIVE_SOCIAL_CONTRIBUTIONS = "EXCESSIVE_SOCIAL_CONTRIBUTIONS"
}

export interface SimulationInput {
    year: number;
    months: Month[];

    // Revenue
    ca_facture_ttc: MoneyCents;
    ca_encaisse_ttc: MoneyCents;

    // Expenses
    charges_deductibles_ht: MoneyCents;
    charges_non_deductibles_ttc: MoneyCents;

    // VAT Context
    tva_collectee_reelle?: MoneyCents; // If user tracks it
    tva_deductible_reelle?: MoneyCents; // If user tracks it

    // Social Context
    acomptes_urssaf_payes: MoneyCents;
    regularisation_urssaf_n_1: MoneyCents; // To pay or (receive)
    // EI Réel specific
    cotisations_sociales_payees?: MoneyCents; // For Cash Basis accuracy
    mode_assiette_sociale?: 'approx' | 'iteratif';
    urssaf_taux_effectif_cible?: number; // 0.40 etc. for approx mode

    // Tax Context
    nb_parts_fiscales: number;
    personne_a_charge: number;
    autres_revenus_foyer: MoneyCents; // For TMI calculation
    prelevement_source_paye: MoneyCents;

    // SASU IS Specific
    remuneration_mode?: 'total_charge' | 'net_target';
    remuneration_amount?: MoneyCents; // Value interpretation depends on mode
    dividendes_bruts?: MoneyCents;
    acompte_is_paye?: MoneyCents;
    pfu_taux_specifique?: number; // Override if needed
}

// --- Output Results Types ---

export interface RevenueResult {
    ca_ht: MoneyCents;
    ca_imposable: MoneyCents; // After abbatement if Micro
}

export interface ChargeResult {
    total_charges: MoneyCents;
    charges_deductibles: MoneyCents;
    charges_sociales_deductibles: MoneyCents; // Calculated social charges that can be deducted
}

export interface SocialResult {
    cotisations_totales: MoneyCents;
    breakdown: {
        maladie: MoneyCents;
        retraite_base: MoneyCents;
        retraite_compl: MoneyCents;
        csg_crds: MoneyCents;
        alloc_fam: MoneyCents;
        cfp: MoneyCents; // Formation pro
        curps?: MoneyCents; // If applicable
    };
    provision_n_plus_1: MoneyCents; // Estimated regularization for next year
    warnings?: string[];
}

export interface TaxResult {
    impot_revenu_total: number; // Montant final (Cents)
    impot_brut: number; // Avant décote/réductions (Cents)
    decote_appliquee: number; // Montant de la décote (Cents)
    tmi: number; // Taux Marginal d'Imposition (0, 0.11, etc.)
    taux_moyen: number; // Taux moyen d'imposition
    impot_societe?: number; // If IS
    decote_applicables: boolean;
}

export interface VatResult {
    tva_collectee: MoneyCents;
    tva_deductible: MoneyCents;
    tva_due: MoneyCents;
    regime: 'franchise' | 'reel_simplifie' | 'reel_normal';
}

export interface ForecastResult {
    restant_a_vivre_annuel: number;
    tresorerie_fin_annee: number;
    epargne_possible: number;
    monthly_burn_rate: number;
    runway_months: number;

    // Educational / Explainability fields
    impot_brut: number;
    decote_appliquee: number;
    impot_net: number;
    tmi: number;
    taux_effectif_global: number;
    pression_fiscale_totale: number; // Total Taxes / Total Revenue
    warnings?: string[]; // Non-convergence, fallback, etc.
}

// --- Global Simulation Result ---

export interface FiscalSimulation {
    input: SimulationInput;
    revenue: RevenueResult;
    charges: ChargeResult;
    social: SocialResult;
    tax: TaxResult;
    vat: VatResult;
    forecast: ForecastResult;

    // Meta
    total_decaissements_obligatoires: MoneyCents; // VAT + Social + Tax
    pression_fiscale_globale: number; // (Social + Tax) / CA HT
    date_simulee: Date;
}
