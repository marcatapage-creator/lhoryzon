import { useMemo } from 'react';
import { useComptaStore } from '@/store/comptaStore';
import { FiscalSimulator } from '../engine/simulator';
import { PurchaseItem, UserFiscalContext, FiscalRegime } from '../types';

export const useSimulation = (purchase: Partial<PurchaseItem>) => {
    const { fiscalProfile, operations, selectedOperationId } = useComptaStore();

    const simulationResult = useMemo(() => {
        if (!fiscalProfile || !purchase.amountTTC_cents) return null;

        // Get year from current operation or default to 2024
        const currentOp = operations.find(o => o.id === selectedOperationId);
        const fiscalYear = currentOp?.year || 2024;

        // Map store fiscal status to engine regimes
        const regimeMapping: Record<string, FiscalRegime> = {
            'micro': 'MICRO_BNC',
            'ei': 'BNC_IR',
            'url_ir': 'BNC_IR',
            'sas_is': 'SASU_IS'
        };

        const context: UserFiscalContext = {
            regime: regimeMapping[fiscalProfile.status] || 'BNC_IR',
            anneeFiscale: fiscalYear,
            assujettiTVA: fiscalProfile.vatEnabled,
            situationFamiliale: 'celibataire', // Default for now
            nbEnfants: 0,
            gardeAlternee: false,
            revenuImposableFoyer_cents: 5000000 // TODO: Pull from settings (50k€ default)
        };

        const item: PurchaseItem = {
            id: 'temp',
            label: purchase.label || 'Achat',
            amountTTC_cents: purchase.amountTTC_cents as number,
            vatRate_bps: purchase.vatRate_bps || 2000,
            category: purchase.category || 'other',
            isAmortizable: purchase.isAmortizable || false,
            amortizationPeriodYears: purchase.amortizationPeriodYears || 3
        };

        return FiscalSimulator.simulate(item, context);
    }, [purchase, fiscalProfile, operations, selectedOperationId]);

    return simulationResult;
};
