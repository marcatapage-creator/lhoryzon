
import { describe, it, expect } from 'vitest';
import { normalizeOperationsToLedger } from '../normalize';
import { buildLedgerTaxes } from '../scheduleTaxes';
import { mergeLedgers } from '../merge';
import { computeTreasury } from '../computeTreasury';
import { Operation, MONTHS } from '@/lib/compta/types';
import { SocialResult, TaxResult, VatResult } from '@/core/fiscal-v2/domain/types';

const createBaseOp = (): Operation => ({
    id: 'test-val', year: 2026, isScenario: false, isArtistAuthor: false, cashCurrent_cents: 0,
    vatPaymentFrequency: 'monthly', vatCarryover_cents: 0,
    income: { salaryTTCByMonth: {}, otherIncomeTTC_cents: 0, otherIncomeVATRate_bps: 0, otherIncomeSelectedMonths: [], items: [] },
    expenses: { pro: { items: [], totalOverrideTTC_cents: null }, social: { urssaf_cents: 0, urssafPeriodicity: 'monthly', ircec_cents: 0, ircecPeriodicity: 'yearly' }, taxes: { incomeTax_cents: 0, incomeTaxPeriodicity: 'monthly' }, personal: { items: [] }, otherItems: [] },
    meta: { version: 1, createdAt: '', updatedAt: '' }
});

const mockEngine = (social = 0, tax = 0, vat = 0) => ({
    social: { cotisations_totales: social, breakdown: { ircec: 0, urssaf: social } } as SocialResult,
    tax: { impot_revenu_total: tax } as TaxResult,
    vat: { tva_due: vat } as VatResult
});

