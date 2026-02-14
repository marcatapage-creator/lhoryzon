import { UserFiscalContext, TaxParameters, CalculationTrace } from "../../types";
import { mulRate } from "../../../compta/money";

export class IREngine {
    private params: TaxParameters;
    private trace: CalculationTrace[] = [];

    constructor(params: TaxParameters) {
        this.params = params;
    }

    public calculateTax(revenuImposable_cents: number, context: UserFiscalContext): { tax_cents: number; trace: CalculationTrace[] } {
        this.trace = [];

        // 1. Calcul du nombre de parts (Quotient Familial)
        const parts = this.calculateParts(context);
        this.trace.push({ step: "Nombre de parts", value: parts.toString(), description: `Situation: ${context.situationFamiliale}, Enfants: ${context.nbEnfants}` });

        // 2. Calcul de l'impôt brut avec QF
        // parts can be 1.5, so we use floats for divisor here, but the result will be cents
        const taxWithQF_cents = this.applyRateScale(revenuImposable_cents / parts) * parts;

        // 3. Calcul de l'impôt sans QF (pour plafonnement) - parts de base (1 ou 2)
        const baseParts = context.situationFamiliale === "celibataire" ? 1 : 2;
        const taxWithoutQF_cents = this.applyRateScale(revenuImposable_cents / baseParts) * baseParts;

        // 4. Plafonnement du quotient familial
        const advantage_cents = taxWithoutQF_cents - taxWithQF_cents;
        const additionalParts = parts - baseParts;
        const ceiling_cents = additionalParts * 2 * this.params.qfCeilingPerHalfPart_cents;

        let finalTax_cents = taxWithQF_cents;
        if (advantage_cents > ceiling_cents) {
            finalTax_cents = taxWithoutQF_cents - ceiling_cents;
            this.trace.push({
                step: "Plafonnement QF",
                value: Math.round(ceiling_cents),
                description: `L'avantage QF (${Math.round(advantage_cents / 100)}€) dépassant le plafond (${Math.round(ceiling_cents / 100)}€), l'impôt est recalculé.`
            });
        }

        // 5. Application de la décote
        finalTax_cents = this.applyDecote(finalTax_cents, context);

        this.trace.push({ step: "Impôt final", value: Math.round(finalTax_cents), description: "Impôt sur le revenu net après décote et plafonnement." });

        return { tax_cents: Math.max(0, Math.round(finalTax_cents)), trace: this.trace };
    }

    private calculateParts(context: UserFiscalContext): number {
        let parts = 0;

        // Base
        if (context.situationFamiliale === "celibataire") parts = 1;
        else if (context.situationFamiliale === "couple") parts = 2;
        else if (context.situationFamiliale === "parent_isole") parts = 1.5;

        // Enfants
        if (context.nbEnfants > 0) {
            let childrenParts = 0;
            for (let i = 1; i <= context.nbEnfants; i++) {
                let partVal = 0;
                if (i <= 2) partVal = 0.5;
                else partVal = 1;

                if (context.gardeAlternee) partVal /= 2;
                childrenParts += partVal;
            }
            parts += childrenParts;
        }

        return parts;
    }

    private applyRateScale(taxableIncomePerPart_cents: number): number {
        let tax_cents = 0;
        let lowerLimit_cents = 0;

        for (const bracket of this.params.irBrackets) {
            const upperLimit_cents = bracket.limit_cents;
            if (upperLimit_cents === null || taxableIncomePerPart_cents > upperLimit_cents) {
                // Full bracket
                const range_cents = upperLimit_cents === null ? taxableIncomePerPart_cents - lowerLimit_cents : upperLimit_cents - lowerLimit_cents;
                tax_cents += mulRate(Math.round(range_cents), bracket.rate_bps);
                if (upperLimit_cents === null) break;
                lowerLimit_cents = upperLimit_cents;
            } else {
                // Partial bracket
                tax_cents += mulRate(Math.round(taxableIncomePerPart_cents - lowerLimit_cents), bracket.rate_bps);
                break;
            }
        }

        return tax_cents;
    }

    private applyDecote(tax_cents: number, context: UserFiscalContext): number {
        const isSolo = context.situationFamiliale !== "couple";
        const base_cents = isSolo ? this.params.decote.baseCelibataire_cents : this.params.decote.baseCouple_cents;
        const threshold_cents = isSolo ? this.params.decote.thresholdCelibataire_cents : this.params.decote.thresholdCouple_cents;

        if (tax_cents < threshold_cents) {
            const decote_cents = base_cents - mulRate(Math.round(tax_cents), this.params.decote.coeff_bps);
            const finalTax_cents = tax_cents - decote_cents;
            this.trace.push({ step: "Décote", value: Math.round(decote_cents), description: "Réduction d'impôt pour revenus modestes." });
            return Math.max(0, finalTax_cents);
        }

        return tax_cents;
    }
}
