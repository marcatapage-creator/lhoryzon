import { FiscalSnapshot } from "../domain/types";

export interface SimulatorViewModel {
    base: {
        netPocket: number;
        totalSocial: number;
        totalTax: number;
        totalVat: number;
    };
    simulated: {
        netPocket: number;
        totalSocial: number;
        totalTax: number;
        totalVat: number;
    };
    delta: {
        realCost: number;
        savedVat: number;
        savedTax: number;
        savedSocial: number;
    };
}

export class SimulatorPresenter {
    public getComparison(base: FiscalSnapshot, simulated: FiscalSnapshot): SimulatorViewModel {
        const baseStats = this.extractStats(base);
        const simStats = this.extractStats(simulated);

        return {
            base: baseStats,
            simulated: simStats,
            delta: {
                realCost: baseStats.netPocket - simStats.netPocket,
                savedVat: simStats.totalVat - baseStats.totalVat, // Usually savedVat is positive if more deductible
                savedTax: baseStats.totalTax - simStats.totalTax,
                savedSocial: baseSocialStats(base) - simSocialStats(simulated)
            }
        };
    }

    private extractStats(snapshot: FiscalSnapshot) {
        // netPocket = Total Revenue - Total Pro - Total Social - Total Tax - Total Vat (Due)
        const ledger = snapshot.ledgerFinal;
        let totalRev = 0, totalPro = 0, totalSocial = 0, totalTax = 0, totalVatBalance = snapshot.bases.vat.balance;

        Object.values(ledger.byMonth).forEach(r => {
            totalRev += r.income_ttc_cents;
            totalPro += r.expense_pro_ttc_cents;
            // Note: social/tax in ledger are cash flows. 
            // For simulator, we should use the THEORETICAL liability from engine output for better accuracy on "Real Cost".
        });

        const liabilitySocial = snapshot.taxes.urssaf.concat(snapshot.taxes.ircec).reduce((s, t) => s + t.amount, 0);
        const liabilityTax = snapshot.taxes.ir.reduce((s, t) => s + t.amount, 0);

        return {
            netPocket: totalRev - totalPro - liabilitySocial - liabilityTax - totalVatBalance,
            totalSocial: liabilitySocial,
            totalTax: liabilityTax,
            totalVat: totalVatBalance
        };
    }
}

function baseSocialStats(snapshot: FiscalSnapshot): number {
    return snapshot.taxes.urssaf.concat(snapshot.taxes.ircec).reduce((s, t) => s + t.amount, 0);
}

function simSocialStats(snapshot: FiscalSnapshot): number {
    return snapshot.taxes.urssaf.concat(snapshot.taxes.ircec).reduce((s, t) => s + t.amount, 0);
}
