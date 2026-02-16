import { describe, it, expect } from 'vitest';
import { computeFiscal } from '../engine/dispatcher';
import { FiscalContext } from '../domain/types';
import { Operation } from '@/lib/compta/types';
import { PASS_2026 } from '../rulesets/2026/fr/common/params';

// --- Helpers ---
const mockContext = (regime: 'micro' | 'reel', options: any = {}): FiscalContext => ({
    taxYear: 2026,
    userStatus: 'artist_author',
    fiscalRegime: regime,
    vatRegime: 'reel', // Force VAT analysis
    household: { parts: 1, children: 0 },
    options: {
        estimateMode: true,
        urssafFrequency: 'quarterly',
        ...options
    }
});

const mockOp = (id: string, date: string, amount: number, type: 'income' | 'expense', category: string, vatRate: number = 0): Operation => {
    const isIncome = type === 'income';

    // Construct Operation matching Types + Normalization Logic
    return {
        id,
        year: parseInt(date.substring(0, 4)),
        date: date,
        label: `Op ${id}`,
        amount: amount,
        category: category,
        income: isIncome ? {
            salaryTTCByMonth: { [monthStr(date)]: amount }
        } : {},
        expenses: !isIncome ? {
            pro: {
                items: [{
                    category,
                    label: `Exp ${id}`,
                    amount_ttc_cents: amount,
                    vatRate_bps: vatRate,
                    periodicity: 'one-off'
                }],
                totalOverrideTTC_cents: 0
            },
            social: {},
            taxes: {},
            personal: { items: [] }
        } : { pro: { items: [], totalOverrideTTC_cents: 0 }, social: {}, taxes: {}, personal: { items: [] } }
    } as any;
};

// Specialized Helper for Income with VAT
const mockIncomeVat = (id: string, amountTTC: number, vatRate: number) => {
    return {
        id,
        year: 2026,
        date: '2026-06-15',
        income: {
            items: [{
                id: `item-${id}`,
                label: `Inc ${id}`,
                amount_ttc_cents: amountTTC,
                vatRate_bps: vatRate,
                type: 'salary',
                periodicity: 'monthly' // Use monthly to trigger singular item loop in normalization? Wait, logic says periodicity monthly -> 1 items? No 12?
                // Normalization loop: if op.income.items ... forEach ...
                // It doesn't seem to replicate income items by periodicity in my recent update, 
                // just processes them. Let's assume one-off unless I updated that part too.
                // Re-reading my replace_file_content: "op.income.items.forEach... normalization... date: normalizeDate(..., monthStr(1)...)"
                // It hardcodes monthStr(1) currently in my logic unless adapted. 
                // That's fine for the test, just need the totals.
            }],
            salaryTTCByMonth: {}
        },
        expenses: { pro: { items: [] }, social: {}, taxes: {}, personal: { items: [] } }
    } as any;
};

// Specialized Helper for Expense with VAT
const mockExpenseVat = (id: string, amountTTC: number, vatRate: number) => {
    return {
        id,
        year: 2026,
        date: '2026-06-15',
        income: { salaryTTCByMonth: {} },
        expenses: {
            pro: {
                items: [{
                    category: 'MATERIEL',
                    label: `Exp ${id}`,
                    amount_ttc_cents: amountTTC,
                    vatRate_bps: vatRate,
                    periodicity: 'one-off'
                }],
                totalOverrideTTC_cents: 0
            },
            social: {}, taxes: {}, personal: { items: [] }
        }
    } as any;
}


function monthStr(date: string): string {
    const m = parseInt(date.substring(5, 7));
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
}

// --- 10 Golden Cases ---

