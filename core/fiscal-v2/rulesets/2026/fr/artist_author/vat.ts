
import { FiscalContext, QualifiedLedger, TaxLineItem } from "@/core/fiscal-v2/domain/types";
import { MONTHS } from "@/core/fiscal-v2/domain/types";

export function computeVat(ledger: QualifiedLedger, context: FiscalContext): TaxLineItem[] {
    // If franchise, no VAT
    if (context.vatRegime === 'franchise') return [];

    const vatLines: TaxLineItem[] = [];

    // Track per-month balance
    const byMonth: Record<string, { collected: number, deductible: number, balance: number }> = {};
    MONTHS.forEach(m => byMonth[m] = { collected: 0, deductible: 0, balance: 0 });

    const monthMap: Record<string, string> = {
        '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
        '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
    };

    for (const op of ledger.operations) {
        if (!op.isPro) continue;

        const date = new Date(op.date);
        const mIndex = (date.getMonth() + 1).toString().padStart(2, '0');
        const monthName = monthMap[mIndex];

        if (!byMonth[monthName]) continue;

        if (op.isVatCollectable) {
            byMonth[monthName].collected += op.amount_tva;
        }
        if (op.isVatDeductible) {
            byMonth[monthName].deductible += op.amount_tva;
        }
    }

    // Generate Tax Lines (Liability)
    MONTHS.forEach((m, idx) => {
        const data = byMonth[m];
        data.balance = data.collected - data.deductible;

        if (data.balance > 0) {
            vatLines.push({
                code: `VAT_${m.toUpperCase()}`,
                label: `TVA Due ${m}`,
                base: 0, // Not strictly tracking base turnover here, just tax amount
                rate_bps: 2000, // Approximate
                amount: data.balance,
                organization: 'DGFIP',
                category: 'VAT',
                confidence: context.options.estimateMode ? 'ESTIMATED' : 'CERTIFIED',
                metadata: { month: m, monthIndex: idx }
            });
        }
    });

    return vatLines;
}
