import { describe, it, expect } from 'vitest';
import { computeFilteredTotals } from '../calculations';
import { Operation, FiscalProfile, Month } from '../types';

describe('Fiscal Certification Test (BNC 2024)', () => {
    const mockProfile: FiscalProfile = {
        status: 'bnc' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        vatEnabled: true,
        isPro: true
    };

    const mockOperation: Operation = {
        id: 'test-audit-2024',
        year: 2024,
        isScenario: false,
        cashCurrent_cents: 1000000, // 10k€ starting
        vatPaymentFrequency: 'yearly',
        vatCarryover_cents: 0,
        income: {
            salaryTTCByMonth: {
                Jan: 500000, Feb: 500000, Mar: 500000, Apr: 500000, May: 500000, Jun: 500000,
                Jul: 500000, Aug: 500000, Sep: 500000, Oct: 500000, Nov: 500000, Dec: 500000,
            }, // 5k€/month = 60k€/year
            otherIncomeTTC_cents: 0,
            otherIncomeVATRate_bps: 2000,
            otherIncomeSelectedMonths: [],
            items: []
        },
        expenses: {
            pro: {
                totalOverrideTTC_cents: null,
                items: [
                    {
                        id: 'rent',
                        label: 'Loyer Bureau',
                        amount_ttc_cents: 100000, // 1k€/month
                        category: 'pro',
                        vatRate_bps: 2000,
                        periodicity: 'monthly'
                    }
                ]
            },
            social: {
                urssaf_cents: 0, // Auto-computed in simplified mode if not provided
                urssafPeriodicity: 'monthly',
                ircec_cents: 0,
                ircecPeriodicity: 'monthly',
            },
            taxes: {
                incomeTax_cents: 0,
                incomeTaxPeriodicity: 'monthly',
            },
            personal: { items: [] },
            otherItems: []
        },
        meta: {
            version: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    };

    it('should match the deterministic fiscal snapshot for annual totals', () => {
        const annualTotals = computeFilteredTotals(mockOperation, 'all', mockProfile);

        expect(annualTotals.incomeTTC_cents).toBe(6000000);
        expect(annualTotals.profitHT_cents).toBe(4800000); // 60k - 12k

        // Fingerprint integrity
        expect(annualTotals.fiscalHash).toHaveLength(8);
        expect(annualTotals.trace.length).toBeGreaterThan(3);
        expect(annualTotals.calcStatus).toBe('stale');
    });

    it('should show strict cash spikes in strictMode vs smoothed monthly view', () => {
        // Mock a quarterly income item for this test
        const quarterlyOp = {
            ...mockOperation,
            income: {
                ...mockOperation.income,
                salaryTTCByMonth: {
                    Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
                    Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
                },
                items: [{
                    id: 'q-bonus',
                    label: 'Quarterly Bonus',
                    amount_ttc_cents: 300000,
                    vatRate_bps: 0,
                    periodicity: 'quarterly'
                }]
            }
        } as Operation;

        // Jan (due month for quarterly)
        const janStrict = computeFilteredTotals(quarterlyOp, 'Jan', mockProfile, true);
        const janSmooth = computeFilteredTotals(quarterlyOp, 'Jan', mockProfile, false);

        // Feb (not a due month for quarterly)
        const febStrict = computeFilteredTotals(quarterlyOp, 'Feb', mockProfile, true);
        computeFilteredTotals(quarterlyOp, 'Feb', mockProfile, false); // febSmooth unused

        // Strict: Jan=3000, Feb=0
        expect(janStrict.incomeTTC_cents).toBe(300000);
        expect(febStrict.incomeTTC_cents).toBe(0);

        // Smooth: 3000/3 = 1000 per month (total is 3000 * 4 = 12000 per year, but here it's 12000/12 = 1000)
        expect(janSmooth.incomeTTC_cents).toBe(100000);
        expect(janSmooth.incomeTTC_cents).toBe(100000);
    });

    it('should guarantee Σ(monthly) === annual in smoothed mode', () => {
        const annualTotals = computeFilteredTotals(mockOperation, 'all', mockProfile);

        let monthlySum_cents = 0;
        const months: Month[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        months.forEach(m => {
            const mTotals = computeFilteredTotals(mockOperation, m, mockProfile, false);
            monthlySum_cents += mTotals.incomeTTC_cents;
        });

        expect(monthlySum_cents).toBe(annualTotals.incomeTTC_cents);
    });
});
