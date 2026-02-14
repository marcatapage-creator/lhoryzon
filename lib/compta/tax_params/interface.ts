import { RateBps } from "../types";

export interface BusinessTaxParameters {
    socialRate_bps: RateBps;
    incomeTaxRate_bps: RateBps; // Average estimate for simple calculations
    isReducedRate_bps: RateBps;
    isStandardRate_bps: RateBps;
    flatTaxRate_bps: RateBps;
}
