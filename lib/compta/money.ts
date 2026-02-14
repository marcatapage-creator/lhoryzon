import { MoneyCents, RateBps } from "./types";

/**
 * Financial calculation utility to avoid floating point errors.
 * All internal math should be done in cents (integers) or BPS.
 */

export const toCents = (amount: number): MoneyCents => {
    return Math.round(amount * 100);
};

export const fromCents = (cents: MoneyCents): number => {
    return cents / 100;
};

/**
 * Basis Points (BPS) helpers
 * 1% = 100 bps
 * 20% = 2000 bps
 */
export const mulRate = (amount_cents: MoneyCents, rate_bps: RateBps): MoneyCents => {
    // (Amount * BPS) / 10000
    // We use Math.round to handle the final division to the nearest cent
    return Math.round((amount_cents * rate_bps) / 10000);
};

export const splitVat = (amount_ttc_cents: MoneyCents, vatRate_bps: RateBps): { net_cents: MoneyCents; vat_cents: MoneyCents } => {
    // Formula: HT = TTC / (1 + Rate)
    // In BPS: HT = TTC * 10000 / (10000 + RateBps)
    const net_cents = Math.round((amount_ttc_cents * 10000) / (10000 + vatRate_bps));
    const vat_cents = amount_ttc_cents - net_cents;
    return { net_cents, vat_cents };
};

export const formatMoney = (amount_cents: MoneyCents): string => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(fromCents(amount_cents));
};

export const money = {
    add: (...vals_cents: MoneyCents[]) => vals_cents.reduce((acc, v) => acc + v, 0),
    subtract: (a_cents: MoneyCents, b_cents: MoneyCents) => a_cents - b_cents,
    multiply: (a_cents: MoneyCents, factor: number) => Math.round(a_cents * factor),
    divide: (a_cents: MoneyCents, divisor: number) => Math.round(a_cents / divisor),
};

/**
 * Deterministic stringify with recursive key sorting
 */
export const stableStringify = (obj: any): string => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map(stableStringify).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
};

/**
 * Generates a stable deterministic hash for a parameters object.
 * Used for audit trail and detecting changes in fiscal rules.
 */
export const calculateParamsHash = (params: any): string => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const str = stableStringify(params);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};
