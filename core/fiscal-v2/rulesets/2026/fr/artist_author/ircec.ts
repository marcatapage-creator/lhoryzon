import { ComputedBases, FiscalContext, TaxLineItem } from "@/core/fiscal-v2/domain/types";
import { TAUX_RAAP_BPS } from "./params";
import { SEUIL_RAAP_2026, PASS_2026 } from "../common/params";
import { mulCentsRate } from "@/core/fiscal-v2/engine/money";

export function computeIrcec(bases: ComputedBases, context: FiscalContext): TaxLineItem[] {
    const lines: TaxLineItem[] = [];
    const base = bases.social.total;

    // Check Threshold (Seuil d'affiliation)
    if (base < SEUIL_RAAP_2026) {
        return [];
    }

    // Check Ceiling (3x PASS)
    const PLAFOND_RAAP_2026 = PASS_2026 * 3;
    const cappedBase = Math.min(base, PLAFOND_RAAP_2026);

    const amount = mulCentsRate(cappedBase, TAUX_RAAP_BPS);

    lines.push({
        code: 'IRCEC_RAAP',
        label: 'Retraite Complémentaire (RAAP)',
        organization: 'IRCEC',
        category: 'SOCIAL',
        base: cappedBase,
        rate_bps: TAUX_RAAP_BPS,
        amount: amount,
        confidence: 'CERTIFIED',
        metadata: {
            threshold: SEUIL_RAAP_2026,
            ceiling: PLAFOND_RAAP_2026,
            isLiable: true
        },
        capApplied: base > PLAFOND_RAAP_2026 ? { name: '3xPASS', value: PLAFOND_RAAP_2026 } : undefined
    });

    return lines;
}
