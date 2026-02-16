import { describe, it, expect } from 'vitest';
import { DashboardPresenter } from '../presenters/DashboardPresenter';
import { FiscalSnapshot, MONTHS } from '../domain/types';

describe('DashboardPresenter', () => {
    // Mock Snapshot with minimal needed data
    const mockDate = "2026-02-15T12:00:00.000Z";

    const mockSnapshot = {
        metadata: {
            computedAt: mockDate,
            rulesetYear: 2026
        },
        ledgerFinal: {
            byMonth: {
                Jan: { closing_treasury_cents: 100000 },
                Feb: {
                    closing_treasury_cents: 200000, // 2000€
                    provision_social_cents: 5000,
                    provision_tax_cents: 2000,
                    provision_vat_cents: 1000,
                    income_ttc_cents: 0,
                    expense_pro_ttc_cents: 0,
                    expense_perso_ttc_cents: 0,
                    expense_autre_ttc_cents: 0,
                    urssaf_cash_cents: 0,
                    ircec_cash_cents: 0,
                    ir_cash_cents: 0,
                    vat_cash_cents: 0,
                    other_taxes_cash_cents: 0,
                    net_cashflow_cents: 0
                },
                // ... populate other months minimally
                Mar: { closing_treasury_cents: 250000 }
            }
        },
        schedule: [
            // Past item (Jan)
            { id: '1', date: '2026-01-20', amount: 5000, label: 'Past Tax' },
            // Current month item (Feb 20), should NOT be subtracted from Feb Closing if using "End Month - Future" logic
            { id: '2', date: '2026-02-20', amount: 10000, label: 'Feb Tax' },
            // Future item next month (Mar 10), should be deducted (within 30d of Feb 15?)
            // Feb 15 + 30d = Mar 17. So Mar 10 IS in window.
            { id: '3', date: '2026-03-10', amount: 20000, label: 'Mar Tax' },
            // Far future item
            { id: '4', date: '2026-06-10', amount: 50000, label: 'June Tax' }
        ]
    } as unknown as FiscalSnapshot;

    // Fill missing months to avoid crashes
    MONTHS.forEach(m => {
        if (!mockSnapshot.ledgerFinal.byMonth[m]) {
            mockSnapshot.ledgerFinal.byMonth[m] = {
                closing_treasury_cents: 0,
                provision_social_cents: 0, provision_tax_cents: 0, provision_vat_cents: 0,
                income_ttc_cents: 0, expense_pro_ttc_cents: 0, expense_perso_ttc_cents: 0, expense_autre_ttc_cents: 0,
                urssaf_cash_cents: 0, ircec_cash_cents: 0, ir_cash_cents: 0, vat_cash_cents: 0, other_taxes_cash_cents: 0,
                net_cashflow_cents: 0
            } as any;
        }
    });

    const presenter = new DashboardPresenter(mockSnapshot);
    const vm = presenter.getViewModel({ type: 'year', value: '2026' });

    it('should correctly identify Next Due', () => {
        // Now is Feb 15. Next item is Feb 20.
        expect(vm.nextDue).not.toBeNull();
        expect(vm.nextDue?.date).toBe('2026-02-20');
        expect(vm.nextDue?.amount).toBe(10000);
    });

    it('should calculate SafeToSpend correctly', () => {
        // SafeToSpend = ClosingTreasury(Feb) - Scheduled(After Feb End AND Before Now+30d)
        // Closing Feb = 2000.00€ (200000 cents)
        // Window: [Mar 1, Mar 17] (since Now=Feb 15, +30d = Mar 17-ish)
        // Schedule items:
        // - Feb 20: In Feb. Ignored (part of closing).
        // - Mar 10: In Window. Amount 200.00€ (20000 cents).
        // - Jun 10: Outside.

        // Expected = 200000 - 20000 = 180000
        expect(vm.kpis.safeToSpend).toBe(180000);
        expect(vm.kpis.closingTreasury).toBe(200000);
    });

    it('should return provisions for the current month', () => {
        // Feb provisions: 5000 + 2000 + 1000 = 8000
        expect(vm.kpis.provisions).toBe(8000);
    });

    it('should return projection series starting from current month', () => {
        // Starts Feb. Should include Feb, Mar...
        const series = vm.charts.projectionSeries;
        expect(series.length).toBeGreaterThan(0);
        expect(series[0].month).toBe('Feb');
        expect(series[1].month).toBe('Mar');
        expect(series[1].treasury).toBe(250000);
    });
});
