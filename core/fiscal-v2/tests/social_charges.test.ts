
import { describe, it, expect } from 'vitest';
import { projectToDashboardData } from '../bridge/dashboard';
import { FiscalOutput } from '../domain/types';
import { Operation } from '@/lib/compta/types';

// Mock Output
const mockOutput: FiscalOutput = {
    metadata: {
        engineVersion: "test",
        rulesetYear: 2026,
        rulesetRevision: "1",
        fiscalHash: "abc",
        computedAt: "now",
        paramsFingerprint: "123",
        mode: "ESTIMATED"
    },
    bases: {
        social: { total: 0, artistic: 0, other: 0 },
        fiscal: { totalNetTaxable: 0, revenue: 0, deductibleExpenses: 0 },
        vat: { collected: 0, deductible: 0, balance: 0, byPeriod: {} }
    },
    taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
    schedule: [
        {
            id: 'sch-1', date: '2026-02-15', label: 'URSSAF Scheduled', amount: 30000,
            organization: 'URSSAF_AA', type: 'PROVISION', confidence: 'ESTIMATED', status: 'PENDING'
        },
        {
            id: 'sch-2', date: '2026-03-15', label: 'URSSAF Scheduled', amount: 30000,
            organization: 'URSSAF_AA', type: 'PROVISION', confidence: 'ESTIMATED', status: 'PENDING'
        }
    ],
    alerts: []
};

// Helper mock op
const createDetailedOp = (): Operation => ({
    id: `op-main`,
    label: "Test Op",
    date: `2026-01-15`,
    year: 2026,
    isScenario: false,
    isArtistAuthor: false,
    cashCurrent_cents: 0,
    vatPaymentFrequency: 'monthly',
    vatCarryover_cents: 0,
    meta: { version: 2, createdAt: "now", updatedAt: "now" },
    income: { salaryTTCByMonth: {}, items: [] },
    expenses: {
        pro: { items: [], totalOverrideTTC_cents: 0 },
        personal: { items: [] },
        social: {
            urssaf_cents: 0,
            urssafPeriodicity: 'monthly',
            urssafByMonth: {},
            ircec_cents: 0,
            ircecPeriodicity: 'monthly',
            ircecByMonth: {}
        },
        taxes: { incomeTax_cents: 0, incomeTaxPeriodicity: 'monthly' },
        otherItems: []
    }
} as unknown as Operation);

describe('Social Charges Integration', () => {

    it('should use manual URSSAF entry in dashboard and ignore schedule for that month', () => {
        // Scenario: 
        // User entered URSSAF for Feb: 140€
        // Schedule says URSSAF for Feb: 300€

        // Expected: Feb Cashflow should show 140€ (The real payment), ignoring the 300€ schedule.

        const op = createDetailedOp();
        op.expenses.social.urssafByMonth = { 'Feb': 14000 };

        const result = projectToDashboardData(mockOutput, [op], 0);

        // Verification
        expect(result.byMonth['Feb'].urssaf_cash_cents).toBe(14000);
        // Ensure it didn't add 300 + 140 = 440
        expect(result.byMonth['Feb'].urssaf_cash_cents).not.toBe(44000);
    });

    it('should use schedule for months without manual entry', () => {
        // Scenario:
        // No manual entry for March.
        // Schedule says URSSAF for March: 300€.

        // Expected: March Cashflow should show 300€.

        const op = createDetailedOp();
        // No manual entries

        const result = projectToDashboardData(mockOutput, [op], 0);

        expect(result.byMonth['Mar'].urssaf_cash_cents).toBe(30000);
    });

    it('should subtract social charges from net cashflow', () => {
        const op = createDetailedOp();
        op.expenses.social.urssafByMonth = { 'Feb': 14000 };
        op.income.salaryTTCByMonth = { 'Feb': 100000 }; // 1000 Revenue

        const result = projectToDashboardData(mockOutput, [op], 0);

        // Net = 1000 - 140 = 860
        expect(result.byMonth['Feb'].net_cashflow_cents).toBe(86000);
    });

});
