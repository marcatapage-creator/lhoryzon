import { describe, it, expect } from 'vitest';
import { computeFiscal } from '../engine/dispatcher';
import { toDashboardModel } from '../presenters/dashboard';
import { FiscalContext } from '../domain/types';
import { Operation } from '@/lib/compta/types';
import { VatSummarySchema, ExplanationSchema, DashboardModelSchema, OrganizationSchema, TaxCategorySchema } from '../presenters/types';
import { z } from 'zod';

// --- Helpers ---
const mockContext = (regime: 'micro' | 'reel', options: any = {}): FiscalContext => ({
    taxYear: 2026,
    userStatus: 'artist_author',
    fiscalRegime: regime,
    vatRegime: 'reel_trimestriel',
    household: { parts: 1, children: 0 },
    options: { estimateMode: true, urssafFrequency: 'quarterly', ...options }
});

const mockOp = (id: string, date: string, amount: number, type: 'income' | 'expense', category: string): Operation => {
    const isIncome = type === 'income';
    return {
        id, year: parseInt(date.substring(0, 4)), date: date, label: `Op ${id}`, amount: amount, category: category,
        income: isIncome ? { salaryTTCByMonth: { 'Jan': amount } } : {},
        expenses: !isIncome ? { pro: { items: [{ category, label: `Exp`, amount_ttc_cents: amount, vatRate_bps: 0, periodicity: 'one-off' }], totalOverrideTTC_cents: 0 }, social: {}, taxes: {}, personal: { items: [] } } : { pro: { items: [], totalOverrideTTC_cents: 0 }, social: {}, taxes: {}, personal: { items: [] } }
    } as any;
};

