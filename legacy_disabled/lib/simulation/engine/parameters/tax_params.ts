import { TaxParameters } from "../../types";

export const TAX_PARAMETERS: Record<number, TaxParameters> = {
    2024: {
        irBrackets: [
            { limit_cents: 1129400, rate_bps: 0 },
            { limit_cents: 2879700, rate_bps: 1100 },
            { limit_cents: 8234100, rate_bps: 3000 },
            { limit_cents: 17710600, rate_bps: 4100 },
            { limit_cents: null, rate_bps: 4500 },
        ],
        qfCeilingPerHalfPart_cents: 175900,
        decote: {
            baseCelibataire_cents: 87300,
            baseCouple_cents: 144400,
            thresholdCelibataire_cents: 192900,
            thresholdCouple_cents: 319100,
            coeff_bps: 4500,
        },
        isRates: {
            reduced_bps: 1500,
            reducedLimit_cents: 4250000,
            standard_bps: 2500,
        },
    },
    2025: {
        irBrackets: [
            { limit_cents: 1152000, rate_bps: 0 },
            { limit_cents: 2937300, rate_bps: 1100 },
            { limit_cents: 8398800, rate_bps: 3000 },
            { limit_cents: 18064800, rate_bps: 4100 },
            { limit_cents: null, rate_bps: 4500 },
        ],
        qfCeilingPerHalfPart_cents: 179400,
        decote: {
            baseCelibataire_cents: 89000,
            baseCouple_cents: 147300,
            thresholdCelibataire_cents: 196800,
            thresholdCouple_cents: 325500,
            coeff_bps: 4500,
        },
        isRates: {
            reduced_bps: 1500,
            reducedLimit_cents: 4250000,
            standard_bps: 2500,
        },
    },
};

export const getTaxParams = (year: number): TaxParameters => {
    return TAX_PARAMETERS[year] || TAX_PARAMETERS[2024];
};
