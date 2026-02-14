
import { describe, it, expect } from 'vitest';
import { PaymentScheduleEngine } from '../paymentSchedule';


describe('Payment Schedule Audit', () => {

    it('Invariant: Sum of scheduled payments <= Total Annual Provisions', () => {
        // Mock Simulation Result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockSimulation: any = {
            input: {
                acomptes_urssaf_payes: 0,
                prelevement_source_paye: 0
            },
            social: {
                cotisations_totales: 12000 // 12k annual
            },
            tax: {
                impot_revenu_total: 6000 // 6k annual
            },
            vat: {
                tva_due: 2400, // 2.4k annual
                regime: 'reel_normal'
            }
        };

        // Generate schedule from Jan (Month 0)
        const schedule = PaymentScheduleEngine.generate(mockSimulation, 0);

        // Sum up
        const totalScheduled = schedule.reduce((sum, item) => sum + item.amount, 0);
        const totalExpected = 12000 + 6000 + 2400; // 20400

        // Expect equality (within floating point epsilon, though engine uses division)
        expect(totalScheduled).toBeCloseTo(totalExpected, 2); // 2 digits precision

        // Logical check: Outflows should not exceed provisions
        expect(totalScheduled).toBeLessThanOrEqual(totalExpected + 0.01);
    });

    it('Scenario: Partial Year (Starting June)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockSimulation: any = {
            input: {
                acomptes_urssaf_payes: 5000, // Already paid 5k
                prelevement_source_paye: 2000 // Already paid 2k
            },
            social: {
                cotisations_totales: 12000 // 12k annual -> 7k remaining
            },
            tax: {
                impot_revenu_total: 6000 // 6k annual -> 4k remaining
            },
            vat: {
                tva_due: 0,
                regime: 'franchise'
            }
        };

        // Start from June (index 5) -> 7 months left (Jun, Jul, Aug, Sep, Oct, Nov, Dec)
        // Wait, "months left" logic in engine: 12 - currentMonthIndex. 
        // If current is June (5), 12-5 = 7 months. (Jun, Jul, ... Dec). Correct.
        const schedule = PaymentScheduleEngine.generate(mockSimulation, 5);

        const totalScheduled = schedule.reduce((sum, item) => sum + item.amount, 0);
        const expectedRemaining = (12000 - 5000) + (6000 - 2000); // 7000 + 4000 = 11000

        expect(totalScheduled).toBeCloseTo(expectedRemaining, 2);
    });
});
