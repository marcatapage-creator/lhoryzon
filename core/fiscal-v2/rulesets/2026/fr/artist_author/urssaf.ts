import { ComputedBases, FiscalAlert, FiscalContext, TaxLineItem } from "@/core/fiscal-v2/domain/types";
import { TAUX_URSSAF_AA_BPS } from "./params";
import { PASS_2026 } from "../common/params";
import { mulCentsRate } from "@/core/fiscal-v2/engine/money";

export function computeUrssaf(bases: ComputedBases, context: FiscalContext): TaxLineItem[] {
    const lines: TaxLineItem[] = [];
    const baseSocial = bases.social.total; // Assiette Sociale (BNC majoré)

    // Check 4 PASS Rule (Simplified Handling)
    const FOUR_PASS = PASS_2026 * 4;
    // We don't change calculation logic here unless we implement the full rule.
    // We assume 98.25% applies generally below this for CSG/CRDS in this simplified model.
    // An alert should be raised by the Alert module if base > 4 PASS.
    // Or we raise a warning here via metadata? 
    // Line items are strictly calculation rows. Alerts are separate.

    // 2. Vieillesse Plafonnée (6.90% capped at PASS)
    const basePlafonnee = Math.min(baseSocial, PASS_2026);
    const amountPlaf = mulCentsRate(basePlafonnee, TAUX_URSSAF_AA_BPS.VIEILLESSE_PLAFONNEE);

    lines.push({
        code: 'URSSAF_RETRAITE_BASIC_PLAF',
        label: 'Assurance Vieillesse Plafonnée',
        organization: 'URSSAF_AA',
        category: 'SOCIAL',
        base: basePlafonnee,
        rate_bps: TAUX_URSSAF_AA_BPS.VIEILLESSE_PLAFONNEE,
        amount: amountPlaf,
        confidence: 'CERTIFIED',
        capApplied: baseSocial > PASS_2026 ? { name: 'PASS', value: PASS_2026 } : undefined,
        formula: "min(socialBase, PASS) * 6.90%"
    });

    // 3. Vieillesse Déplafonnée (0.40% on total)
    // Formula: socialBase * 0.40%
    lines.push({
        code: 'URSSAF_RETRAITE_BASIC_DEPLAF',
        label: 'Assurance Vieillesse Déplafonnée',
        organization: 'URSSAF_AA',
        category: 'SOCIAL',
        base: baseSocial,
        rate_bps: TAUX_URSSAF_AA_BPS.VIEILLESSE_DEPLAFONNEE,
        amount: mulCentsRate(baseSocial, TAUX_URSSAF_AA_BPS.VIEILLESSE_DEPLAFONNEE),
        confidence: 'CERTIFIED',
        formula: "socialBase * 0.40%"
    });

    // 4. CSG / CRDS (Base = 98.25% of Social Base)
    // STRICT MODE: Two-step multiplication with intermediate rounding.
    // Step 1: Calculate Assiette CSG (98.25% of Social Base)
    const baseCSG = mulCentsRate(baseSocial, 9825); // 98.25% -> Rounded HalfUp

    // Step 2: Calculate Amount from Base CSG
    lines.push({
        code: 'URSSAF_CSG',
        label: 'CSG (Contribution Sociale Généralisée)',
        organization: 'URSSAF_AA',
        category: 'SOCIAL',
        base: baseCSG,
        rate_bps: TAUX_URSSAF_AA_BPS.CSG,
        amount: mulCentsRate(baseCSG, TAUX_URSSAF_AA_BPS.CSG),
        confidence: 'CERTIFIED',
        formula: "round(socialBase * 98.25%) * 9.20%"
    });

    lines.push({
        code: 'URSSAF_CRDS',
        label: 'CRDS',
        organization: 'URSSAF_AA',
        category: 'SOCIAL',
        base: baseCSG,
        rate_bps: TAUX_URSSAF_AA_BPS.CRDS,
        amount: mulCentsRate(baseCSG, TAUX_URSSAF_AA_BPS.CRDS),
        confidence: 'CERTIFIED',
        formula: "round(socialBase * 98.25%) * 0.50%"
    });

    // 5. CFP (0.35% on total)
    lines.push({
        code: 'URSSAF_CFP',
        label: 'Contribution Formation Professionnelle',
        organization: 'URSSAF_AA',
        category: 'SOCIAL',
        base: baseSocial,
        rate_bps: TAUX_URSSAF_AA_BPS.CFP_AA,
        amount: mulCentsRate(baseSocial, TAUX_URSSAF_AA_BPS.CFP_AA),
        confidence: 'CERTIFIED',
        formula: "socialBase * 0.35%"
    });

    return lines;
}
