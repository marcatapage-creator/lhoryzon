import { PurchaseItem, UserFiscalContext, SimulationResult } from "../../types";
import { splitVat } from "../../../compta/money";

export class MicroBNCRegime {
    public simulate(purchase: PurchaseItem, context: UserFiscalContext): SimulationResult {
        const { vat_cents } = splitVat(purchase.amountTTC_cents, purchase.vatRate_bps);
        const tvaRecuperee_cents = context.assujettiTVA ? vat_cents : 0;

        const messages = [
            "Attention : En régime Micro, vos dépenses réelles ne sont pas déductibles de votre bénéfice.",
            "L'État applique un abattement forfaitaire (34% en BNC) qui couvre vos frais, quel que soit leur montant réel.",
            "Votre achat n'aura aucun impact sur votre impôt ou vos cotisations."
        ];

        if (!context.assujettiTVA) {
            messages.push("Vous n'êtes pas assujetti à la TVA : vous ne pouvez pas récupérer les 20%.");
        }

        return {
            sortieImmediate_cents: purchase.amountTTC_cents,
            tvaRecuperee_cents,
            economieIR_cents: 0,
            economieIS_cents: 0,
            economieCotisations_cents: 0,
            coutReel_cents: purchase.amountTTC_cents - tvaRecuperee_cents,
            messagesPedagogiques: messages,
            traceCalcul: [
                { step: "TVA", value: tvaRecuperee_cents, description: "Seuil de franchise en base ou option TVA." },
                { step: "Déductibilité", value: 0, description: "Régime forfaitaire : pas de déduction des frais réels." }
            ]
        };
    }
}