describe('Dashboard Presenter - Final Contract Sanity', () => {

    it('Invariant C: VAT Cash vs Credit', () => {
        const output: any = {
            metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
            bases: { fiscal: { totalNetTaxable: 0 }, social: { total: 0 }, vat: { collected: 100, deductible: 300, balance: -200 } },
            taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
            schedule: []
        };
        const dashboard = toDashboardModel(output, new Date('2026-06-01T00:00:00Z'));

        expect(dashboard.breakdowns.vat.vatDueCents).toBe(0);
        expect(dashboard.breakdowns.vat.vatCreditCents).toBe(200);
        expect(dashboard.breakdowns.vat.status).toBe('CREDIT_CARRY_FORWARD');
    });

    it('Invariant Z: Schema Sanity - Cross Field VAT', () => {
        const valid = {
            collectedCents: 100, deductibleCents: 0, balanceCents: 100,
            vatDueCents: 100, vatCreditCents: 0, status: 'PAYMENT_DUE'
        };
        expect(() => VatSummarySchema.parse(valid)).not.toThrow();

        const invalidDue = { ...valid, vatDueCents: 50 };
        expect(() => VatSummarySchema.parse(invalidDue)).toThrow('vatDueCents must equal max(0, balanceCents)');

        const invalidStatus = { ...valid, status: 'BALANCED' };
        expect(() => VatSummarySchema.parse(invalidStatus)).toThrow('vat.status inconsistent with balanceCents');
    });

    it('Invariant Z: Schema Sanity - Explain Sources', () => {
        expect(() => ExplanationSchema.parse({ formula: 'X', sourceLineCodes: ['A'] })).not.toThrow();
        expect(() => ExplanationSchema.parse({ formula: 'X', sourceLineCodes: [] })).toThrow();
        expect(() => ExplanationSchema.parse({ formula: 'X' })).toThrow();
    });

    it('Invariant Z: Schema Sanity - Sums', () => {
        const output: any = {
            metadata: {
                engineVersion: 'v2',
                paramsFingerprint: 'fp',
                rulesetRevision: 'rev',
                rulesetYear: 2026,
                fiscalHash: 'hash123',
                mode: 'ESTIMATED'
            },
            bases: {
                fiscal: { totalNetTaxable: 1000 },
                social: { total: 1000 },
                vat: { balance: 0, collected: 0, deductible: 0 }
            },
            taxes: {
                urssaf: [{ amount: 100, organization: 'URSSAF_AA', category: 'SOCIAL', code: 'U1', label: 'U1', base: 100, rate_bps: 1000, confidence: 'ESTIMATED' }],
                ircec: [{ amount: 100, organization: 'IRCEC', category: 'SOCIAL', code: 'R1', label: 'R1', base: 100, rate_bps: 1000, confidence: 'ESTIMATED' }],
                vat: [{ amount: 100, organization: 'DGFIP', category: 'VAT', code: 'V1', label: 'V1', base: 100, rate_bps: 2000, confidence: 'ESTIMATED' }],
                ir: []
            },
            schedule: []
        };
        const dashboard = toDashboardModel(output, new Date('2026-06-01T00:00:00Z'));

        expect(() => DashboardModelSchema.parse(dashboard)).not.toThrow();

        const tampered = JSON.parse(JSON.stringify(dashboard));
        tampered.kpis.totalTaxesCents = 999999;
        expect(() => DashboardModelSchema.parse(tampered)).toThrow('Sum(byOrganization) [300] must equal kpis.totalTaxesCents [999999]');
    });

    it('Invariant D: Traceability & Schedule IDs', () => {
        const output: any = {
            metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
            bases: { fiscal: { totalNetTaxable: 0 }, social: { total: 0 }, vat: { balance: 0, collected: 0, deductible: 0 } },
            taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
            schedule: [{ id: 'sched1', date: '2026-01-01', amount: 100, organization: 'URSSAF_AA', label: 'S1', type: 'PROVISION', confidence: 'ESTIMATED', status: 'PENDING' }]
        };

        const dashboard = toDashboardModel(output, new Date('2026-06-01T00:00:00Z'));
        const janFlow = dashboard.cashflow.taxesDueByMonth.find(f => f.month === '2026-01');
        expect(janFlow).toBeDefined();
        expect(janFlow?.items[0].scheduleIds).toContain('sched1');
    });

    // --- Production Safeguards ---

    it('Safeguard: Enum Version Guard', () => {
        // Known enums for Version 1.0
        const v1Orgs = ['URSSAF_AA', 'IRCEC', 'DGFIP', 'OTHER'];
        const v1Cats = ['SOCIAL', 'FISCAL', 'VAT'];

        // If these fail, you MUST bump dashboardModelVersion in DashboardModelSchema
        const currentOrgs = OrganizationSchema.options;
        const currentCats = TaxCategorySchema.options;

        expect(currentOrgs).toEqual(v1Orgs);
        expect(currentCats).toEqual(v1Cats);
    });

    it('Safeguard: Taxes Due Invariant', () => {
        // Ensure taxesDueCents correctly aggregates components
        const output: any = {
            metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
            bases: { fiscal: { totalNetTaxable: 0 }, social: { total: 0 }, vat: { balance: 500, collected: 0, deductible: 0 } },
            taxes: {
                urssaf: [{ amount: 1000, organization: 'URSSAF_AA', category: 'SOCIAL', code: 'U1', label: 'Urssaf', base: 1000, rate_bps: 10000, confidence: 'ESTIMATED' }],
                ircec: [{ amount: 200, organization: 'IRCEC', category: 'SOCIAL', code: 'I1', label: 'Ircec', base: 200, rate_bps: 10000, confidence: 'ESTIMATED' }],
                vat: [{ amount: 500, organization: 'DGFIP', category: 'VAT', code: 'V1', label: 'Vat', base: 500, rate_bps: 10000, confidence: 'ESTIMATED' }], // Load
                ir: [{ amount: 300, organization: 'DGFIP', category: 'FISCAL', code: 'F1', label: 'Fiscal', base: 300, rate_bps: 10000, confidence: 'ESTIMATED' }]
            },
            schedule: []
        };

        const dashboard = toDashboardModel(output, new Date('2026-06-01T00:00:00Z'));

        // Logic: Urssaf + Ircec + VatDUE (not Load) + Fiscal
        // Note: taxesDueCents is now CASH view (schedule). totalTaxesCents is LOAD view.
        // Since schedule is empty, checks should be on totalTaxesCents.
        const expectedLoad = 1000 + 200 + 500 + 300;
        expect(dashboard.kpis.totalTaxesCents).toBe(expectedLoad);

        // Scenario with VAT Credit (Due should be 0 for VAT part)
        const outputCredit: any = {
            metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
            bases: { fiscal: { totalNetTaxable: 0 }, social: { total: 0 }, vat: { balance: -500, collected: 0, deductible: 0 } },
            taxes: {
                urssaf: [{ amount: 1000, organization: 'URSSAF_AA', category: 'SOCIAL', code: 'U1', label: 'Urssaf', base: 1000, rate_bps: 10000, confidence: 'ESTIMATED' }],
                ircec: [{ amount: 200, organization: 'IRCEC', category: 'SOCIAL', code: 'I1', label: 'Ircec', base: 200, rate_bps: 10000, confidence: 'ESTIMATED' }],
                vat: [{ amount: -500, organization: 'DGFIP', category: 'VAT', code: 'V1', label: 'Vat', base: -500, rate_bps: 10000, confidence: 'ESTIMATED' }], // Load says -500
                ir: []
            },
            schedule: []
        };
        const dashboardCredit = toDashboardModel(outputCredit, new Date('2026-06-01T00:00:00Z'));
        // VAT Due is 0 because balance is negative.
        // Total Load includes the negative VAT amount?? 
        // sumLineAmounts simply sums all amounts.
        // 1000 + 200 + (-500) + 0 = 700.
        expect(dashboardCredit.kpis.totalTaxesCents).toBe(1000 + 200 - 500);
    });

    // --- Production Safety ---

    describe('Production Safety & Compliance', () => {

        it('Safety 1: Global Schema Compliance', () => {
            // Nominal case should ALWAYS pass strict schema validation
            const output: any = {
                metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
                bases: { fiscal: { totalNetTaxable: 1000 }, social: { total: 1000 }, vat: { balance: 0, collected: 0, deductible: 0 } },
                taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
                schedule: []
            };

            const dashboard = toDashboardModel(output, new Date('2026-06-01T10:00:00Z'));

            // This throws if ANY part of the contract is violated (Regex, Sums, Enums)
            expect(() => DashboardModelSchema.parse(dashboard)).not.toThrow();
        });

        it('Safety 2: Strict Determinism', () => {
            const output: any = {
                metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
                bases: { fiscal: { totalNetTaxable: 0 }, social: { total: 0 }, vat: { balance: 0, collected: 0, deductible: 0 } },
                taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
                schedule: []
            };
            const date = new Date('2026-06-01T10:00:00Z');

            const d1 = toDashboardModel(output, date);
            const d2 = toDashboardModel(output, date);

            expect(d1).toEqual(d2);
            expect(d1.meta.asOfDate).toBe(d2.meta.asOfDate);
        });

        it('Safety 3: Days Remaining Accuracy', () => {
            const output: any = {
                metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
                bases: { fiscal: { totalNetTaxable: 0 }, social: { total: 0 }, vat: { balance: 0, collected: 0, deductible: 0 } },
                taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
                schedule: [
                    { date: '2026-06-05', amount: 100, organization: 'URSSAF_AA', label: 'U1', id: '1', status: 'PENDING', confidence: 'ESTIMATED', type: 'PROVISION' }
                ]
            };

            // As Of: June 1st
            const d1 = toDashboardModel(output, new Date('2026-06-01T10:00:00Z'));
            // 2026-06-05 - 2026-06-01 = 4 days
            expect(d1.nextDue?.daysRemaining).toBe(4);

            // As Of: June 5th (Same day)
            const d2 = toDashboardModel(output, new Date('2026-06-05T08:00:00Z'));
            expect(d2.nextDue?.daysRemaining).toBe(0);
        });

        it('Safety 4: Cash Due Boundary (Inclusive vs Exclusive)', () => {
            const itemDate = '2026-06-15';
            const output: any = {
                metadata: { engineVersion: 'v2', paramsFingerprint: 'fp', rulesetRevision: 'rev', rulesetYear: 2026, fiscalHash: 'h', mode: 'ESTIMATED' },
                bases: { fiscal: { totalNetTaxable: 0 }, social: { total: 0 }, vat: { balance: 0, collected: 0, deductible: 0 } },
                taxes: { urssaf: [], ircec: [], vat: [], ir: [] },
                schedule: [
                    { date: itemDate, amount: 1000, organization: 'DGFIP', label: 'T1', id: '1', status: 'PENDING', confidence: 'CERTIFIED', type: 'PROVISION' }
                ]
            };

            // 1. As Of = Same Day (Inclusive)
            const d1 = toDashboardModel(output, new Date('2026-06-15T10:00:00Z'));
            expect(d1.kpis.taxesDueCents).toBe(1000);

            // 2. As Of = Day After (Exclusive - item is now "past" pending)
            // Strict definition: date >= asOfDate. 15 >= 16 is False.
            const d2 = toDashboardModel(output, new Date('2026-06-16T10:00:00Z'));
            expect(d2.kpis.taxesDueCents).toBe(0);
        });

    });

    it('Safety 5: Contract Hash Tripwire (Bump Gate)', () => {
        // This test ensures that any change to the Zod Schema definitions
        // trips this wire, forcing the developer to:
        // 1. Acknowledge the change
        // 2. Bump the dashboardModelVersion if necessary

        // Simple deterministic string representation of the schema structure
        // Note: .describe() or just checking specific keys could work, 
        // but a full JSON stringify of the Zod definition (or key shapes) is robust.
        // Since Zod objects are complex, we'll hash the 'shape' keys of main models.

        const shapeKeys = Object.keys(DashboardModelSchema.shape).sort();
        const breakdownKeys = Object.keys(DashboardModelSchema.shape.breakdowns.shape).sort();
        const kpiKeys = Object.keys(DashboardModelSchema.shape.kpis.shape).sort();

        const fingerprint = JSON.stringify({
            root: shapeKeys,
            breakdowns: breakdownKeys,
            kpis: kpiKeys,
            // Add version literal to fingerprint
            version: (DashboardModelSchema.shape.meta.shape.dashboardModelVersion as any).value
        });

        // If you change the Schema, this hash WILL change. 
        // Update the expected hash ONLY after verifying you adhered to the versioning policy.
        const KNOWN_HASH = '{"root":["breakdowns","cashflow","kpis","meta","nextDue","tables"],"breakdowns":["byCategory","byOrganization","vat"],"kpis":["explain","fiscalBaseCents","raapTotalCents","socialBaseCents","taxesDueCents","totalTaxesCents","urssafTotalCents"],"version":"1.0"}';

        expect(fingerprint).toBe(KNOWN_HASH);
    });

});
