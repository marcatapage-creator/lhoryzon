import { PurchaseItem, UserFiscalContext, SimulationResult, CalculationTrace } from "../../types";
import { mulRate, splitVat } from "../../../compta/money";

export class SASURegime {
    public simulate(purchase: PurchaseItem, context: UserFiscalContext): SimulationResult {
        const traceCalcul: CalculationTrace[] = [];

        // 1. TVA
        const { vat_cents } = splitVat(purchase.amountTTC_cents, purchase.vatRate_bps);
        const tvaRecuperee_cents = context.assujettiTVA ? vat_cents : 0;
        const amountHT_cents = purchase.amountTTC_cents - tvaRecuperee_cents;

        traceCalcul.push({ step: "TVA", value: tvaRecuperee_cents, description: "TVA récupérable sur compte pro." });

        // 2. Économie IS
        const tauxIS_bps = 1500; // Tranche réduite: 15%
        const economieIS_cents = mulRate(amountHT_cents, tauxIS_bps);
        traceCalcul.push({ step: "IS", value: Math.round(economieIS_cents), description: `Économie d'IS (15% de ${Math.round(amountHT_cents / 100)}€).` });

        // 3. Économie Flat Tax (Dividendes)
        const manqueAGagnerDividendes_cents = amountHT_cents - economieIS_cents;
        const economieFlatTax_cents = mulRate(Math.round(manqueAGagnerDividendes_cents), 3000); // 30% flat tax
        traceCalcul.push({ step: "Flat Tax", value: Math.round(economieFlatTax_cents), description: "Économie de Flat Tax sur les dividendes non versés." });

        const totalEconomies_cents = tvaRecuperee_cents + economieIS_cents + economieFlatTax_cents;
        const coutReel_cents = purchase.amountTTC_cents - totalEconomies_cents;

        return {
            sortieImmediate_cents: purchase.amountTTC_cents,
            tvaRecuperee_cents,
            economieIR_cents: 0,
            economieIS_cents: Math.round(economieIS_cents),
            economieCotisations_cents: 0,
            coutReel_cents: Math.round(coutReel_cents),
            messagesPedagogiques: [
                "En SASU à l'IS, votre achat est payé par la société.",
                "Vous récupérez la TVA (si assujetti) et réduisez votre IS.",
                "L'économie réelle inclut aussi la Flat Tax que vous n'aurez pas à payer sur ces sommes."
            ],
            traceCalcul
        };
    }
}
