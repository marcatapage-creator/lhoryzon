import { PurchaseItem, UserFiscalContext, SimulationResult, CalculationTrace } from "../../types";
import { IREngine } from "../core/ir_engine";
import { getTaxParams } from "../parameters/tax_params";
import { mulRate, splitVat } from "../../../compta/money";

export class BNCRegime {
    private irEngine: IREngine;
    private trace: CalculationTrace[] = [];

    constructor(context: UserFiscalContext) {
        this.irEngine = new IREngine(getTaxParams(context.anneeFiscale));
    }

    public simulate(purchase: PurchaseItem, context: UserFiscalContext): SimulationResult {
        this.trace = [];
        const messages: string[] = [];

        // 1. TVA
        const { vat_cents } = splitVat(purchase.amountTTC_cents, purchase.vatRate_bps);
        const tvaRecuperee_cents = context.assujettiTVA ? vat_cents : 0;
        const amountHT_cents = purchase.amountTTC_cents - tvaRecuperee_cents;

        this.trace.push({
            step: "Traitement TVA",
            value: tvaRecuperee_cents,
            description: context.assujettiTVA ? `Récupération de la TVA à ${purchase.vatRate_bps / 100}%.` : "Non assujetti : la TVA est une charge."
        });

        // 2. Économie de cotisations sociales
        const tauxSocial_bps = context.tauxCotisations_bps || 3500; // Moyenne BNC: 35%
        const economieCotisations_cents = mulRate(amountHT_cents, tauxSocial_bps);
        this.trace.push({
            step: "Économie Socialale",
            value: Math.round(economieCotisations_cents),
            description: `Réduction des cotisations (estimée à ${tauxSocial_bps / 100}%).`
        });

        // 3. Économie d'Impôt sur le Revenu
        const revenuInitial_cents = context.revenuImposableFoyer_cents;

        const { tax_cents: taxInitial_cents } = this.irEngine.calculateTax(revenuInitial_cents, context);
        const { tax_cents: taxFinal_cents, trace: irTrace } = this.irEngine.calculateTax(revenuInitial_cents - amountHT_cents, context);

        const economieIR_cents = Math.max(0, taxInitial_cents - taxFinal_cents);
        this.trace.push(...irTrace.map(t => ({ ...t, step: `IR: ${t.step}` })));
        this.trace.push({
            step: "Économie IR",
            value: Math.round(economieIR_cents),
            description: "Différence d'impôt calculée par le barème progressif."
        });

        // 4. Coût Réel
        const coutReel_cents = purchase.amountTTC_cents - tvaRecuperee_cents - economieCotisations_cents - economieIR_cents;

        return {
            sortieImmediate_cents: purchase.amountTTC_cents,
            tvaRecuperee_cents,
            economieIR_cents: Math.round(economieIR_cents),
            economieIS_cents: 0,
            economieCotisations_cents: Math.round(economieCotisations_cents),
            coutReel_cents: Math.max(0, Math.round(coutReel_cents)),
            messagesPedagogiques: messages,
            traceCalcul: this.trace
        };
    }
}
