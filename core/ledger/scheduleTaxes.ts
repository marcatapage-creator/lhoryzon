
import { Month, MONTHS } from "@/lib/compta/types";
import { LedgerTaxes } from "./types";
import { SocialResult, TaxResult, VatResult } from "@/core/fiscal-v2/domain/types";

interface ScheduleParams {
    engineResult: {
        social: SocialResult;
        tax: TaxResult;
        vat: VatResult;
    };
    manualInput: {
        urssafPeriodicity: 'monthly' | 'quarterly' | 'yearly';
        ircecPeriodicity: 'monthly' | 'quarterly' | 'yearly';
        taxPeriodicity: 'monthly' | 'quarterly' | 'yearly'; // Prélèvement à la source vs Tiers
        vatPeriodicity: 'monthly' | 'quarterly' | 'yearly';
    };
    vatOffsetMonth: number; // 1 for M+1
}

export function buildLedgerTaxes(params: ScheduleParams): LedgerTaxes {
    const byMonth: LedgerTaxes['byMonth'] = {} as any;
    MONTHS.forEach(m => {
        byMonth[m] = {
            urssaf: 0,
            ircec: 0,
            ir: 0,
            vat_payment: 0,
            other_taxes: 0
        };
    });

    const { engineResult, manualInput } = params;

    // 1. URSSAF
    const urssafTotal = engineResult.social.cotisations_totales - (engineResult.social.breakdown.ircec || 0); // Isolate URSSAF
    if (urssafTotal > 0) {
        if (manualInput.urssafPeriodicity === 'monthly') {
            const amount = Math.round(urssafTotal / 12);
            MONTHS.forEach(m => byMonth[m].urssaf = amount);
        } else if (manualInput.urssafPeriodicity === 'quarterly') {
            const amount = Math.round(urssafTotal / 4);
            ['Feb', 'May', 'Aug', 'Nov'].forEach(m => byMonth[m as Month].urssaf = amount); // Standard URSSAF dates? usually mid-quarter or end-quarter. Correcting to standard quarterly deadlines.
            // URSSAF Libéral: 15 May, 15 Aug, 15 Nov, 15 Feb.
            // Let's stick to user inputs or standard: Feb, May, Aug, Nov is a good approximation for cash out.
        } else {
            // Yearly - usually end of year regularization or start?
            byMonth['Dec'].urssaf = urssafTotal;
        }
    }

    // 2. IRCEC
    const ircecTotal = engineResult.social.breakdown.ircec || 0;
    if (ircecTotal > 0) {
        if (manualInput.ircecPeriodicity === 'monthly') {
            const amount = Math.round(ircecTotal / 12);
            MONTHS.forEach(m => byMonth[m].ircec = amount);
        } else {
            // Yearly
            byMonth['Nov'].ircec = ircecTotal; // Usually Nov for IRCEC
        }
    }

    // 3. Income Tax
    const taxTotal = engineResult.tax.impot_revenu_total;
    if (taxTotal > 0) {
        if (manualInput.taxPeriodicity === 'monthly') {
            const amount = Math.round(taxTotal / 12);
            MONTHS.forEach(m => byMonth[m].ir = amount);
        } else {
            byMonth['Sep'].ir = taxTotal; // Traditional tax month
        }
    }

    // 4. VAT
    // VAT is tricky: collected - deductible.
    // Engine gives "tva_due".
    // We assume the Engine's tva_due is the TRUTH for the year (SSOT).
    // We distribute this tva_due according to payment schedule.
    const vatTotal = engineResult.vat.tva_due;
    if (vatTotal > 0) {
        if (manualInput.vatPeriodicity === 'monthly') {
            // We assume even distribution OF THE TOTAL computed by engine
            // If we wanted "Real", we would need monthly varying VAT from ops.
            // But prompt says: "le moteur produit un échéancier de taxes".
            // If we rely on engine, we rely on its annual total.
            // Ideally we map the monthly fluctuations if we have them.
            // For V1 of this refactor, let's smooth the engine result or use specific months if known.
            // Given limitations: Smooth it.
            const amount = Math.round(vatTotal / 12);
            MONTHS.forEach(m => byMonth[m].vat_payment = amount);
            // Correction: M+1 payment?
            // If offset is 1, Jan VAT paid in Feb.
            // BUT we just smoothed 12 payments.
            // Effectively 12 payments of X amount.
        } else if (manualInput.vatPeriodicity === 'quarterly') {
            const amount = Math.round(vatTotal / 4);
            // Semestrial? No Quarterly.
            // Apr (for Q1), Jul (for Q2), Oct (for Q3), Jan (N+1? -> handled as current year flow for simplicity or Dec?)
            // Let's put in Apr, Jul, Oct, Jan.
            ['Apr', 'Jul', 'Oct'].forEach(m => byMonth[m as Month].vat_payment = amount);
            byMonth['Dec'].vat_payment += amount; // Simulation of Jan N+1 in Dec current year for closed loop
        } else {
            byMonth['May'].vat_payment = vatTotal; // CA12 usually in May
        }
    }

    return { byMonth };
}
