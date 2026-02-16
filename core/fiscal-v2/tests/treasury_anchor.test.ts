
import { describe, it, expect } from 'vitest';
import { projectToDashboardData } from '../bridge/dashboard';
import { FiscalOutput } from '../domain/types';
import { Operation } from '@/lib/compta/types';
import { MONTHS } from '@/core/ledger/types';

// Mock minimal Output
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
    schedule: [],
    alerts: []
};

// Helper to create specific scenarios
const createDetailedOp = (): Operation => ({
    id: `op-main`,
    label: "Test Op",
    date: `2026-01-15`,
    amount_ht: 0,
    tva_rate_bps: 0,
    amount_tva: 0,
    amount_ttc: 0,
    direction: 'in', // irrelevant, fields below matter
    category: "SERVICES",
    kind: 'REVENUE',
    year: 2026,
    status: 'COMPLETED',
    scope: 'pro',
    isScenario: false,
    isArtistAuthor: false,
    cashCurrent_cents: 0,
    vatPaymentFrequency: 'monthly',
    vatCarryover_cents: 0,
    meta: {
        version: 2,
        createdAt: "now",
        updatedAt: "now"
    },
    expenses: {
        pro: { items: [], totalOverrideTTC_cents: 0 },
        personal: { items: [] },
        social: { urssaf_cents: 0, urssafPeriodicity: 'monthly', ircec_cents: 0, ircecPeriodicity: 'monthly' },
        taxes: { incomeTax_cents: 0, incomeTaxPeriodicity: 'monthly' },
        otherItems: []
    },
    income: {
        salaryTTCByMonth: {
            Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
            Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0
        },
        items: [],
        otherIncomeTTC_cents: 0,
        otherIncomeVATRate_bps: 0,
        otherIncomeSelectedMonths: []
    }
} as unknown as Operation);

describe('Treasury Anchor Logic', () => {

    it('should use default initial treasury when anchor is number', () => {
        const op = createDetailedOp();
        // Jan Income 1000
        op.income.salaryTTCByMonth = { 'Jan': 100000 };
        const ops = [op];

        const result = projectToDashboardData(mockOutput, ops, 50000); // Initial 500

        // Start 500. Jan Flow +1000. Close Jan = 1500.
        // Note: projectToDashboardData calculates flow based on LedgerMonth
        // NetCashflow = Income - Expense.
        // Jan Income = 1000.
        expect(result.initialTreasury).toBe(50000);
        expect(result.byMonth['Jan'].income_ttc_cents).toBe(100000);
        expect(result.byMonth['Jan'].closing_treasury_cents).toBe(150000);
    });

    it('should back-calculate initial treasury from mid-year anchor', () => {
        // Scenario: 
        // Jan: Income +1000. Expense (Monthly) -200. Net = +800.
        // Feb: Income 0. Expense (Monthly) -200. Net = -200.
        // Anchor: Start of March (Index 2) = 5000.

        // Expected Logic:
        // Initial + Net(Jan) + Net(Feb) = Start(Mar) = 5000.
        // Initial + 800 - 200 = 5000
        // Initial + 600 = 5000
        // Initial = 4400.

        const op = createDetailedOp();
        op.income.salaryTTCByMonth = { 'Jan': 100000 };
        op.expenses.pro.items = [{
            id: 'exp-1',
            label: 'Monthly Tool',
            amount_ttc_cents: 20000,
            vatRate_bps: 0,
            periodicity: 'monthly',
            category: 'pro'
        }];

        const ops = [op];

        const anchor = { amount_cents: 500000, monthIndex: 2 }; // Mar Start = 5000
        const result = projectToDashboardData(mockOutput, ops, anchor);

        expect(result.byMonth['Jan'].net_cashflow_cents).toBe(80000); // 1000 - 200
        expect(result.byMonth['Feb'].net_cashflow_cents).toBe(-20000); // 0 - 200

        expect(result.initialTreasury).toBe(440000); // 4400
        expect(result.byMonth['Jan'].closing_treasury_cents).toBe(520000); // 4400 + 800
        expect(result.byMonth['Feb'].closing_treasury_cents).toBe(500000); // 5200 - 200 = 5000. Matches Anchor.
    });

    it('should handle anchor at Start of January', () => {
        // Anchor Index 0 = Start of Jan.
        // Initial should equal Anchor.
        const op = createDetailedOp();
        op.income.salaryTTCByMonth = { 'Jan': 100000 };

        const anchor = { amount_cents: 300000, monthIndex: 0 };

        const result = projectToDashboardData(mockOutput, [op], anchor);

        expect(result.initialTreasury).toBe(300000);
        expect(result.byMonth['Jan'].closing_treasury_cents).toBe(400000);
    });

});
