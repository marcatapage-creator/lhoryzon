import { RateBps } from "@/core/fiscal-v2/domain/types";

// --- Taux URSSAF Artistes-Auteurs 2026 (Projected) ---
// BPS: 1% = 100 bps. 0.40% = 40 bps.

export const TAUX_URSSAF_AA_BPS = {
    MALADIE: 40, // 0.40%
    VIEILLESSE_PLAFONNEE: 690, // 6.90%
    VIEILLESSE_DEPLAFONNEE: 40, // 0.40%
    CSG: 920, // 9.20%
    CRDS: 50, // 0.50%
    CFP_AA: 35 // 0.35%
};

// Taux IRCEC / RAAP 2026
export const TAUX_RAAP_BPS: RateBps = 800; // 8.00%

export const MICRO_BNC_ABATTEMENT_BPS: RateBps = 3400; // 34%
