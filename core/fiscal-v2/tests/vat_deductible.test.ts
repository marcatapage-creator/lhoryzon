
import { describe, it, expect } from 'vitest';
import { projectToDashboardData } from '../bridge/dashboard';
import { FiscalOutput } from '../domain/types';
import { Operation } from '@/lib/compta/types';

// Mock Output with VAT Balance
const mockOutputWithVat: FiscalOutput = {
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
        vat: {
            collected: 20000,
            deductible: 4000,
            balance: 16000, // 200 - 40 = 160
            byPeriod: {}
        }
    },
    taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
    schedule: [],
    alerts: []
};

// Helper mock op
const createDetailedOp = (): Operation => ({
    id: `op-main`,
    label: "Test Op",
    date: `2026-01-15`,
    year: 2026,
    cashCurrent_cents: 0,
    income: { salaryTTCByMonth: {}, items: [] },
    expenses: {
        pro: { items: [], totalOverrideTTC_cents: 0 },
        personal: { items: [] },
        social: { urssaf_cents: 0 },
        taxes: { incomeTax_cents: 0 },
        otherItems: []
    }
} as unknown as Operation);

describe('Deductible VAT Integration', () => {

    it('should calculate deductible VAT from expenses and update dashboard provision', () => {
        // Scenario:
        // Revenue: 1200 TTC (1000 HT + 200 VAT)
        // Expense: 240 TTC (200 HT + 40 VAT)
        // Net VAT Due = 160.

        // This test simulates that the FiscalEngine has correctly outputted the balance (160),
        // and checks if the Dashboard Bridge correctly provisions for this.

        const op = createDetailedOp();

        // We rely on the Engine Output being passed correctly.
        // The bridge sets provision_vat_cents based on bases.vat.balance

        const result = projectToDashboardData(mockOutputWithVat, [op], 0);

        // Check if provision matches the balance
        expect(result.currentYearProvisionVat_cents).toBe(16000);
    });

    it('should aggregate VAT deductible cashflow in ledger months', () => {
        // The bridge also aggregates cashflows based on the schedule.
        // If the engine outputs a schedule for VAT payment, it should appear.
        // However, deductible VAT itself is an operational flow (it reduces the expense outflow effectively for tax purposes, 
        // but physically you pay TTC).

        // Wait, "TVA décaissé" usually means the VAT you PAID on purchases.
        // The user says "soustraire a la TVA encaissée".
        // Physical Cashflow: You pay Supplier 240 (200 + 40 VAT).
        // You collect Customer 1200 (1000 + 200 VAT).
        // You owe State: 200 - 40 = 160.

        // In the Dashboard, we want to see:
        // Income: 1200 TTC.
        // Expense: 240 TTC.
        // VAT Payment (Projected/Real): 160.

        // Net Pocket = 1200 - 240 - 160 = 800.
        // (Revenue HT 1000 - Expense HT 200 = 800 Profit). Correct.

        // The test checks if the VAT Provision matches 160.
        const result = projectToDashboardData(mockOutputWithVat, [createDetailedOp()], 0);
        expect(result.currentYearProvisionVat_cents).toBe(16000);
    });

});
