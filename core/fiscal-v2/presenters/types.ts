import { z } from 'zod';
import { TaxLineItemSchema, ScheduleItemSchema } from '@/core/fiscal-v2/domain/types';



// --- Shared Enums ---
export const OrganizationSchema = z.enum(['URSSAF_AA', 'IRCEC', 'DGFIP', 'OTHER']);
export type DashboardOrganization = z.infer<typeof OrganizationSchema>;

export const TaxCategorySchema = z.enum(['SOCIAL', 'FISCAL', 'VAT']);
export type DashboardTaxCategory = z.infer<typeof TaxCategorySchema>;

export const FiscalModeSchema = z.enum(['CERTIFIED', 'ESTIMATED']);
export type FiscalMode = z.infer<typeof FiscalModeSchema>;

export const ConfidenceSchema = z.enum(['ESTIMATED', 'CERTIFIED']); // Item-level confidence
export type Confidence = z.infer<typeof ConfidenceSchema>;

// --- Validators ---
// Strict ISO-8601 with Timezone (Z or offset) to avoid implicit local time interpretation
const ISODateTimeSchema = z.string().regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
    "Must be ISO-8601 datetime with timezone (e.g. 2026-06-01T10:00:00Z)"
);
const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const ISOYearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM");

// Basis Points: 0 to 10000 (where 10000 = 100%)
const PercentageBpsSchema = z.number().int().min(0).max(10000);

const UniqueSortedStringArray = z.array(z.string()).superRefine((arr, ctx) => {
    const unique = new Set(arr);
    if (unique.size !== arr.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Array must contain unique strings" });
    }
    // Check sorted: simple string comparison
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Array must be sorted alphabetically" });
            break;
        }
    }
});


// --- Explanation Trace ---
export const ExplanationSchema = z.object({
    formula: z.string(),
    sourceLineCodes: UniqueSortedStringArray.optional(),
    scheduleIds: UniqueSortedStringArray.optional()
}).superRefine((val, ctx) => {
    const hasLineCodes = val.sourceLineCodes && val.sourceLineCodes.length > 0;
    const hasScheduleIds = val.scheduleIds && val.scheduleIds.length > 0;
    if (!hasLineCodes && !hasScheduleIds) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Explanation must reference at least one source (LineCodes or ScheduleIds)" });
    }
});
export type Explanation = z.infer<typeof ExplanationSchema>;

// --- Sub-Models ---

// --- Sub-Models ---

// 1. Next Due Payment
export const NextDueSchema = z.object({
    date: ISODateSchema, // YYYY-MM-DD
    amountCents: z.number().int(),
    organization: OrganizationSchema,
    label: z.string(),
    confidence: ConfidenceSchema,
    daysRemaining: z.number().int()
});
export type NextDue = z.infer<typeof NextDueSchema>;

// 2. Breakdown Items
const BaseBreakdownItemSchema = z.object({
    label: z.string(),
    amountCents: z.number().int(),
    percentageBps: PercentageBpsSchema,
    lineCodes: UniqueSortedStringArray
});

export const OrgBreakdownItemSchema = BaseBreakdownItemSchema.extend({
    key: OrganizationSchema
});
export type OrgBreakdownItem = z.infer<typeof OrgBreakdownItemSchema>;

export const CatBreakdownItemSchema = BaseBreakdownItemSchema.extend({
    key: TaxCategorySchema
});
export type CatBreakdownItem = z.infer<typeof CatBreakdownItemSchema>;

