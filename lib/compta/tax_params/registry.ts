import { BusinessTaxParameters } from "./interface";
import { PARAMS_2024 } from "./2024";
import { PARAMS_2025 } from "./2025";

export const BUSINESS_TAX_PARAMETERS: Record<number, Record<string, BusinessTaxParameters>> = {
    2024: PARAMS_2024,
    2025: PARAMS_2025,
};

export const getBusinessParams = (year: number, status: string): BusinessTaxParameters => {
    const yearParams = BUSINESS_TAX_PARAMETERS[year] || BUSINESS_TAX_PARAMETERS[2024];

    // Map URL_IR/EI to BNC logic for simple params
    const normalizedStatus = status === 'url_ir' || status === 'ei' ? 'bnc' : status;

    return yearParams[normalizedStatus] || yearParams['bnc'];
};

export * from "./interface";
