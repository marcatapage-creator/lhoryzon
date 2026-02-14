import { BusinessTaxParameters } from "./interface";

export const PARAMS_2024: Record<string, BusinessTaxParameters> = {
    micro: {
        socialRate_bps: 2200, // 22%
        incomeTaxRate_bps: 220, // 2.2% (Versement libératoire estimate)
        isReducedRate_bps: 0,
        isStandardRate_bps: 0,
        flatTaxRate_bps: 0
    },
    bnc: {
        socialRate_bps: 3500, // 35%
        incomeTaxRate_bps: 1000, // 10% (Placeholder for net pocket estimate)
        isReducedRate_bps: 0,
        isStandardRate_bps: 0,
        flatTaxRate_bps: 0
    },
    sas_is: {
        socialRate_bps: 0,
        incomeTaxRate_bps: 0,
        isReducedRate_bps: 1500, // 15%
        isStandardRate_bps: 2500, // 25%
        flatTaxRate_bps: 3000 // 30%
    }
};
