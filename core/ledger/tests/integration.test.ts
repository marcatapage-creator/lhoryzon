
import { describe, it, expect } from 'vitest';
import { normalizeOperationsToLedger } from '../normalize';
import { buildLedgerTaxes } from '../scheduleTaxes';
import { mergeLedgers } from '../merge';
import { computeTreasury } from '../computeTreasury';
import { Operation, MONTHS } from '@/lib/compta/types';
import { SocialResult, TaxResult, VatResult } from '@/core/fiscal-v2/domain/types';

describe('Dashboard Integrity (Ledger SSOT)', () => {

    // Helper: Create a mock engine result
    const mockEngineResult = (social = 0, tax = 0, vat = 0) => ({
        social: { cotisations_totales: social, breakdown: { ircec: 0, urssaf: social } } as SocialResult,
        tax: { impot_revenu_total: tax, tranche_marginale: 0 } as TaxResult,
        vat: { tva_due: vat, tva_collectee: 0, tva_deductible: 0 } as VatResult
    });

    it('should maintain Treasury Invariant: Closing = Opening + Sum(NetCashflow)', () => {
        // 1. Setup Data
        const op: Operation = {
            id: 'test-integrity',
            year: 2026,
            isScenario: false,
            isArtistAuthor: false,
            cashCurrent_cents: 100000, // Initial 1000€
            vatPaymentFrequency: 'monthly',
            vatCarryover_cents: 0,
            income: { salaryTTCByMonth: {}, otherIncomeTTC_cents: 1200000, otherIncomeVATRate_bps: 0, otherIncomeSelectedMonths: [], items: [] }, // 1200€ Other Income (100/mo)
            expenses: {
                pro: { items: [], totalOverrideTTC_cents: null },
                social: { urssaf_cents: 0, urssafPeriodicity: 'monthly', ircec_cents: 0, ircecPeriodicity: 'yearly' },
                taxes: { incomeTax_cents: 0, incomeTaxPeriodicity: 'monthly' },
                personal: { items: [] },
                otherItems: []
            },
            meta: { version: 1, createdAt: '', updatedAt: '' }
        };

        // 2. Engine Result (Simulated)
        // Let's say Social = 200€, Tax = 100€, VAT = 0
        const engineResult = mockEngineResult(20000, 10000, 0);

        // 3. Run Pipeline
        const ledgerOps = normalizeOperationsToLedger([op]); // Income 100/mo

        const ledgerTaxes = buildLedgerTaxes({
            engineResult,
            manualInput: {
                urssafPeriodicity: 'monthly',
                ircecPeriodicity: 'yearly',
                taxPeriodicity: 'monthly',
                vatPeriodicity: 'monthly'
            },
            vatOffsetMonth: 0
        });

        const ledgerFinal = mergeLedgers(ledgerOps, ledgerTaxes, op.cashCurrent_cents);
        const ledgerWithTreasury = computeTreasury(ledgerFinal);

        // 4. Invariant Check
        const jan = ledgerWithTreasury.byMonth['Jan'];
        const dec = ledgerWithTreasury.byMonth['Dec'];

        // Income: 12000 (1200€) / 12 = 1000 (100€) per month?
        // Wait, otherIncomeTTC_cents is 1200000 (12k). 
        // 12k / 12 = 1k/month.
        // Social: 20000 (200€) / 12 = 1666 cents/month approx.
        // Tax: 10000 (100€) / 12 = 833 cents/month approx.

        expect(jan.income_ttc_cents).toBe(100000); // 1k
        expect(jan.urssaf_cash_cents).toBeCloseTo(1667, -1); // Rounding diffs accepted
        expect(jan.ir_cash_cents).toBeCloseTo(833, -1);

        // Total Net Cashflow
        const totalNet = MONTHS.reduce((acc, m) => acc + ledgerWithTreasury.byMonth[m].net_cashflow_cents, 0);
        const treasuryDelta = dec.closing_treasury_cents - op.cashCurrent_cents;

        expect(Math.abs(treasuryDelta - totalNet)).toBeLessThan(5); // Tolerance for float/round accumulation

        console.log('Invariant Delta:', treasuryDelta - totalNet);
    });

    it('should match KPI "Depenses" with sum of relevant outflows', () => {
        // KPI Logic: Expenses = Pro + Social + Tax + VAT Due
        // Note: KPI excludes Personal.

        // Setup: Pro Exp 600€ (50/mo), Social 200€, Tax 100€
        const op: Operation = {
            id: 'test-kpi', year: 2026, isScenario: false, isArtistAuthor: false, cashCurrent_cents: 0, vatCarryover_cents: 0,
            vatPaymentFrequency: 'yearly',
            income: { salaryTTCByMonth: {}, otherIncomeTTC_cents: 0, otherIncomeVATRate_bps: 0, otherIncomeSelectedMonths: [], items: [] },
            expenses: {
                pro: { items: [], totalOverrideTTC_cents: 60000 }, // 600€ Override
                social: { urssaf_cents: 0, urssafPeriodicity: 'monthly', ircec_cents: 0, ircecPeriodicity: 'yearly' },
                taxes: { incomeTax_cents: 0, incomeTaxPeriodicity: 'monthly' },
                personal: { items: [] }, otherItems: []
            },
            meta: { version: 1, createdAt: '', updatedAt: '' }
        };

        const engineResult = mockEngineResult(20000, 10000, 5000); // VAT 50€

        const ledgerOps = normalizeOperationsToLedger([op]);
        const ledgerTaxes = buildLedgerTaxes({
            engineResult,
            manualInput: { urssafPeriodicity: 'monthly', ircecPeriodicity: 'yearly', taxPeriodicity: 'monthly', vatPeriodicity: 'monthly' },
            vatOffsetMonth: 0
        });
        const ledgerFinal = mergeLedgers(ledgerOps, ledgerTaxes, 0);
        const ledgerWithTreasury = computeTreasury(ledgerFinal);

        // Calculate KPI from Ledger
        let kpiExpenses = 0;
        MONTHS.forEach(m => {
            const r = ledgerWithTreasury.byMonth[m];
            kpiExpenses += r.expense_pro_ttc_cents + r.urssaf_cash_cents + r.ircec_cash_cents + r.ir_cash_cents + r.vat_cash_cents + r.other_taxes_cash_cents;
        });

        // Expected: 600 + 200 + 100 + 50 = 950€ -> 95000 cents
        // Floating point Note: 20000/12 * 12 might have rounding.
        expect(kpiExpenses).toBeGreaterThan(94990);
        expect(kpiExpenses).toBeLessThan(95010);
    });

});
