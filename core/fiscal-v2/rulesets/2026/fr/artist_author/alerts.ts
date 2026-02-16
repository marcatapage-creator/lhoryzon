import { ComputedBases, FiscalAlert, FiscalContext, TaxLineItem } from "@/core/fiscal-v2/domain/types";
import { PASS_2026, SEUIL_RAAP_2026 } from "../common/params";

export function computeAlerts(bases: ComputedBases, taxes: TaxLineItem[], context: FiscalContext): FiscalAlert[] {
    const alerts: FiscalAlert[] = [];
    const socialBase = bases.social.total;

    // 1. PASS Threshold
    if (socialBase > PASS_2026) {
        alerts.push({
            code: 'ALERT_PASS_CAP',
            severity: 'INFO',
            message: `Votre assiette sociale (${(socialBase / 100).toFixed(0)}€) dépasse le PASS.`,
            thresholdValue: PASS_2026,
            triggerValue: socialBase
        });
    }

    // 2. 4 PASS Threshold (CSG Logic)
    const FOUR_PASS = PASS_2026 * 4;
    if (socialBase > FOUR_PASS) {
        if (context.options?.featureFlags?.CSG_ABOVE_4PASS_SIMPLIFIED) {
            alerts.push({
                code: 'ALERT_CSG_APPROXIMATION',
                severity: 'WARNING',
                message: `Assiette > 4 PASS (${(FOUR_PASS / 100).toFixed(0)}€). Le calcul CSG/CRDS est simplifié (98.25% appliqué uniformément). Vérifier règles spécifiques.`,
                thresholdValue: FOUR_PASS,
                triggerValue: socialBase
            });
        }
    }

    // 3. RAAP Threshold
    if (socialBase > SEUIL_RAAP_2026) {
        alerts.push({
            code: 'ALERT_RAAP_LIABILITY',
            severity: 'WARNING',
            message: `Vous dépassez le seuil RAAP (${(SEUIL_RAAP_2026 / 100).toFixed(0)}€). Cotisation due.`,
            thresholdValue: SEUIL_RAAP_2026,
            triggerValue: socialBase
        });
    }

    return alerts;
}