describe('Ledger Validation (P0)', () => {

    it('1) Anti Double-Count: Manual Tax overrides Engine Tax', () => {
        const op = createBaseOp();
        // Manual Entry: 500€ Social in March
        op.expenses.pro.items.push({
            id: 'man-soc', label: 'Urssaf Manual', amount_ttc_cents: 50000,
            periodicity: 'once', category: 'social' // This triggers manual_social
        });
        // Note: 'once' defaults to Jan unless specified? normalize.ts defaults to Jan. 
        // Let's check normalize.ts behavior for 'once' without selectedMonths.
        // It puts in 'Jan'. 
        // Let's filter verification for Jan.

        // Engine: 2400€ / year -> 200€ / month
        const engine = mockEngine(240000, 0, 0);

        const ledgerOps = normalizeOperationsToLedger([op]); // Jan has 500.00
        const ledgerTaxes = buildLedgerTaxes({
            engineResult: engine,
            manualInput: { urssafPeriodicity: 'monthly', ircecPeriodicity: 'monthly', taxPeriodicity: 'monthly', vatPeriodicity: 'monthly' },
            vatOffsetMonth: 0
        }); // Jan has 200.00

        const final = mergeLedgers(ledgerOps, ledgerTaxes, 0);

        // Verification
        // Jan: Should have 500 (Manual) NOT 700 (Sum) NOT 200 (Engine)
        // Verify we prioritized manual
        expect(final.byMonth['Jan'].urssaf_cash_cents).toBe(50000);

        // Feb: Should have 200 (Engine) as no manual
        expect(final.byMonth['Feb'].urssaf_cash_cents).toBe(20000);
    });

    it('2) VAT: Due vs Paid (Quarterly)', () => {
        const op = createBaseOp();
        // Jan: Income 2400 (VAT 400), Expense 1200 (VAT 200) -> Net VAT due = 200
        // We simulate this by inputting items that generate collected/deductible in normalize
        op.income.items.push({
            id: 'inc', label: 'Income', amount_ttc_cents: 240000, vatRate_bps: 2000, periodicity: 'monthly'
        });
        op.expenses.pro.items.push({
            id: 'exp', label: 'Exp', amount_ttc_cents: 120000, vatRate_bps: 2000, category: 'pro', periodicity: 'monthly'
        });

        // Computed VAT due by Engine for year = (400-200)*12 = 2400€
        // But let's say Engine says 2400 total.
        const engine = mockEngine(0, 0, 240000);

        const ledgerOps = normalizeOperationsToLedger([op]);

        // Check Accrual (Ops)
        // VAT Collected: 2400 * 0.2/1.2 = 400
        expect(ledgerOps.byMonth['Jan'].vat_collected).toBeCloseTo(40000, -1);
        expect(ledgerOps.byMonth['Jan'].vat_deductible).toBeCloseTo(20000, -1);

        // Schedule: Quarterly Payment
        const ledgerTaxes = buildLedgerTaxes({
            engineResult: engine,
            manualInput: {
                urssafPeriodicity: 'monthly', ircecPeriodicity: 'monthly', taxPeriodicity: 'monthly',
                vatPeriodicity: 'quarterly'
            }, // Quarterly!
            vatOffsetMonth: 0
        });

        const final = mergeLedgers(ledgerOps, ledgerTaxes, 0);

        // Check Cash (Taxes)
        // Jan: No Payment (Quarterly payments usually Apr/Jul/Oct/Jan or similar)
        // Our scheduleTaxes implementation for quarterly: Apr, Jul, Oct, Dec(simulating Jan).
        expect(final.byMonth['Jan'].vat_cash_cents).toBe(0);

        // Apr: Payment of 1/4 of total (600€)
        expect(final.byMonth['Apr'].vat_cash_cents).toBe(60000);
    });

    it('3) One-off Income: Only appears in specific month', () => {
        const op = createBaseOp();
        op.income.otherIncomeTTC_cents = 300000; // 3000€
        op.income.otherIncomeSelectedMonths = ['Jun']; // Strict June

        const ledgerOps = normalizeOperationsToLedger([op]);

        expect(ledgerOps.byMonth['Jun'].income_ttc).toBe(300000);
        expect(ledgerOps.byMonth['May'].income_ttc).toBe(0);
        expect(ledgerOps.byMonth['Jul'].income_ttc).toBe(0);
    });

    it('4) Dashboard Integrity: Net Pocket = Sum(Inflows - Outflows)', () => {
        // Complex Scenario
        const op = createBaseOp();
        op.year = 2026;
        op.income.items.push({ id: 'inc', label: 'Inc', amount_ttc_cents: 120000, vatRate_bps: 0, periodicity: 'monthly', type: 'other' }); // 1200 income
        op.expenses.pro.items.push({ id: 'exp', label: 'Exp', amount_ttc_cents: 60000, vatRate_bps: 0, category: 'pro', periodicity: 'monthly' }); // 600 expense
        // Manual Social: 100/mo
        op.expenses.pro.items.push({ id: 'soc', label: 'Soc', amount_ttc_cents: 10000, periodicity: 'monthly', category: 'social' });

        const ledgerOps = normalizeOperationsToLedger([op]);
        const ledgerTaxes = buildLedgerTaxes({
            engineResult: mockEngine(0, 0, 0), // Zero engine, relying on manual
            manualInput: { urssafPeriodicity: 'monthly', ircecPeriodicity: 'monthly', taxPeriodicity: 'monthly', vatPeriodicity: 'monthly' },
            vatOffsetMonth: 0
        });

        const final = mergeLedgers(ledgerOps, ledgerTaxes, 0);
        const treasury = computeTreasury(final);

        // Annual Aggregates
        let totalIncome = 0;
        let totalOutflow = 0;
        let totalNet = 0;

        MONTHS.forEach(m => {
            const row = treasury.byMonth[m];
            totalIncome += row.income_ttc_cents;
            const outflow = row.expense_pro_ttc_cents + row.manual_social + row.manual_tax + row.vat_cash_cents;
            // Note: manual_social/tax are mapped to urssaf_cash_cents etc in merge.ts
            // Let's use the explicit cash fields from LedgerFinal
            const realOutflow = row.expense_pro_ttc_cents + row.expense_perso_ttc_cents + row.urssaf_cash_cents + row.ircec_cash_cents + row.ir_cash_cents + row.vat_cash_cents + row.other_taxes_cash_cents;

            totalOutflow += realOutflow;
            totalNet += row.net_cashflow_cents;
        });

        // 12 * (1200 - 600 - 100) = 12 * 500 = 6000
        expect(totalIncome).toBe(1440000);
        expect(totalOutflow).toBe(840000);
        expect(totalNet).toBe(600000); // 6000€

        // Invariant
        expect(totalNet).toBe(totalIncome - totalOutflow);
    });

});
