import { ComputedBases, FiscalContext, QualifiedLedger } from "@/core/fiscal-v2/domain/types";
import { MICRO_BNC_ABATTEMENT_MIN_2026 } from "../common/params";
import { MICRO_BNC_ABATTEMENT_BPS } from "./params";
import { sumCents, diffCents, mulCentsRate } from "@/core/fiscal-v2/engine/money";

export function computeBases(ledger: QualifiedLedger, context: FiscalContext): ComputedBases {
    let socialBaseTotal = 0;
    let socialBaseArtistic = 0;
    let socialBaseOther = 0;

    let fiscalNetTaxable = 0;
    let fiscalRevenue = 0; // Total CA HT (Eligible)
    let fiscalDeductible = 0;

    let vatCollected = 0;
    let vatDeductible = 0;

    const vatByPeriod: Record<string, { collected: number, deductible: number, balance: number }> = {};

    // 1. Accumulate from Qualified Ledger
    for (const op of ledger.operations) {
        if (!op.isPro) continue;

        const periodKey = op.date.substring(0, 7);
        if (!vatByPeriod[periodKey]) vatByPeriod[periodKey] = { collected: 0, deductible: 0, balance: 0 };

        if (op.direction === 'in') {
            // Revenue
            if (op.kind === 'REVENUE') {
                fiscalRevenue = sumCents([fiscalRevenue, op.amount_ht]);

                // For AA, differentiation is mainly for reporting, but base calculation is usually global on BNC.
                // We track artistic specifically if needed.
                if (op.isArtistic) {
                    // It counts towards BNC Revenue
                }

                if (op.isVatCollectable) {
                    vatCollected = sumCents([vatCollected, op.amount_tva]);
                    vatByPeriod[periodKey].collected += op.amount_tva;
                }
            }
        } else {
            // Expense
            if (op.kind === 'EXPENSE') {
                if (op.isTaxDeductible) {
                    fiscalDeductible = sumCents([fiscalDeductible, op.amount_ht]);
                }

                if (op.isVatDeductible) {
                    vatDeductible = sumCents([vatDeductible, op.amount_tva]);
                    vatByPeriod[periodKey].deductible += op.amount_tva;
                }
            }
        }

        vatByPeriod[periodKey].balance = vatByPeriod[periodKey].collected - vatByPeriod[periodKey].deductible;
    }

    // 2. Compute Social Base (AA Specific)
    let bnc = 0;

    if (context.fiscalRegime === 'micro') {
        // Micro-BNC Logic:
        // Abatement = MAX(Revenue * 34%, 305€)
        const calculatedAbatement = mulCentsRate(fiscalRevenue, MICRO_BNC_ABATTEMENT_BPS);
        const effectiveAbatement = Math.max(calculatedAbatement, MICRO_BNC_ABATTEMENT_MIN_2026);

        // Cannot be negative
        bnc = Math.max(0, diffCents(fiscalRevenue, effectiveAbatement));

        // AA Rule: Base Sociale = BNC Majore (+15%)
        socialBaseTotal = mulCentsRate(bnc, 11500);

    } else {
        // Reel
        bnc = diffCents(fiscalRevenue, fiscalDeductible);
        bnc = Math.max(0, bnc);

        socialBaseTotal = mulCentsRate(bnc, 11500);
    }

    socialBaseArtistic = socialBaseTotal;
    socialBaseOther = 0;

    // 3. Fiscal Base
    fiscalNetTaxable = bnc;

    return {
        social: {
            total: socialBaseTotal,
            artistic: socialBaseArtistic,
            other: socialBaseOther
        },
        fiscal: {
            totalNetTaxable: fiscalNetTaxable,
            revenue: fiscalRevenue,
            deductibleExpenses: fiscalDeductible
        },
        vat: {
            collected: vatCollected,
            deductible: vatDeductible,
            balance: diffCents(vatCollected, vatDeductible),
            byPeriod: vatByPeriod
        }
    };
}