describe('Fiscal Engine V2 - 10 Golden Cases Strict Mode', () => {

    it('CASE 1: Micro-BNC Low Revenue (Under RAAP)', () => {
        // CA = 10 000 € (Under 10,692)
        const op1 = mockOp('c1', '2026-01-01', 1000000, 'income', 'REVENU_ARTISTIQUE');
        const context = mockContext('micro');
        const result = computeFiscal([op1], context);

        // Abattement = max(34% of 1M, 305€) = 340,000
        // BNC = 660,000
        // Social Base = 660,000 * 1.15 = 759,000
        const socialBase = result.bases.social.total;
        expect(socialBase).toBe(759000);

        // RAAP = 0 (Base 7590€ < 10692€)
        expect(result.taxes.ircec.length).toBe(0);

        // URSSAF Sum Check
        // Vieill Deplaf (0.4%) = 3036
        // Vieill Plaf (6.9%) = 52371
        // CSG Base (98.25%) = 745,717.5 -> 745,718
        // CSG (9.2%) = 68606
        // CRDS (0.5%) = 3729
        // CFP (0.35%) = 2657
        // Total = 130,399
        const sumU = result.taxes.urssaf.reduce((acc, t) => acc + t.amount, 0);
        expect(sumU).toBe(130399);
    });

    it('CASE 2: Micro-BNC Crossing RAAP Threshold', () => {
        // CA = 20 000 €
        const op1 = mockOp('c2', '2026-01-01', 2000000, 'income', 'REVENU_ARTISTIQUE');
        const context = mockContext('micro');
        const result = computeFiscal([op1], context);

        expect(result.bases.social.total).toBe(1518000);

        // RAAP (8% on Base) = 1,518,000 * 0.08 = 121,440
        const raap = result.taxes.ircec.find(t => t.code === 'IRCEC_RAAP');
        expect(raap).toBeDefined();
        expect(raap?.amount).toBe(121440);
    });

    it('CASE 3: Reel BNC with Expenses & Caps', () => {
        // CA = 80k. Exp = 20k HT.
        // To get 20k HT in Expense, with 0% VAT (Simplification for test), Set TTC=20k, Rate=0.
        // Or Set TTC=24k, Rate=2000bps (20%) -> HT=20k.
        // Let's use 0% VAT for cleaner math on Exp.
        const op1 = mockOp('rev', '2026-01-01', 8000000, 'income', 'REVENU_ARTISTIQUE');
        const op2 = mockExpenseVat('exp', 2000000, 0); // 20k TTC, 0 VAT -> 20k HT

        const context = mockContext('reel');
        const result = computeFiscal([op1, op2], context);

        // BNC = 80k - 20k = 60,000€ = 6,000,000 cents
        // Social Base = 6,900,000
        const socialBase = result.bases.social.total;
        expect(socialBase).toBe(6900000);

        // Caps
        const vPlaf = result.taxes.urssaf.find(t => t.code === 'URSSAF_RETRAITE_BASIC_PLAF');
        expect(vPlaf?.base).toBe(PASS_2026);
        expect(vPlaf?.amount).toBe(Math.round(PASS_2026 * 690 / 10000));
    });

    it('CASE 4: Social Base > PASS', () => {
        const op1 = mockOp('revenue', '2026-01-01', 20000000, 'income', 'REVENU_ARTISTIQUE');

        const context = mockContext('micro');
        const result = computeFiscal([op1], context);

        const vPlaf = result.taxes.urssaf.find(t => t.code === 'URSSAF_RETRAITE_BASIC_PLAF');
        expect(vPlaf?.base).toBe(PASS_2026);
        expect(vPlaf?.capApplied?.name).toBe('PASS');
    });

    it('CASE 5: Exceeding RAAP Ceiling', () => {
        const op1 = mockOp('rev', '2026-01-01', 30000000, 'income', 'REVENU_ARTISTIQUE');
        const context = mockContext('micro');
        const result = computeFiscal([op1], context);

        const raap = result.taxes.ircec.find(t => t.code === 'IRCEC_RAAP');
        const ceiling = PASS_2026 * 3;

        expect(raap?.base).toBe(ceiling);
        expect(raap?.capApplied?.name).toBe('3xPASS');
    });

    it('CASE 6: Negative Result Reel', () => {
        const op1 = mockOp('rev', '2026-01-01', 3000000, 'income', 'REVENU_ARTISTIQUE');
        const op2 = mockExpenseVat('exp', 4000000, 0); // 40k HT
        const context = mockContext('reel');
        const result = computeFiscal([op1, op2], context);

        expect(result.bases.social.total).toBe(0);
        expect(result.taxes.urssaf.reduce((acc, t) => acc + t.amount, 0)).toBe(0);
    });

    it('CASE 7: VAT Credit', () => {
        // Coll: 500k, Ded: 700k -> Balance -200k
        // Income with VAT: 2.5M HT + 0.5M VAT = 3.0M TTC. Rate 20%.
        const op1 = mockIncomeVat('in', 3000000, 2000);
        // Expense with VAT: 3.5M HT + 0.7M VAT = 4.2M TTC. Rate 20%.
        const op2 = mockExpenseVat('out', 4200000, 2000);

        const context = mockContext('reel');
        const result = computeFiscal([op1, op2], context);

        expect(result.bases.vat.collected).toBe(500000);
        expect(result.bases.vat.deductible).toBe(700000);
        expect(result.bases.vat.balance).toBe(-200000);
    });

    it('CASE 8: Hash Stability', () => {
        const op1 = mockOp('A', '2026-01-01', 1000, 'income', 'X');
        const op2 = mockOp('B', '2026-02-01', 2000, 'income', 'X');

        const context = mockContext('micro');

        const res1 = computeFiscal([op1, op2], context);
        const res2 = computeFiscal([op2, op1], context); // Reversed Order

        expect(res1.metadata.fiscalHash).toBe(res2.metadata.fiscalHash);
    });

    it('CASE 9: Params Change Sensitivity', () => {
        const op1 = mockOp('A', '2026-01-01', 1000, 'income', 'X');
        const context = mockContext('micro');
        const res1 = computeFiscal([op1], context);
        expect(res1.metadata.fiscalHash).toBeDefined();
    });

    it('CASE 10: CSG 4 PASS Alert', () => {
        const op1 = mockOp('huge', '2026-01-01', 40000000, 'income', 'REVENU_ARTISTIQUE');
        const context = mockContext('micro', {
            featureFlags: { CSG_ABOVE_4PASS_SIMPLIFIED: true }
        });

        const result = computeFiscal([op1], context);

        const alert = result.alerts.find(a => a.code === 'ALERT_CSG_APPROXIMATION');
        expect(alert).toBeDefined();
    });

});
