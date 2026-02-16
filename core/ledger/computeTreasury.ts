
import { LedgerFinal } from "./types";
import { MONTHS } from "@/lib/compta/types";

export function computeTreasury(ledger: LedgerFinal): LedgerFinal {
    let currentTreasury = ledger.initialTreasury;

    MONTHS.forEach(m => {
        const row = ledger.byMonth[m];

        // Cashflows
        // Inflow: Income
        const inflow = row.income_ttc_cents;

        // Outflow: Expenses + Taxes
        const outflow =
            row.expense_pro_ttc_cents +
            row.expense_perso_ttc_cents +
            row.urssaf_cash_cents +
            row.ircec_cash_cents +
            row.ir_cash_cents +
            row.vat_cash_cents +
            row.other_taxes_cash_cents;

        row.net_cashflow_cents = inflow - outflow;

        currentTreasury += row.net_cashflow_cents;
        row.closing_treasury_cents = currentTreasury;
    });

    ledger.projectedTreasury = currentTreasury;

    // Invariant Check (Dev Mode)
    if (process.env.NODE_ENV === 'development') {
        const totalFlow = MONTHS.reduce((acc, m) => acc + ledger.byMonth[m].net_cashflow_cents, 0);
        const delta = currentTreasury - ledger.initialTreasury;
        if (Math.abs(totalFlow - delta) > 1) { // 1 cent tolerance
            console.error(`🚨 Treasury Invariant Failed: Flow(${totalFlow}) != Delta(${delta})`);
        }
    }

    return ledger;
}
