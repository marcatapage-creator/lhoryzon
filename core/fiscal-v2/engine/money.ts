import { MoneyCents, RateBps } from "../domain/types";

// --- Money Helpers ---

export function assertCentsInteger(amount: number, context: string): void {
    if (!Number.isInteger(amount)) {
        throw new Error(`[Money] Amount must be an integer (cents). Got ${amount} at ${context}`);
    }
}

export function assertRateBpsInteger(rate: number, context: string): void {
    if (!Number.isInteger(rate)) {
        throw new Error(`[Rate] Rate must be an integer (basis points). Got ${rate} at ${context}`);
    }
}

/**
 * Multiplies a base amount (Cents) by a rate (Basis Points) and rounds to nearest integer.
 * Rounding Strategy: Math.round() (Round Half Up equiv in JS mostly, good enough for V1)
 * Formula: (Base * Rate) / 10000
 */
export function mulCentsRate(base: MoneyCents, rate: RateBps): MoneyCents {
    assertCentsInteger(base, "mulCentsRate base");
    assertRateBpsInteger(rate, "mulCentsRate rate");

    // Check for safe integer limits if needed (2^53 is huge for cents, likely safe)
    return Math.round((base * rate) / 10000);
}

export function sumCents(amounts: MoneyCents[]): MoneyCents {
    return amounts.reduce((a, b) => a + b, 0);
}

export function diffCents(a: MoneyCents, b: MoneyCents): MoneyCents {
    return a - b;
}
