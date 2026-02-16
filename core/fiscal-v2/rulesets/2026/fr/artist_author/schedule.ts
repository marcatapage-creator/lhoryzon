import { FiscalContext, ScheduleItem, TaxLineItem } from "@/core/fiscal-v2/domain/types";

// --- Schedule Logic ---

export function computeSchedule(taxes: TaxLineItem[], context: FiscalContext): ScheduleItem[] {
    const schedule: ScheduleItem[] = [];
    const year = context.taxYear;

    // Group taxes by Organization
    const urssafLines = taxes.filter(t => t.organization === 'URSSAF_AA');
    const ircecLines = taxes.filter(t => t.organization === 'IRCEC');

    const urssafTotal = urssafLines.reduce((sum, t) => sum + t.amount, 0);
    const ircecTotal = ircecLines.reduce((sum, t) => sum + t.amount, 0);

    // 1. URSSAF Schedule
    // Frequency: Monthly vs Quarterly
    const frequency = context.options?.urssafFrequency || 'quarterly';
    const numInstallments = frequency === 'monthly' ? 12 : 4;
    const urssafInstallment = Math.round(urssafTotal / numInstallments);
    const urssafSourceCodes = urssafLines.map(t => t.code);

    const urssafDates: string[] = [];
    if (frequency === 'monthly') {
        // 15/01 to 15/12
        for (let i = 1; i <= 12; i++) {
            urssafDates.push(`${year}-${i.toString().padStart(2, '0')}-15`);
        }
    } else {
        // Quarterly: 15/01, 15/04, 15/07, 15/10
        urssafDates.push(`${year}-01-15`);
        urssafDates.push(`${year}-04-15`);
        urssafDates.push(`${year}-07-15`);
        urssafDates.push(`${year}-10-15`);
    }

    urssafDates.forEach((date, idx) => {
        schedule.push({
            id: `URSSAF-${year}-${date}`,
            date: date,
            label: `URSSAF Acompte ${frequency === 'quarterly' ? 'T' : 'M'}${idx + 1}`,
            amount: urssafInstallment,
            organization: 'URSSAF_AA',
            type: 'PROVISION',
            confidence: context.options.estimateMode ? 'ESTIMATED' : 'CERTIFIED',
            status: 'PENDING',
            sourceLineCodes: urssafSourceCodes
        });
    });

    // 2. IRCEC Schedule (Annual, Deadline 31/12)
    if (ircecTotal > 0) {
        const ircecSourceCodes = ircecLines.map(t => t.code);
        schedule.push({
            id: `IRCEC-${year}-12-31`,
            date: `${year}-12-31`,
            label: 'IRCEC cotisation annuelle (Date limite)',
            amount: ircecTotal,
            organization: 'IRCEC',
            type: 'PROVISION',
            confidence: 'ESTIMATED',
            status: 'PENDING',
            sourceLineCodes: ircecSourceCodes
        });
    }

    // 3. VAT Schedule
    const vatLines = taxes.filter(t => t.category === 'VAT');
    const vatTotal = vatLines.reduce((sum, t) => sum + t.amount, 0);

    if (vatTotal > 0) {
        const vatFrequency = context.options.vatPaymentFrequency || 'annual';

        if (vatFrequency === 'monthly') {
            // Schedule each monthly liability for the NEXT month (e.g. 20th)
            vatLines.forEach(line => {
                const mIndex = line.metadata?.monthIndex as number; // 0-11
                if (typeof mIndex === 'number') {
                    // Pay in M+1
                    let payYear = year;
                    let payMonth = mIndex + 2; // +1 for next month, +1 for 1-based index

                    if (payMonth > 12) {
                        payMonth = 1;
                        payYear += 1;
                    }

                    const dateStr = `${payYear}-${payMonth.toString().padStart(2, '0')}-20`;

                    // Only add to schedule if it falls within the dashboard view range?
                    // Dashboard usually shows current year. 
                    // Jan VAT -> Paid Feb (Visible)
                    // Dec VAT -> Paid Jan N+1 (Visible if N+1 view, or just projected)

                    schedule.push({
                        id: `VAT-${year}-${line.code}`,
                        date: dateStr,
                        label: `TVA (Solde ${line.metadata?.month})`,
                        amount: line.amount,
                        organization: 'DGFIP',
                        type: 'PROVISION', // Usually Balance
                        confidence: 'ESTIMATED',
                        status: 'PENDING',
                        sourceLineCodes: [line.code]
                    });
                }
            });
        } else {
            // Annual
            // One big payment in May N+1 usually (CA12)
            // Or Dec N? User asked for "repercuter sur le montant de la recette dans le dashboard".
            // If they are in "Annual" mode, they pay nothing monthly.
            // So we schedule 1 payment in next year.
            schedule.push({
                id: `VAT-${year}-ANNUAL`,
                date: `${year + 1}-05-01`, // Approx
                label: `TVA Solde Annuel (${year})`,
                amount: vatTotal,
                organization: 'DGFIP',
                type: 'BALANCE',
                confidence: 'ESTIMATED',
                status: 'PENDING',
                sourceLineCodes: vatLines.map(t => t.code)
            });
        }
    }

    return schedule.sort((a, b) => a.date.localeCompare(b.date));
}
