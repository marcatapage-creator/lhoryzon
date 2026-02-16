import { z } from 'zod';

// --- Primitives ---
export const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid YYYY-MM-DD date");
export type DateString = z.infer<typeof DateStringSchema>;

export const MoneyCentsSchema = z.number().int();
export type MoneyCents = z.infer<typeof MoneyCentsSchema>;

export const RateBpsSchema = z.number().int();
export type RateBps = z.infer<typeof RateBpsSchema>;

// --- Operation (Input) ---
export const FiscalOperationSchema = z.object({
    id: z.string(),
    date: DateStringSchema,
    amount_ht: MoneyCentsSchema,
    tva_rate_bps: RateBpsSchema,
    amount_tva: MoneyCentsSchema,
    amount_ttc: MoneyCentsSchema,
    direction: z.enum(['in', 'out']),
    scope: z.enum(['pro', 'perso']),
    kind: z.enum(['REVENUE', 'EXPENSE', 'TAX_PAYMENT', 'TRANSFER']),
    counterpartyRole: z.enum(['CLIENT', 'URSSAF', 'IRCEC', 'DGFIP', 'OTHER']).optional(),
    category: z.string(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()).optional(),
    label: z.string().optional()
});

// --- Context ---
export const FiscalContextSchema = z.object({
    taxYear: z.number().int().min(2000).max(2100),
    userStatus: z.enum(['artist_author', 'freelance', 'sasu']),
    fiscalRegime: z.enum(['micro', 'reel']),
    vatRegime: z.enum(['franchise', 'reel_mensuel', 'reel_trimestriel']),
    history: z.object({
        n1_social_base_cents: MoneyCentsSchema.optional(),
        n1_urssaf_paid_cents: MoneyCentsSchema.optional(),
        n1_ircec_paid_cents: MoneyCentsSchema.optional(),
    }).optional(),
    household: z.object({
        parts: z.number().min(1),
        children: z.number().min(0)
    }),
    artistAuthor: z.object({
        isMDA: z.boolean(),
        hasPrecompte: z.boolean().optional()
    }).optional(),
    options: z.object({
        estimateMode: z.boolean(),
        featureFlags: z.record(z.string(), z.boolean()).optional()
    })
});

// --- Ledger ---
export const FiscalLedgerSchema = z.object({
    operations: z.array(FiscalOperationSchema)
});

// --- LineItem ---
export const TaxLineItemSchema = z.object({
    code: z.string(),
    label: z.string(),
    base: MoneyCentsSchema,
    rate_bps: RateBpsSchema,
    amount: MoneyCentsSchema,
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
        value: MoneyCentsSchema
    }).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

// --- Alert ---
export const FiscalAlertSchema = z.object({
    code: z.string(),
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
    message: z.string(),
    triggerValue: z.number().optional(),
    thresholdValue: z.number().optional(),
    recommendedAction: z.string().optional()
});

// --- Output ---
export const ComputedBasesSchema = z.object({
    social: z.object({
        total: MoneyCentsSchema,
        artistic: MoneyCentsSchema,
        other: MoneyCentsSchema
    }),
    fiscal: z.object({
        totalNetTaxable: MoneyCentsSchema,
        revenue: MoneyCentsSchema,
        deductibleExpenses: MoneyCentsSchema
    }),
    vat: z.object({
        collected: MoneyCentsSchema,
        deductible: MoneyCentsSchema,
        balance: MoneyCentsSchema,
        byPeriod: z.record(z.string(), z.object({
            collected: z.number(),
            deductible: z.number(),
            balance: z.number()
        }))
    })
});

export const FiscalOutputSchema = z.object({
    metadata: z.object({
        engineVersion: z.string(),
        rulesetYear: z.number(),
        fiscalHash: z.string(),
        computedAt: z.string(),
        paramsFingerprint: z.string()
    }),
    bases: ComputedBasesSchema,
    taxes: z.object({
        urssaf: z.array(TaxLineItemSchema),
        ircec: z.array(TaxLineItemSchema),
        vat: z.array(TaxLineItemSchema),
        ir: z.array(TaxLineItemSchema)
    }),
    schedule: z.array(z.object({
        date: DateStringSchema,
        label: z.string(),
        amount: MoneyCentsSchema,
        organization: z.enum(['URSSAF_AA', 'IRCEC', 'DGFIP', 'OTHER']),
        type: z.enum(['PROVISION', 'REGULARIZATION', 'BALANCE']),
        confidence: z.enum(['ESTIMATED', 'CERTIFIED']),
        status: z.enum(['LOCKED', 'PENDING']),
        sourceLineCodes: z.array(z.string()).optional()
    })),
    alerts: z.array(FiscalAlertSchema)
});
