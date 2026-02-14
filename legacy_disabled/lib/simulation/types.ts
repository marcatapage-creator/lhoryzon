import { MoneyCents, RateBps } from "../compta/types";

export type FiscalRegime = "BNC_IR" | "MICRO_BNC" | "SASU_IS" | "EI_IS";
export type FamilySituation = "celibataire" | "couple" | "parent_isole";

export interface UserFiscalContext {
    regime: FiscalRegime;
    anneeFiscale: number;
    situationFamiliale: FamilySituation;
    nbEnfants: number;
    gardeAlternee: boolean;
    revenuImposableFoyer_cents: MoneyCents; // Revenu net imposable hors activité freelance (ou total estimé)
    assujettiTVA: boolean;
    tauxCotisations_bps?: RateBps;
    tauxIS_bps?: RateBps;
}

export interface PurchaseItem {
    id: string;
    label: string;
    amountTTC_cents: MoneyCents;
    vatRate_bps: RateBps;
    isAmortizable: boolean;
    amortizationPeriodYears: number;
    category: "hardware" | "software" | "vehicle" | "service" | "other";
}

export interface CalculationTrace {
    step: string;
    value: MoneyCents | string;
    description: string;
}

export interface SimulationResult {
    sortieImmediate_cents: MoneyCents;
    tvaRecuperee_cents: MoneyCents;
    economieIR_cents: MoneyCents;
    economieIS_cents: MoneyCents;
    economieCotisations_cents: MoneyCents;
    coutReel_cents: MoneyCents;
    messagesPedagogiques: string[];
    traceCalcul: CalculationTrace[];
}

export interface TaxBracket {
    limit_cents: MoneyCents | null; // null for the last bracket
    rate_bps: RateBps;
}

export interface TaxParameters {
    irBrackets: TaxBracket[];
    qfCeilingPerHalfPart_cents: MoneyCents;
    decote: {
        baseCelibataire_cents: MoneyCents;
        baseCouple_cents: MoneyCents;
        thresholdCelibataire_cents: MoneyCents;
        thresholdCouple_cents: MoneyCents;
        coeff_bps: RateBps;
    };
    isRates: {
        reduced_bps: RateBps;
        reducedLimit_cents: MoneyCents;
        standard_bps: RateBps;
    };
}
