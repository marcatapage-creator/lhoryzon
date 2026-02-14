import { FiscalSimulation, Month, MONTHS } from "./index";

export interface PaymentEvent {
    month: Month;
    amount: number;
    type: 'URSSAF' | 'TVA' | 'IR' | 'IRCEC' | 'OTHER';
    isProjected: boolean;
    label: string;
}

export const PaymentScheduleEngine = {
    generate(
        simulation: FiscalSimulation,
        currentMonthIndex: number = new Date().getMonth()
    ): PaymentEvent[] {
        const events: PaymentEvent[] = [];
        const { input, social, tax, vat } = simulation;

        // 1. URSSAF
        // If Micro: Monthly or Quarterly. Assuming Monthly for "Risque court terme" precision.
        // Logic: % of CA realized in Month M-1 paid in Month M.
        // We lack monthly breakdown of Revenue in SimulationInput currently (it aggregates).
        // TODO: Input should have monthly distribution.

        // For MVP: Uniform distribution or use `acomptes_urssaf_payes` context
        // If "acomptes" implies already paid, we project the REST.
        const socialDue = social.cotisations_totales;
        // Remaining to pay?
        const remainingSocial = Math.max(0, socialDue - input.acomptes_urssaf_payes);

        // Simple projection: Distribute remaining over remaining months?
        // OR: use specific known deadlines (Feb, May, Aug, Nov for quarterly).

        if (remainingSocial > 0) {
            // Distribute evenly over remaining months
            const monthsLeft = 12 - currentMonthIndex; // e.g. if Jan (0), 12 left. If Dec (11), 1 left.
            if (monthsLeft > 0) {
                const monthlyAmount = remainingSocial / monthsLeft;
                for (let i = currentMonthIndex; i < 12; i++) {
                    events.push({
                        month: MONTHS[i],
                        amount: monthlyAmount,
                        type: 'URSSAF',
                        isProjected: true,
                        label: 'Cotisation Sociale (Est.)'
                    });
                }
            }
        }

        // 2. TVA
        // Standard: Monthly payment on the 15th-24th for Reel Normal.
        // Franchise: None.
        if (vat.regime !== 'franchise' && vat.tva_due > 0) {
            // Again, distribute remaining logic
            // Since we compute Annual VAT due, we assume simplified distribution for now.
            const monthsLeft = 12 - currentMonthIndex;
            if (monthsLeft > 0) {
                const monthlyVat = vat.tva_due / 12; // Crude approximation of annual flow
                // Better: (Total Due - Paid) / Remaining
                // Assuming 0 paid for sim input unless specified
                for (let i = currentMonthIndex; i < 12; i++) {
                    events.push({
                        month: MONTHS[i],
                        amount: monthlyVat,
                        type: 'TVA',
                        isProjected: true,
                        label: 'TVA (Est.)'
                    });
                }
            }
        }

        // 3. Impôt sur le Revenu (PAS)
        // Monthly installments (15th of each month)
        // Based on `prelevement_source_paye`, we know what was paid.
        // We project valid "Acomptes" for future.
        // The Engine computes value for NEXT year regularization usually, but PAS is current.
        // Let's assume Sim tax = Total Tax for year.
        const taxDue = tax.impot_revenu_total;
        const remainingTax = Math.max(0, taxDue - input.prelevement_source_paye);

        if (remainingTax > 0) {
            const monthsLeft = 12 - currentMonthIndex;
            if (monthsLeft > 0) {
                const monthlyTax = remainingTax / monthsLeft;
                for (let i = currentMonthIndex; i < 12; i++) {
                    events.push({
                        month: MONTHS[i],
                        amount: monthlyTax,
                        type: 'IR',
                        isProjected: true,
                        label: 'Prélèvement à la Source'
                    });
                }
            }
        }

        return events.sort((a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
    },

    getNextDeadline(events: PaymentEvent[]): PaymentEvent | null {
        // Find first event in current month or next
        if (events.length === 0) return null;
        return events[0];
    }
};