// 3. VAT Specifics
export const VatSummarySchema = z.object({
    collectedCents: z.number().int(),
    deductibleCents: z.number().int(),
    balanceCents: z.number().int(), // Raw Balance

    // Explicit Splitting for KPI
    vatDueCents: z.number().int(), // MAX(0, balance)
    vatCreditCents: z.number().int(), // MAX(0, -balance)

    status: z.enum(['PAYMENT_DUE', 'CREDIT_CARRY_FORWARD', 'BALANCED'])
}).superRefine((v, ctx) => {
    const due = Math.max(0, v.balanceCents);
    const credit = Math.max(0, -v.balanceCents);

    if (v.vatDueCents !== due) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "vatDueCents must equal max(0, balanceCents)" });
    }
    if (v.vatCreditCents !== credit) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "vatCreditCents must equal max(0, -balanceCents)" });
    }

    const expectedStatus = v.balanceCents > 0 ? 'PAYMENT_DUE' :
        v.balanceCents < 0 ? 'CREDIT_CARRY_FORWARD' :
            'BALANCED';

    if (v.status !== expectedStatus) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "vat.status inconsistent with balanceCents" });
    }
});
export type VatSummary = z.infer<typeof VatSummarySchema>;

// 4. Monthly Cashflow (Tax Only)
export const MonthlyTaxFlowSchema = z.object({
    month: ISOYearMonthSchema, // YYYY-MM
    totalDueCents: z.number().int(),
    items: z.array(z.object({
        org: OrganizationSchema,
        amount: z.number().int(),
        scheduleIds: UniqueSortedStringArray.optional()
    })),
    status: z.enum(['PAST', 'CURRENT', 'FUTURE'])
});
export type MonthlyTaxFlow = z.infer<typeof MonthlyTaxFlowSchema>;


// --- Main Dashboard Model ---

export const DashboardModelSchema = z.object({
    meta: z.object({
        dashboardModelVersion: z.literal('1.0'),
        asOfDate: ISODateTimeSchema, // Deterministic ISO DateTime
        engineVersion: z.string(),
        rulesetYear: z.number(),
        rulesetRevision: z.string(), // Mandatory
        paramsFingerprint: z.string(), // Mandatory
        fiscalOutputHash: z.string(),
        mode: FiscalModeSchema
    }),

    kpis: z.object({
        // Bases
        fiscalBaseCents: z.number().int(),
        socialBaseCents: z.number().int(),

        // Taxes Load (Line Items)
        urssafTotalCents: z.number().int(),
        raapTotalCents: z.number().int(),

        // Removed vatLoadCents to avoid ambiguity. VAT is handled in breakdowns.vat

        totalTaxesCents: z.number().int(), // Total Load (Sum of Line Items)
        taxesDueCents: z.number().int(),   // Total Cash Due (Payment View)

        // Traces
        explain: z.record(z.string(), ExplanationSchema)
    }),

    nextDue: NextDueSchema.nullable(),

    breakdowns: z.object({
        byOrganization: z.array(OrgBreakdownItemSchema),
        byCategory: z.array(CatBreakdownItemSchema),
        vat: VatSummarySchema
    }),

    cashflow: z.object({
        taxesDueByMonth: z.array(MonthlyTaxFlowSchema)
    }),

    // Raw Tables (Filtered/Sorted views of inputs)
    tables: z.object({
        lineItems: z.array(TaxLineItemSchema),
        schedule: z.array(ScheduleItemSchema)
    })
}).superRefine((m, ctx) => {
    // Cross-Model Invariant: Breakdowns must sum to Total Taxes (Load)
    const sumOrg = m.breakdowns.byOrganization.reduce((s, b) => s + b.amountCents, 0);
    const sumCat = m.breakdowns.byCategory.reduce((s, b) => s + b.amountCents, 0);

    // Tolerance check not needed as we use integer cents and logic enforces strict sums.
    if (sumOrg !== m.kpis.totalTaxesCents) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["breakdowns", "byOrganization"],
            message: `Sum(byOrganization) [${sumOrg}] must equal kpis.totalTaxesCents [${m.kpis.totalTaxesCents}]`
        });
    }

    if (sumCat !== m.kpis.totalTaxesCents) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["breakdowns", "byCategory"],
            message: `Sum(byCategory) [${sumCat}] must equal kpis.totalTaxesCents [${m.kpis.totalTaxesCents}]`
        });
    }
});

export type DashboardModel = z.infer<typeof DashboardModelSchema>;
