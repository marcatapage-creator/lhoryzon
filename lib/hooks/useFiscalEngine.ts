import { useMemo } from 'react';
import { useComptaStore } from '@/store/comptaStore';
import { computeFiscalSnapshot } from '@/core/fiscal-v2';
import { SimulatorPresenter } from '@/core/fiscal-v2/presenters/SimulatorPresenter';
import { FiscalContext, TreasuryAnchor, AppEntry } from '@/core/fiscal-v2/domain/types';

export function useFiscalEngine(simulationParams?: {
    additionalExpense?: { amount_ttc: number, vat_rate: number, is_deductible: boolean },
    socialMode?: 'approx' | 'iteratif'
}) {
    const { fiscalProfile, operations, selectedOperationId, snapshot: storeSnapshot } = useComptaStore();

    const currentOp = useMemo(() =>
        operations.find(o => o.id === selectedOperationId) || operations.find(o => o.year === 2026),
        [operations, selectedOperationId]);

    const comparison = useMemo(() => {
        if (!currentOp || !fiscalProfile || !storeSnapshot) return null;

        // 1. Build Base Context (Sync with Store)
        const context: FiscalContext = {
            taxYear: currentOp.year,
            now: new Date().toISOString(),
            userStatus: fiscalProfile.status.includes('sas') ? 'sasu' :
                fiscalProfile.status.includes('artist') ? 'artist_author' : 'freelance',
            fiscalRegime: fiscalProfile.status.includes('micro') ? 'micro' : 'reel',
            vatRegime: fiscalProfile.vatEnabled ? (currentOp.vatPaymentFrequency === 'monthly' ? 'reel_mensuel' : 'reel_trimestriel') : 'franchise',
            household: { parts: 1, children: 0 },
            options: {
                estimateMode: true,
                vatPaymentFrequency: currentOp.vatPaymentFrequency === 'monthly' ? 'monthly' : 'yearly',
                defaultVatRate: fiscalProfile.vatEnabled ? 2000 : 0
            }
        };

        const anchor: TreasuryAnchor = {
            amount_cents: currentOp.cashCurrent_cents || 0,
            monthIndex: currentOp.year === new Date().getFullYear() ? new Date().getMonth() : -1
        };

        // 2. Prepare Simulated Operations
        let simulatedOps = [...operations.filter(o => o.year === currentOp.year)];
        if (simulationParams?.additionalExpense) {
            const exp = simulationParams.additionalExpense;
            const tvaRate = exp.vat_rate;
            const amountTTC = exp.amount_ttc;

            // Create a virtual entry (V3)
            const virtualEntry: AppEntry = {
                id: 'sim-virtual-exp',
                nature: 'EXPENSE_PRO',
                label: 'Simulated Expense',
                amount_ttc_cents: Math.round(amountTTC),
                vatRate_bps: tvaRate,
                date: new Date().toISOString().split('T')[0],
                scope: 'pro',
                category: 'OTHER',
                periodicity: 'yearly'
            };

            simulatedOps = simulatedOps.map(op => {
                if (op.id === currentOp.id) {
                    return {
                        ...op,
                        entries: [...op.entries, virtualEntry]
                    };
                }
                return op;
            });
        }

        // 3. Run Simulated Engine
        const simulatedSnapshot = computeFiscalSnapshot(simulatedOps, context, anchor);

        // 4. Compare
        const presenter = new SimulatorPresenter();
        return presenter.getComparison(storeSnapshot, simulatedSnapshot);

    }, [currentOp, fiscalProfile, operations, storeSnapshot, simulationParams]);

    return {
        simulation: comparison,
        isLoading: !comparison
    };
}
