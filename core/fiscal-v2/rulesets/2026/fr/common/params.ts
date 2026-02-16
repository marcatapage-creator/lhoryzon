import { MoneyCents } from "@/core/fiscal-v2/domain/types";

// --- Global Params 2026 (Common) ---

export const PASS_2026: MoneyCents = 48060 * 100;
export const PASS_2025: MoneyCents = 46368 * 100;

// SMIC Explicit (No Derivation)
export const SMIC_HORAIRE_2026: MoneyCents = 1188;

// Seuil RAAP Explicit
export const SEUIL_RAAP_2026: MoneyCents = 10692 * 100;

export const SEUIL_FRANCHISE_TVA_BASE_2026: MoneyCents = 36800 * 100;

// Micro-BNC Validations
export const MICRO_BNC_ABATTEMENT_MIN_2026: MoneyCents = 305 * 100; // 305€ Minimum Abatement
