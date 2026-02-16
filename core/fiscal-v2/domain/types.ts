import { z } from 'zod';

// --- Primitives ---
export type DateString = string; // YYYY-MM-DD

export type MoneyCents = number; // Integer (cents)
export type RateBps = number; // Basis Points (1% = 100)

// --- Shared Core Types (Unified) ---
export const MonthSchema = z.enum([
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]);
export type Month = z.infer<typeof MonthSchema>;
export const MONTHS: Month[] = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const PeriodicitySchema = z.enum(["monthly", "quarterly", "yearly"]);
export type Periodicity = z.infer<typeof PeriodicitySchema>;

// --- MVP V1: Canonical Input Model ---
export const AppEntrySchema = z.object({
    id: z.string(),
    nature: z.enum(['INCOME', 'EXPENSE_PRO', 'EXPENSE_PERSO', 'TAX_SOCIAL', 'TRANSFER']),
    label: z.string(),
    amount_ttc_cents: z.number().int(),
    vatRate_bps: z.number().int().default(0),
    date: z.string(), // YYYY-MM-DD or ISO
    scope: z.enum(['pro', 'perso']),
    category: z.string().default('OTHER'), // To be mapped to engine categories
    subcategory: z.string().optional(),
    periodicity: PeriodicitySchema.default("yearly"),
});
export type AppEntry = z.infer<typeof AppEntrySchema>;

export const OperationSchema = z.object({
    id: z.string(),
    year: z.number().int(),
    isScenario: z.boolean().default(false),
    scenarioName: z.string().optional(),
    isArtistAuthor: z.boolean().default(false),
    cashCurrent_cents: z.number().int().default(0),
    vatPaymentFrequency: PeriodicitySchema.default("yearly"),
    vatCarryover_cents: z.number().int().default(0),

    // The simplified entry list
    entries: z.array(AppEntrySchema).default([]),

    meta: z.object({
        version: z.number().default(3),
        createdAt: z.string(),
        updatedAt: z.string(),
    }),
});
export type Operation = z.infer<typeof OperationSchema>;

// --- Operation (Input) ---
export interface FiscalOperation {
    id: string;
    date: DateString;
    amount_ht: MoneyCents;
    tva_rate_bps: RateBps; // Normalized to BPS
    amount_tva: MoneyCents;
    amount_ttc: MoneyCents;
    direction: 'in' | 'out';
    scope: 'pro' | 'perso'; // Strict separation

    // Categorization
    kind: 'REVENUE' | 'EXPENSE' | 'TAX_PAYMENT' | 'TRANSFER';
    counterpartyRole?: 'CLIENT' | 'URSSAF' | 'IRCEC' | 'DGFIP' | 'OTHER';
    category: string;
    subcategory?: string;

    // Metadata
    tags?: string[];
    label?: string;
}

// --- Qualified Operation (After Qualification Step) ---
export interface QualifiedOperation extends FiscalOperation {
    isPro: boolean;
    isArtistic: boolean; // For AA social base
    isSocialCurrentYear: boolean; // Is relevant for bases calculation
    isVatCollectable: boolean;
    isVatDeductible: boolean;
    isTaxDeductible: boolean; // For Fiscal Base
}

// --- Ledger (Normalized Input) ---
export interface FiscalLedger {
    operations: FiscalOperation[];
}

export interface QualifiedLedger {
    operations: QualifiedOperation[];
}

// --- Context (Internal Engine Context) ---
export interface FiscalContext {
    taxYear: number;
    now: DateString; // Mandatory for determinism
    userStatus: 'artist_author' | 'freelance' | 'sasu';
    fiscalRegime: 'micro' | 'reel';
    vatRegime: 'franchise' | 'reel_mensuel' | 'reel_trimestriel';

    history?: {
        n1_social_base_cents?: number;
        n1_urssaf_paid_cents?: number;
        n1_ircec_paid_cents?: number;
    };

    household: {
        parts: number;
        children: number;
    };

    options: {
        estimateMode: boolean;
        urssafFrequency?: 'monthly' | 'quarterly';
        vatPaymentFrequency?: 'monthly' | 'yearly';
        defaultVatRate?: number; // In basis points
    };
}

