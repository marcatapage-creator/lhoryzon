import { FiscalContext, FiscalLedger, QualifiedLedger, QualifiedOperation } from "../domain/types";

export function qualifyLedger(ledger: FiscalLedger, context: FiscalContext): QualifiedLedger {
    const qualifiedOps: QualifiedOperation[] = ledger.operations.map(op => {
        const isPro = op.scope === 'pro';

        let isArtistic = false;
        let isSocialCurrentYear = false;
        let isVatCollectable = false;
        let isVatDeductible = false;
        let isTaxDeductible = false;

        if (isPro) {
            // Revenue Logic
            if (op.kind === 'REVENUE') {
                if (op.category === 'REVENU_ARTISTIQUE') {
                    isArtistic = true;
                    isSocialCurrentYear = true; // Increases social base
                }
                isVatCollectable = op.amount_tva > 0;
            }

            // Artistic Expense Logic
            if (op.kind === 'EXPENSE') {
                if (op.category === 'SOCIAL' || op.category === 'FISCAL') {
                    // Tax payments don't reduce social base usually (depends on regime)
                    // But they are deductible from Fiscal Base if Reel
                    if (context.fiscalRegime === 'reel') {
                        isTaxDeductible = true;
                    }
                } else {
                    // Regular Expense
                    isVatDeductible = op.amount_tva > 0;
                    if (context.fiscalRegime === 'reel') {
                        // AUTRE (Other Expenses) are considered non-deductible by default (Safety)
                        // This handles "TVA Reliquat" or undefined "Sorties".
                        if (op.category !== 'AUTRE') {
                            isTaxDeductible = true; // Reduces Fiscal Base
                        }
                    }
                    // Does it reduce Social Base of AA?
                    // If Reel: Yes. If Micro: No (Abatement).
                    // We flag it "potentially" relevant, engines decide based on regime.
                }
            }
        }

        return {
            ...op,
            isPro,
            isArtistic,
            isSocialCurrentYear,
            isVatCollectable,
            isVatDeductible,
            isTaxDeductible
        };
    });

    return { operations: qualifiedOps };
}
