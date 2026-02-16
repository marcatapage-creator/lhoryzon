import { TAUX_URSSAF_AA_BPS, TAUX_RAAP_BPS } from "./params";
import { PASS_2026, SMIC_HORAIRE_2026, SEUIL_RAAP_2026, PASS_2025 } from "../common/params";
import { paramsFingerprint } from "@/core/fiscal-v2/engine/hashing";

// Structure Canonical JSON for Ruleset 2026 AA
const rulesetParams = {
    jurisdiction: "FR",
    year: 2026,
    module: "artist_author",
    money: {
        rounding: "Math.round (HALF_UP equivalent)",
        rate_unit: "BPS",
        amount_unit: "CENTS"
    },
    constants: {
        PASS_EUR: PASS_2026 / 100, // 48060
        SMIC_HOURLY_CENTS: SMIC_HORAIRE_2026,
        RAAP_THRESHOLD_EUR: SEUIL_RAAP_2026 / 100, // 10692
        RAAP_CEILING_EUR: (PASS_2026 * 3) / 100, // 144180
        SOCIAL_BASE_UPLIFT_BPS: 11500
    },
    rates_bps: {
        URSSAF_VIEILLESSE_PLAF: TAUX_URSSAF_AA_BPS.VIEILLESSE_PLAFONNEE,
        URSSAF_VIEILLESSE_DEPLAF: TAUX_URSSAF_AA_BPS.VIEILLESSE_DEPLAFONNEE,
        URSSAF_CSG: TAUX_URSSAF_AA_BPS.CSG,
        URSSAF_CRDS: TAUX_URSSAF_AA_BPS.CRDS,
        URSSAF_CFP: TAUX_URSSAF_AA_BPS.CFP_AA,
        RAAP_STANDARD: TAUX_RAAP_BPS,
        // RAAP_REDUCED: 400 // Feature Flagged / Not Default
    },
    bases: {
        CSG_CRDS_ASSIETTE_FACTOR_BPS: 9825
    },
    caps: {
        VIEILLESSE_PLAF_CAP: "PASS",
        RAAP_CAP: "3xPASS"
    }
};

export function getParamsFingerprint(): string {
    return paramsFingerprint(rulesetParams);
}

export const AA_2026_Fingerprint = getParamsFingerprint();
