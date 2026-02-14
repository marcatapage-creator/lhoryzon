import { SimulationInput, RevenueResult, SocialResult, TaxResult, ForecastResult, VatResult, WarningCode } from "../index";
import { FiscalProfile } from "../profiles";
import { SASU_RATES_2026 } from "../barèmes"; // EI rates for fallback or generic utils

export const SASU_IS: FiscalProfile = {
    label: "SASU à l'IS",
    code: 'SASU_IS',

    computeCharges(data: SimulationInput): any { // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
            total_charges: data.charges_deductibles_ht, // + Social + Remun?
            // "Fiscal" charges deductible approach
            charges_deductibles: data.charges_deductibles_ht,
            charges_sociales_deductibles: 0 // Remun + Social handled in Tax Step for IS
        };
    },

    computeRevenue(data: SimulationInput): RevenueResult {
        // SASU "Revenue" for IS context:
        // Resultat Comptable Avant Impot & Remun = CA HT - Charges Ext HT.
        // We will deduct remuneration in computeSocial/computeTax steps to get Fiscal Result.

        // const ca_ht = data.ca_encaisse_ttc - (data.tva_collectee_reelle || 0); // Approx
        const VAT_RATE = 0.20;
        const derived_ca_ht = Math.round(data.ca_encaisse_ttc / (1 + VAT_RATE));
        const ca_ht_final = derived_ca_ht;

        // Base Pro = CA HT - Charges Ext.
        // Note: charges_deductibles_ht should NOT include remuneration/social yet.
        const charges_ext = data.charges_deductibles_ht;

        return {
            ca_ht: ca_ht_final,
            ca_imposable: Math.max(0, ca_ht_final - charges_ext) // This is "EBE Agency" approx
        };
    },

    computeSocial(data: SimulationInput, _revenue: RevenueResult): SocialResult { // eslint-disable-line @typescript-eslint/no-unused-vars
        // President Remuneration Logic
        // mode: 'total_charge' (Coût Entreprise) or 'net_target' (Net Avant Impot)

        const mode = data.remuneration_mode || 'total_charge';
        const amount = data.remuneration_amount || 0;

        let total_cout_entreprise = 0;
        let net_avant_impot = 0;

        const coef_total_to_net = SASU_RATES_2026.social_president.coef_total_to_net;
        const coef_net_to_total = SASU_RATES_2026.social_president.coef_net_to_total;

        if (mode === 'total_charge') {
            total_cout_entreprise = amount;
            net_avant_impot = Math.round(amount * coef_total_to_net);
        } else {
            net_avant_impot = amount;
            total_cout_entreprise = Math.round(amount * coef_net_to_total);
        }

        // "Cotisations" here means (Total - Net). 
        // Note: Assimilé salarié pays Salarial + Patronal.
        const social_charges = Math.max(0, total_cout_entreprise - net_avant_impot);

        // Ensure we don't exceed available revenue? 
        // We allow negative result (deficit) in SASU, but cashflow might block. 
        // Let's compute as requested.

        return {
            cotisations_totales: social_charges, // This is "Charges Sociales" cost for company
            breakdown: {
                maladie: 0, retraite_base: 0, retraite_compl: 0, csg_crds: 0, alloc_fam: 0, cfp: 0
            },
            provision_n_plus_1: 0, // Not relevant for monthly payslip style
            warnings: [] // TODO: Add warning if cost > revenue?
        };
    },

    computeTax(data: SimulationInput, revenue: RevenueResult, _social: SocialResult): TaxResult { // eslint-disable-line @typescript-eslint/no-unused-vars
        // 1. Calculate Company Tax (IS)
        // Resultat Fiscal = CA HT - Charges Ext - Rémunération Totale (Net + Charges)
        // charges_deductibles_ht is external charges.
        // social.cotisations_totales is ONLY the social part. 
        // We need to deduct the FULL remuneration cost (Net + Social) from company result.

        // Reconstruct Remuneration Total Cost
        // In computeSocial we derived social from total.
        // Total = Net + Social. 
        // We need 'net_avant_impot'.

        // Let's restart logic cleanly or store it?
        // computeSocial returned "cotisations_totales".
        // Was it derived from 'total_charge'?
        // The net was (total - cotisations).
        // So Remuneration Total = Net + Cotisations.
        // BUT wait: 
        // If mode=total_charge, amount=Total.
        // If mode=net_target, we computed total.

        // HACK: Re-compute Total roughly or trust we can deduce it?
        // Better: computeSocial should perhaps return the metadata? 
        // Can't change interface easily.
        // Re-calulating using same constants.
        const mode = data.remuneration_mode || 'total_charge';
        const amount = data.remuneration_amount || 0;
        let total_remun_cost = 0;
        if (mode === 'total_charge') {
            total_remun_cost = amount;
        } else {
            total_remun_cost = Math.round(amount * SASU_RATES_2026.social_president.coef_net_to_total);
        }

        const charges_ext = data.charges_deductibles_ht;
        const resultat_fiscal = revenue.ca_ht - charges_ext - total_remun_cost;

        let is_du = 0;
        if (resultat_fiscal > 0) {
            const plafond = SASU_RATES_2026.is.plafond_reduit;
            const base_reduit = Math.min(resultat_fiscal, plafond);
            const base_normal = Math.max(0, resultat_fiscal - plafond);

            is_du = Math.round(base_reduit * SASU_RATES_2026.is.taux_reduit) +
                Math.round(base_normal * SASU_RATES_2026.is.taux_normal);
        }

        // We return IS as "impot_societe".
        // Standard "impot_revenu_total" is for the PERSON.
        // But here we are simulating the company mostly?
        // User wants "Net Perso" AND "Reste Société".
        // Forecast will handle the split.
        // TaxResult needs to carry IS info.

        return {
            impot_revenu_total: 0, // Calculated later for the person (on Remun + Dividends) or here? 
            // Let's reserve this field for PERSONAL IR on Remuneration if we want to simulate full "Net Pocket".
            // For V1 user asked for "Rémunération Président : coût employeur ↔ net perçu".
            // "Net Perçu" usually means BEFORE IR (Net à payer). 
            // But "Net Perso" dashboard usually implies Net d'Impôt.
            // Let's assume Net Avant IR for Remun for now, or apply standard abatements?
            // SASU President is TS (Traitements et Salaires). 
            // Abattement 10%.
            impot_brut: 0,
            decote_appliquee: 0,
            tmi: 0,
            taux_moyen: 0,
            impot_societe: is_du,
            decote_applicables: false
        };
    },

    computeVat(data: SimulationInput): VatResult {
        // Standard VAT
        const tva_coll = data.tva_collectee_reelle || Math.round(data.ca_facture_ttc * 0.20 / 1.20);
        const tva_ded = data.tva_deductible_reelle || Math.round(data.charges_deductibles_ht * 0.20);

        return {
            tva_collectee: tva_coll,
            tva_deductible: tva_ded,
            tva_due: Math.max(0, tva_coll - tva_ded),
            regime: 'reel_normal'
        };
    },

    computeForecast(data: SimulationInput, revenue: RevenueResult, social: SocialResult, tax: TaxResult, _vat: VatResult): ForecastResult { // eslint-disable-line @typescript-eslint/no-unused-vars
        // 1. Reconstruct Company State
        const charges_ext = data.charges_deductibles_ht;

        // Re-calc Total Remun Cost (Simulating data persistence gap)
        const mode = data.remuneration_mode || 'total_charge';
        const remun_input = data.remuneration_amount || 0;
        let total_remun_cost = 0;
        let net_remun_avant_ir = 0;

        if (mode === 'total_charge') {
            total_remun_cost = remun_input;
            net_remun_avant_ir = Math.round(remun_input * SASU_RATES_2026.social_president.coef_total_to_net);
        } else {
            net_remun_avant_ir = remun_input;
            total_remun_cost = Math.round(remun_input * SASU_RATES_2026.social_president.coef_net_to_total);
        }

        const resultat_fiscal = revenue.ca_ht - charges_ext - total_remun_cost;
        const is_du = tax.impot_societe || 0;
        const benefice_net = resultat_fiscal - is_du;

        const warnings: string[] = [];

        if (resultat_fiscal < 0) {
            warnings.push(WarningCode.INPUT_INCONSISTENT); // "Deficit"
        }

        // 2. Dividends
        const dividendes_bruts = data.dividendes_bruts || 0;

        // Check capacity
        // Cash-wise constraint: Tresorerie must assume Dividends + IS + Charges + Remun + VAT paid.
        // Legal constraint: Dividends <= Benefice Distributable (Simplification: Benefice Net).
        if (benefice_net > 0 && dividendes_bruts > (benefice_net + 100)) { // 1€ tolerance
            warnings.push(WarningCode.INPUT_INCONSISTENT); // "Dividendes > Bénéfice"
        }

        // Clamp for realistic forecast (Safety Check 1)
        // We warn if requested > available, but we calculate Net Perso based on what is ACTUALLY distributable.
        // This avoids "Impossible Net Perso" display.
        const dividendes_distribuables = Math.max(0, Math.min(dividendes_bruts, benefice_net));

        // PFU Calculation
        const pfu_rate = data.pfu_taux_specifique || SASU_RATES_2026.pfu.taux;
        const pfu_du = Math.round(dividendes_distribuables * pfu_rate);
        const dividendes_nets = Math.max(0, dividendes_distribuables - pfu_du);

        // 3. Net Perso Total
        // Net Remun (Avant IR personal? usually simulators show Net Before IR, and IR separated).
        // User asked: "Net perso (salaire net + dividendes nets)".
        // Assuming "Salaire Net" is Net à Payer (Avant IR). 
        // But for consistency with EI (Net Après Impôt), we should deduct IR on salary?
        // Let's add IR on salary roughly? Or verify if user wants "Net à payer" vs "Net Dispo après tout".
        // Prompt says: "Net perso (salaire net + dividendes nets)". And "Reste en société".

        // Let's assume Net Remun is "Net à payer before IR".
        // Dividends Net is "Net de PFU". PFU includes IR (12.8%) + Social (17.2%).
        // So Dividends Net is truly "Net Pocket".
        // Salary Net is "Net Pocket" ONLY IF we deduct IR. 
        // Given complexity of IR on salary (FOYER fiscal context), V1 usually sticks to Net à Payer.
        // However, `data.nb_parts_fiscales` is available.
        // Let's try to be consistent: 
        // If we want "Total Net Pocket", we should estimate IR on Salary.

        // V1 Decision: Use Net Remun (Avant IR) + Dividendes Nets.
        // With a warning or label clarification. Use `impot_brut` to signal IR on salary?

        const total_net_perso = net_remun_avant_ir + dividendes_nets;

        // Remaining in company is properly calculated from actual distribution
        // If we clamped, this should be ~0 (modulo rounding). 
        // If we didn't clamp (distributing less than benefit), it's positive.
        const reste_en_societe = Math.max(0, benefice_net - dividendes_distribuables);

        return {
            restant_a_vivre_annuel: total_net_perso,
            tresorerie_fin_annee: reste_en_societe, // Cash remaining in company
            epargne_possible: Math.max(0, total_net_perso * 0.15),
            monthly_burn_rate: 0,
            runway_months: 6,

            impot_brut: 0, // TODO: calculate IR on salary for full picture
            decote_appliquee: 0,
            impot_net: pfu_du + is_du, // Total taxes generated (IS + PFU) ? Or just Validated Tax?
            tmi: 0,

            // "Pression Fiscale Globale" = (IS + PFU + Cotisations) / (CA - Charges Ext) ?
            // User requested: "Taux effectif global".
            // Sum of all deductions vs "Creation de valeur" (CA - Charges Ext).
            taux_effectif_global: (revenue.ca_ht > charges_ext)
                ? ((social.cotisations_totales + is_du + pfu_du) / (revenue.ca_ht - charges_ext))
                : 0,

            pression_fiscale_totale: social.cotisations_totales + is_du + pfu_du,

            warnings: warnings
        };
    }
};
