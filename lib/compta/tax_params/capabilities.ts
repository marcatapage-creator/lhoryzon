import { RegimeCapability } from "../types";

export const REGIME_CAPABILITIES: Record<string, RegimeCapability> = {
    micro: {
        hasVat: true,
        hasSocial: true,
        hasIncomeTax: true,
        hasIs: false,
        isCompany: false
    },
    ei: {
        hasVat: true,
        hasSocial: true,
        hasIncomeTax: true,
        hasIs: false,
        isCompany: false
    },
    url_ir: {
        hasVat: true,
        hasSocial: true,
        hasIncomeTax: true,
        hasIs: false,
        isCompany: false
    },
    sas_is: {
        hasVat: true,
        hasSocial: false, // Social handled via salary/dividends in IS
        hasIncomeTax: false, // Income tax at individual level
        hasIs: true,
        isCompany: true
    }
};

export const getRegimeCapabilities = (status: string): RegimeCapability => {
    return REGIME_CAPABILITIES[status] || REGIME_CAPABILITIES['micro'];
};
