import { describe, it, expect } from 'vitest';
import { computeFiscalSnapshot } from '../index';
import { FiscalSnapshot, Operation, FiscalContext, TreasuryAnchor, MONTHS } from '../domain/types';

/**
 * Validates SSOT Invariants for a given snapshot.
 */
export function assertSnapshotInvariants(snapshot: FiscalSnapshot) {
    const ledger = snapshot.ledgerFinal;

    // 1. Σ(Monthly HT) === Annual for Revenues (Fiscal Base)
    let monthlyRevenueHT = 0;
    MONTHS.forEach(m => {
        monthlyRevenueHT += (ledger.byMonth[m].income_ttc_cents - ledger.byMonth[m].vat_collected_cents);
    });

    // Check consistency between projected ledger and engine bases
    expect(monthlyRevenueHT).toBe(snapshot.bases.fiscal.revenue);

    // 2. Hash Stability
    expect(snapshot.metadata.fiscalHash).toBeDefined();
    expect(snapshot.metadata.fiscalHash.length).toBe(64);
}

describe('SSOT Governance & Determinism', () => {
    const mockContext: FiscalContext = {
        taxYear: 2026,
        now: '2026-02-16T12:00:00Z',
        userStatus: 'artist_author', // Important to trigger real ruleset
        fiscalRegime: 'reel',
        vatRegime: 'reel_trimestriel',
        household: { parts: 1, children: 0 },
        options: { estimateMode: true, defaultVatRate: 2000 }
    };

    const mockOps: Operation[] = [{
        id: 'op-1', year: 2026, isScenario: false, isArtistAuthor: true,
        cashCurrent_cents: 0, vatPaymentFrequency: 'yearly', vatCarryover_cents: 0,
        income: { salaryTTCByMonth: { Jan: 120000, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 }, otherIncomeTTC_cents: 0, otherIncomeVATRate_bps: 0, otherIncomeSelectedMonths: [], items: [] },
        expenses: { pro: { items: [] }, social: { urssaf_cents: 0, urssafPeriodicity: 'yearly', ircec_cents: 0, ircecPeriodicity: 'yearly' }, taxes: { incomeTax_cents: 0, incomeTaxPeriodicity: 'yearly' }, personal: { items: [] }, otherItems: [] },
        meta: { version: 2, createdAt: '2026-02-16T12:00:00Z', updatedAt: '2026-02-16T12:00:00Z' }
    }];

    it('should produce exactly the same hash for the same inputs (Determinism)', () => {
        const anchor: TreasuryAnchor = { amount_cents: 0, monthIndex: -1 };
        const run1 = computeFiscalSnapshot(mockOps, mockContext, anchor);
        const run2 = computeFiscalSnapshot(mockOps, mockContext, anchor);

        expect(run1.metadata.fiscalHash).toBe(run2.metadata.fiscalHash);
        expect(run1.metadata.computedAt).toBe(run2.metadata.computedAt);
        expect(run1).toEqual(run2);
    });

    it('should verify snapshot invariants', () => {
        const anchor: TreasuryAnchor = { amount_cents: 0, monthIndex: -1 };
        const snapshot = computeFiscalSnapshot(mockOps, mockContext, anchor);
        assertSnapshotInvariants(snapshot);
    });
});
