import {
    SimulationInput,
    RevenueResult,
    ChargeResult,
    SocialResult,
    TaxResult,
    VatResult,
    ForecastResult
} from "./index";

export interface FiscalProfile {
    label: string;
    code: 'MICRO_BNC' | 'MICRO_BIC' | 'EI_REEL' | 'EURL_IS' | 'SASU_IS';

    // Core methods
    computeRevenue(data: SimulationInput): RevenueResult;
    computeCharges(data: SimulationInput): ChargeResult;
    computeSocial(data: SimulationInput, revenue: RevenueResult): SocialResult;
    computeTax(data: SimulationInput, revenue: RevenueResult, social: SocialResult): TaxResult;
    computeVat(data: SimulationInput): VatResult;

    // Aggregation
    computeForecast(
        data: SimulationInput,
        revenue: RevenueResult,
        social: SocialResult,
        tax: TaxResult,
        vat: VatResult
    ): ForecastResult;
}
