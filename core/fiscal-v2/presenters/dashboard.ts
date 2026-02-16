import { FiscalOutput, TaxLineItem, ScheduleItem, ComputedBases } from '../domain/types';
import { DashboardModel, DashboardModelSchema } from './types';
import * as sel from './selectors';

export function toDashboardModel(output: FiscalOutput, asOfDate: Date): DashboardModel {
    // ---------- 0) Canonical inputs ----------
    const allLines: TaxLineItem[] = [
        ...output.taxes.urssaf,
        ...output.taxes.ircec,
        ...output.taxes.vat,
        ...output.taxes.ir
    ];

    // ---------- 1) Totals (LOAD view = sum of line items) ----------
    const totalTaxesCents = sel.sumLineAmounts(allLines);

    // Aggregates for Kpi
    const urssafTotalCents = sel.sumByOrganization(allLines, 'URSSAF_AA');
    const raapTotalCents = sel.sumByOrganization(allLines, 'IRCEC');

    // VAT summary (Signature changed: bases, lines)
    const vat = sel.computeVatView(output.bases.vat, output.taxes.vat);

    // ---------- 2) CASH DUE view (from schedule) ----------
    // Define "due now" as all schedule items with status PENDING and date >= asOfDate
    const taxesDueCents = sel.sumDueSchedule(output.schedule, asOfDate);

    // ---------- 3) Next due ----------
    const next = sel.selectNextDue(output.schedule, asOfDate);

    // ---------- 4) Breakdowns (must sum to totalTaxesCents) ----------
    // We construct breakdowns manually or via helper.
    // The user suggested `sel.buildOrgBreakdown` but I didn't verify if I added it.
    // I did NOT add `buildOrgBreakdown` and `buildCategoryBreakdown` in step 1683. I only added basic sums.
    // I need to implement the breakdown building logic here or add it to selectors.
    // Let's implement it here to be explicit and control the percentageBps.

    // Using typed keys for strictness
    const orgs = ['URSSAF_AA', 'IRCEC', 'DGFIP', 'OTHER'] as const;
    const byOrganization = orgs.map(org => {
        const amountCents = sel.sumByOrganization(allLines, org);
        return {
            key: org,
            label: org === 'URSSAF_AA' ? 'URSSAF' : org,
            amountCents,
            percentageBps: sel.toPercentageBps(amountCents, totalTaxesCents),
            lineCodes: sel.codesWhere(allLines, l => l.organization === org)
        };
    });
    // Note: User said "Si amount=0, on peut ne pas inclure". But for strict sum invariant, we MUST include everything (or at least non-zero).
    // including negatives.

    const cats = ['SOCIAL', 'FISCAL', 'VAT'] as const;
    const byCategory = cats.map(cat => {
        const amountCents = sel.sumByCategory(allLines, cat);
        return {
            key: cat,
            label: cat,
            amountCents,
            percentageBps: sel.toPercentageBps(amountCents, totalTaxesCents),
            lineCodes: sel.codesWhere(allLines, l => l.category === cat)
        };
    });

    // ---------- 5) Explain (must have sources) ----------
    const rawExplain = {
        urssafTotalCents: {
            formula: 'SUM(Lines where Org=URSSAF_AA)',
            sourceLineCodes: sel.codesWhere(allLines, l => l.organization === 'URSSAF_AA')
        },
        raapTotalCents: {
            formula: 'SUM(Lines where Org=IRCEC)',
            sourceLineCodes: sel.codesWhere(allLines, l => l.organization === 'IRCEC')
        },
        totalTaxesCents: {
            formula: 'SUM(All Tax Lines)',
            sourceLineCodes: sel.uniqueSorted(allLines.map(l => l.code))
        },
        taxesDueCents: {
            formula: 'SUM(schedule.amount WHERE status=PENDING AND due>=asOf)',
            scheduleIds: sel.idsWhere(output.schedule, s => sel.isDue(s, asOfDate))
        }
    };

    // Filter out empty sources (Strict Schema)
    const explain = Object.fromEntries(
        Object.entries(rawExplain).filter(([_, val]) => {
            const v = val as any;
            const hasLines = v.sourceLineCodes && v.sourceLineCodes.length > 0;
            const hasSched = v.scheduleIds && v.scheduleIds.length > 0;
            return hasLines || hasSched;
        })
    );

    // ---------- 6) Cashflow by month (group by org with scheduleIds unique+sorted) ----------
    const scheduleByMonth = sel.groupScheduleByMonth(output.schedule);
    const months = Object.keys(scheduleByMonth).sort();
    const currentMonth = sel.formatLocalYYYYMM(asOfDate);

    const taxesDueByMonth = months.map(month => {
        const items = scheduleByMonth[month];

        // group by org
        const byOrgMap = new Map<string, { org: any; amount: number; ids: string[] }>();
        for (const it of items) {
            const k = it.organization;
            const prev = byOrgMap.get(k);
            if (!prev) {
                byOrgMap.set(k, { org: k, amount: it.amount, ids: [it.id] });
            } else {
                prev.amount += it.amount;
                prev.ids.push(it.id);
            }
        }

        const groupedItems = Array.from(byOrgMap.values())
            .map(g => ({
                org: g.org,
                amount: g.amount,
                scheduleIds: sel.uniqueSorted(g.ids)
            }))
            .sort((a, b) => String(a.org).localeCompare(String(b.org)));

        const totalDueCents = groupedItems.reduce((s, g) => s + g.amount, 0);

        const status: 'PAST' | 'CURRENT' | 'FUTURE' =
            month < currentMonth ? 'PAST' :
                month === currentMonth ? 'CURRENT' :
                    'FUTURE';

        return { month, totalDueCents, items: groupedItems, status };
    });


    // ---------- 7) Compose DashboardModel ----------
    const dashboard = {
        meta: {
            dashboardModelVersion: '1.0' as const,
            asOfDate: asOfDate.toISOString(), // strict ISO with Z
            engineVersion: output.metadata.engineVersion,
            rulesetYear: output.metadata.rulesetYear,
            rulesetRevision: output.metadata.rulesetRevision,
            paramsFingerprint: output.metadata.paramsFingerprint,
            fiscalOutputHash: output.metadata.fiscalHash,
            mode: output.metadata.mode
        },
        kpis: {
            fiscalBaseCents: output.bases.fiscal.totalNetTaxable,
            socialBaseCents: output.bases.social.total,
            urssafTotalCents,
            raapTotalCents,
            totalTaxesCents,
            taxesDueCents,
            explain: explain
        },
        nextDue: next ? {
            date: next.date, // YYYY-MM-DD
            amountCents: next.amount,
            organization: next.organization,
            label: next.label,
            confidence: next.confidence,
            daysRemaining: sel.daysBetweenLocal(asOfDate, next.date)
        } : null,
        breakdowns: {
            byOrganization,
            byCategory,
            vat
        },
        cashflow: {
            taxesDueByMonth
        },
        tables: {
            lineItems: allLines,
            schedule: output.schedule
        }
    };

    // Final Contract Safety Check (throws if invalid)
    return DashboardModelSchema.parse(dashboard);
}
