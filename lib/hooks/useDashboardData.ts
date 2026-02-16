import { useMemo } from 'react';
import { useComptaStore } from '@/store/comptaStore';
import { DashboardPresenter } from '@/core/fiscal-v2/presenters/DashboardPresenter';
import { TimelinePresenter, TimelineEvent } from '@/core/fiscal-v2/presenters/TimelinePresenter';
import { Operation, Month, MONTHS } from '@/core/fiscal-v2/domain/types';
import { FiscalSnapshot, LedgerFinal } from '@/core/fiscal-v2/domain/types';

export interface DashboardDataV2 {
    ledger: LedgerFinal | null;
    fiscalOutput?: FiscalSnapshot;
    filteredStats: {
        income: number;
        outflow: number;
        balance: number;
        closingTreasury: number;
        provisions: number;
        safeToSpend: number;
    };
    timelineEvents: TimelineEvent[];
    comparisonStats?: { balance: number } | null;
    nextPayment: { date: string; amount: number; label: string } | null;
    charts?: {
        expenseDistribution: { name: string, value: number, color: string }[];
        incomeDistribution: { name: string, value: number, color: string }[];
        projectionSeries: { month: string, treasury: number, safeLine: number }[];
    };
    isLoading: boolean;
    currentOp: Operation | undefined;
}

export function useDashboardData(): DashboardDataV2 {
    const { operations, selectedOperationId, snapshot, viewState, isLoading } = useComptaStore();

    const currentOp = useMemo(() =>
        operations.find(o => o.id === selectedOperationId) || operations.find(o => o.year === 2026),
        [operations, selectedOperationId]);

    const presenter = useMemo(() => snapshot ? new DashboardPresenter(snapshot) : null, [snapshot]);
    const timelinePresenter = useMemo(() => snapshot ? new TimelinePresenter(snapshot) : null, [snapshot]);

    const viewModel = useMemo(() => {
        if (!presenter) return null;

        const period = {
            type: viewState.periodType as 'year' | 'quarter' | 'month',
            value: viewState.selectedPeriod
        };
        return presenter.getViewModel(period);
    }, [presenter, viewState]);

    const filteredStats = useMemo(() => {
        if (!viewModel) return {
            income: 0, outflow: 0, balance: 0, closingTreasury: 0, provisions: 0, safeToSpend: 0
        };
        return viewModel.kpis;
    }, [viewModel]);

    const timelineEvents = useMemo(() => {
        if (!timelinePresenter) return [];
        return timelinePresenter.getEvents();
    }, [timelinePresenter]);

    const nextPayment = useMemo(() => {
        if (!viewModel?.nextDue) return null;
        return {
            date: viewModel.nextDue.date,
            amount: viewModel.nextDue.amount,
            label: viewModel.nextDue.label
        };
    }, [viewModel]);

    return {
        ledger: snapshot?.ledgerFinal || null,
        fiscalOutput: snapshot || undefined,
        filteredStats,
        timelineEvents,
        comparisonStats: null, // To be implemented with multi-year snapshots
        nextPayment,
        charts: viewModel?.charts,
        isLoading: isLoading || !snapshot,
        currentOp
    };
}