export const TaxLineItemSchema = z.object({
    code: z.string(),
    label: z.string(),
    base: z.number().int(),
    rate_bps: z.number().int(),
    amount: z.number().int(),
    organization: z.enum(['URSSAF_AA', 'IRCEC', 'DGFIP', 'OTHER']),
    category: z.enum(['SOCIAL', 'FISCAL', 'VAT']),
    confidence: z.enum(['ESTIMATED', 'CERTIFIED']),
    juridicalBasis: z.object({
        source: z.enum(['URSSAF', 'IRCEC', 'DGFIP']),
        ref: z.string().optional()
    }).optional(),
    formula: z.string().optional(),
    capApplied: z.object({
        name: z.string(),
        value: z.number().int()
    }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});
export type TaxLineItem = z.infer<typeof TaxLineItemSchema>;

// --- Schedule (Cash flow) ---
export const ScheduleItemSchema = z.object({
    id: z.string(),
    date: z.string(),
    label: z.string(),
    amount: z.number().int(),
    organization: z.enum(['URSSAF_AA', 'IRCEC', 'DGFIP', 'OTHER']),
    type: z.enum(['PROVISION', 'REGULARIZATION', 'BALANCE']),
    confidence: z.enum(['ESTIMATED', 'CERTIFIED']),
    status: z.enum(['LOCKED', 'PENDING']),
    sourceLineCodes: z.array(z.string()).optional()
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

// --- Alerts ---
export interface FiscalAlert {
    code: string;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    triggerValue?: number; // e.g. current revenue
    thresholdValue?: number; // e.g. threshold
    recommendedAction?: string;
}

// --- Output (Result) ---
export interface ComputedBases {
    social: {
        total: MoneyCents;
        artistic: MoneyCents;
        other: MoneyCents;
    };
    fiscal: {
        totalNetTaxable: MoneyCents;
        revenue: MoneyCents;
        deductibleExpenses: MoneyCents;
    };
    vat: {
        collected: MoneyCents;
        deductible: MoneyCents;
        balance: MoneyCents;
        byPeriod: Record<string, { collected: number, deductible: number, balance: number }>;
    };
}

export interface FiscalOutput {
    metadata: {
        engineVersion: string;
        rulesetYear: number;
        rulesetRevision: string;
        fiscalHash: string;
        computedAt: string;
        paramsFingerprint: string;
        mode: 'ESTIMATED' | 'CERTIFIED';
    };

    bases: ComputedBases;

    taxes: {
        urssaf: TaxLineItem[];
        ircec: TaxLineItem[];
        vat: TaxLineItem[];
        ir: TaxLineItem[];
    };

    schedule: ScheduleItem[];
    alerts: FiscalAlert[];
}

// --- Ledger Projection Types ---
export interface TreasuryAnchor {
    amount_cents: number;
    monthIndex: number; // 0 = Jan, -1 = Start of Year
}

export interface LedgerMonth {
    month: Month;
    income_ttc_cents: number;
    expense_perso_ttc_cents: number;
    expense_pro_ttc_cents: number;
    expense_autre_ttc_cents: number;
    vat_collected_cents: number;
    vat_deductible_cents: number;
    vat_due_cents: number;
    urssaf_cash_cents: number;
    ircec_cash_cents: number;
    ir_cash_cents: number;
    vat_cash_cents: number;
    other_taxes_cash_cents: number;
    net_cashflow_cents: number;
    closing_treasury_cents: number;
    provision_social_cents: number;
    provision_tax_cents: number;
    provision_vat_cents: number;
}

export interface LedgerFinal {
    byMonth: Record<Month, LedgerMonth>;
    initialTreasury: number;
    projectedTreasury: number;
    currentYearProvisionSocial_cents: number;
    currentYearProvisionTax_cents: number;
    currentYearProvisionVat_cents: number;
}

// --- Snapshot (SSOT Output) ---
export interface FiscalSnapshot extends FiscalOutput {
    ledgerFinal: LedgerFinal;
    projectedOperations: FiscalOperation[]; // Need granular view for Safe-to-Spend
}

// --- Module Interface ---
export interface FiscalModule {
    computeBases(ledger: QualifiedLedger, context: FiscalContext): ComputedBases;
    computeUrssaf(bases: ComputedBases, context: FiscalContext): TaxLineItem[];
    computeIrcec(bases: ComputedBases, context: FiscalContext): TaxLineItem[];
    computeVat(ledger: QualifiedLedger, context: FiscalContext): TaxLineItem[];
    computeIncomeTax(bases: ComputedBases, context: FiscalContext): TaxLineItem[];
    computeSchedule(taxes: TaxLineItem[], context: FiscalContext): ScheduleItem[];
    computeAlerts(bases: ComputedBases, taxes: TaxLineItem[], context: FiscalContext): FiscalAlert[];
}

export interface FiscalRuleset {
    year: number;
    getModule(status: FiscalContext['userStatus']): FiscalModule;
    version: string;
    getParamsFingerprint(): string;
}
