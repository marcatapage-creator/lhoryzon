import { describe, it, expect } from 'vitest';
import { computeFiscalSnapshot } from '@/core/fiscal-v2';
import { DashboardPresenter } from '@/core/fiscal-v2/presenters/DashboardPresenter';
import { Operation, FiscalContext, TreasuryAnchor } from '@/core/fiscal-v2/domain/types';

describe('Fiscal Certification Test (V2 SSOT)', () => {
    const mockContext: FiscalContext = {
        taxYear: 2026,
        now: '2026-12-31T23:59:59Z',
        userStatus: 'freelance',
        fiscalRegime: 'reel',
        vatRegime: 'reel_trimestriel',
        household: { parts: 1, children: 0 },
        options: {
            estimateMode: true,
            defaultVatRate: 2000
        }
    };

    const mockOperation: Operation = {
        id: 'test-audit-2026',
        year: 2026,
        isScenario: false,
        isArtistAuthor: false,
        cashCurrent_cents: 1000000,
        vatPaymentFrequency: 'yearly',
        vatCarryover_cents: 0,
        entries: [
            // Income: 5000€/month * 12
            {
                id: 'income-1',
                nature: 'INCOME',
                label: 'Prestation',
                amount_ttc_cents: 500000,
                date: '2026-01-01',
                scope: 'pro',
                periodicity: 'monthly',
                category: 'OTHER',
                vatRate_bps: 0
            },
            // Expense: Rent 1000€/month * 12
            {
                id: 'rent-1',
                nature: 'EXPENSE_PRO',
                label: 'Loyer Bureau',
                amount_ttc_cents: 100000,
                date: '2026-01-05',
                scope: 'pro',
                periodicity: 'monthly',
                category: 'pro',
                vatRate_bps: 2000
            }
        ],
        meta: {
            version: 3,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z'
        }
    };

    it('should match the deterministic fiscal snapshot for annual totals', () => {
        const anchor: TreasuryAnchor = { amount_cents: 1000000, monthIndex: -1 };
        const snapshot = computeFiscalSnapshot([mockOperation], mockContext, anchor);
        const presenter = new DashboardPresenter(snapshot);
        const vm = presenter.getViewModel({ type: 'year', value: '2026' });

        expect(vm.kpis.income).toBe(6000000);
        // Profit HT is not directly in kpis, but we can check balance or safeToSpend
        // In this mock: Income(60k) - Pro(12k) = 48k balance (before taxes if taxes=0)
        expect(vm.kpis.balance).toBe(4800000);

        // Snapshot integrity
        expect(snapshot.metadata.fiscalHash).toHaveLength(64); // SHA256
        expect(snapshot.metadata.computedAt).toBe(mockContext.now);
    });

    it('should verify monthly granularity', () => {
        const anchor: TreasuryAnchor = { amount_cents: 1000000, monthIndex: -1 };
        const snapshot = computeFiscalSnapshot([mockOperation], mockContext, anchor);
        const presenter = new DashboardPresenter(snapshot);

        // Jan
        const janVM = presenter.getViewModel({ type: 'month', value: 'Jan' });
        expect(janVM.kpis.income).toBe(500000);
        expect(janVM.kpis.balance).toBe(400000); // 5k - 1k
    });
});
