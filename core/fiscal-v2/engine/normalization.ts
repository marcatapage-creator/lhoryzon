import { FiscalLedger, FiscalOperation, Operation } from "../domain/types";

// --- Normalization Logic ---

export function normalizeToFiscalLedger(operations: Operation[], isIS: boolean = false, defaultVatRate: number = 0): FiscalLedger {
    const fiscalOps: FiscalOperation[] = [];

    for (const op of operations) {
        if (!op.entries || op.entries.length === 0) continue;

        op.entries.forEach(entry => {
            // [HOTFIX V2.5] Recurrence Start Date Logic
            const startDate = new Date(entry.date);
            const startMonthIndex = isNaN(startDate.getTime()) ? 0 : startDate.getMonth(); // 0-11

            // Determine target months based on periodicity
            let targetMonths: number[] = [];

            if (entry.periodicity === 'monthly') {
                // All months from startMonth to Dec
                for (let m = startMonthIndex; m < 12; m++) targetMonths.push(m);
            } else if (entry.periodicity === 'quarterly') {
                // Quarters: Jan(0), Apr(3), Jul(6), Oct(9)
                [0, 3, 6, 9].forEach(q => {
                    if (q >= startMonthIndex) targetMonths.push(q);
                });
            } else {
                // Yearly / One-off: Just the specific month of the date
                targetMonths.push(startMonthIndex);
            }

            // Base calculation
            const amountTTC = entry.amount_ttc_cents;
            const rateBps = entry.vatRate_bps ?? 0;
            const divisor = 1 + (rateBps / 10000);
            const amountHT = Math.round(amountTTC / divisor);
            const amountTVA = amountTTC - amountHT;

            // Generate Operations
            targetMonths.forEach((mIndex, i) => {
                const monthName = monthStr(mIndex + 1);

                const direction: 'in' | 'out' = entry.nature === 'INCOME' ? 'in' : 'out';
                const kind: FiscalOperation['kind'] =
                    entry.nature === 'INCOME' ? 'REVENUE' :
                        entry.nature === 'TAX_SOCIAL' ? 'TAX_PAYMENT' :
                            entry.nature === 'TRANSFER' ? 'TRANSFER' : 'EXPENSE';

                fiscalOps.push({
                    id: `${entry.id}-${mIndex}`, // ID based on month index to be unique
                    date: normalizeDate(op.year, monthName, startDate.getDate() || 15),
                    amount_ht: amountHT,
                    tva_rate_bps: rateBps,
                    amount_tva: amountTVA,
                    amount_ttc: amountTTC,
                    direction,
                    scope: entry.scope,
                    kind,
                    category: entry.category,
                    subcategory: entry.subcategory,
                    label: entry.label + (entry.periodicity !== 'yearly' ? ` (${monthName})` : '')
                });
            });
        });
    }

    // Sort by Date + ID for determinism
    fiscalOps.sort((a, b) => {
        const d = a.date.localeCompare(b.date);
        if (d !== 0) return d;
        return a.id.localeCompare(b.id);
    });

    return { operations: fiscalOps };
}

function normalizeDate(year: number, month: string, day: number): string {
    const m = monthIndex(month);
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
}

function monthStr(i: number): string {
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i - 1];
}

function monthIndex(m: string): string {
    const map: Record<string, string> = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    return map[m] || '01';
}
