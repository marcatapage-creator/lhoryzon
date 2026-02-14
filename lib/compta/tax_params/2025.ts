import { BusinessTaxParameters } from "./interface";

export const PARAMS_2025: Record<string, BusinessTaxParameters> = {
    micro: {
        socialRate_bps: 2200,
        incomeTaxRate_bps: 220,
        isReducedRate_bps: 0,
        isStandardRate_bps: 0,
        flatTaxRate_bps: 0
    },
    bnc: {
        socialRate_bps: 3500,
        incomeTaxRate_bps: 1000,
        isReducedRate_bps: 0,
        isStandardRate_bps: 0,
        flatTaxRate_bps: 0
    },
    sas_is: {
        socialRate_bps: 0,
        incomeTaxRate_bps: 0,
        isReducedRate_bps: 1500,
        isStandardRate_bps: 2500,
        flatTaxRate_bps: 3000
    }
};
