import { FiscalModule, FiscalContext, FiscalOutput, Operation } from "@/core/fiscal-v2/domain/types";
import { normalizeToFiscalLedger } from "./normalization";
import { qualifyLedger } from "./qualification";
import { ArtistAuthorModule, AA_2026_Fingerprint } from "@/core/fiscal-v2/rulesets/2026/fr/artist_author/index";
import { sha256Hex, canonicalStringify } from "./hashing";

// --- Dispatcher Logic ---

export function computeFiscal(inputOps: Operation[], context: FiscalContext): FiscalOutput {
    // 4. Pipeline Execution
    // First, use a default rate if specified in options (e.g. 2000 for 20%)
    const defaultVatRate = context.options.defaultVatRate || 0;
    const isIS = context.userStatus === 'sasu'; // SASU is likely IS in the current simple model
    const ledger = normalizeToFiscalLedger(inputOps, isIS, defaultVatRate);

    // 2. Qualify (Fiscal Flags)
    const qualifiedLedger = qualifyLedger(ledger, context);

    // 3. Select Ruleset & Module
    let module: FiscalModule | null = null;
    let paramsFingerprint = "generic-v1";
    let rulesetRevision = "2.0.0";

    if (context.taxYear === 2026 && context.userStatus === 'artist_author') {
        module = ArtistAuthorModule;
        paramsFingerprint = AA_2026_Fingerprint;
        rulesetRevision = "2026.1";
    }

    // Fallback module for Generic/Other status (Supports VAT even if social is incomplete)
    if (!module) {
        console.warn(`[FiscalEngine] No specific module found for status ${context.userStatus}. Using fallback.`);
        module = {
            computeBases: (ledger) => ({
                social: { total: 0, artistic: 0, other: 0 },
                fiscal: { totalNetTaxable: 0, revenue: 0, deductibleExpenses: 0 },
                vat: {
                    collected: ledger.operations.reduce((s, o) => s + (o.isVatCollectable ? o.amount_tva : 0), 0),
                    deductible: ledger.operations.reduce((s, o) => s + (o.isVatDeductible ? o.amount_tva : 0), 0),
                    balance: 0,
                    byPeriod: {}
                }
            }),
            computeUrssaf: () => [],
            computeIrcec: () => [],
            computeVat: () => [],
            computeIncomeTax: () => [],
            computeSchedule: () => [],
            computeAlerts: () => []
        };
    }

    // 4. Pipeline Execution

    // A. Bases Calculation
    const bases = module.computeBases(qualifiedLedger, context);

    // B. Taxes Calculation
    const urssafLines = module.computeUrssaf(bases, context);
    const ircecLines = module.computeIrcec(bases, context);
    const vatLines = module.computeVat(qualifiedLedger, context);

    const allTaxes = [...urssafLines, ...ircecLines, ...vatLines];

    // C. Scheduling
    const schedule = module.computeSchedule(allTaxes, context);

    // D. Alerting
    const alerts = module.computeAlerts(bases, allTaxes, context);

    // 5. Hashing & Audit (Strict Mode)

    const ledgerSource = qualifiedLedger.operations.map(op => ({
        id: op.id,
        d: op.date,
        dir: op.direction,
        sc: op.scope,
        a_ht: op.amount_ht,
        a_tva: op.amount_tva,
        a_ttc: op.amount_ttc,
        r: op.tva_rate_bps,
        k: op.kind,
        cat: op.category,
        flags: {
            p: op.isPro ? 1 : 0,
            a: op.isArtistic ? 1 : 0,
            sc: op.isSocialCurrentYear ? 1 : 0,
            vc: op.isVatCollectable ? 1 : 0,
            vd: op.isVatDeductible ? 1 : 0,
            td: op.isTaxDeductible ? 1 : 0
        }
    }));
    const ledgerFingerprint = sha256Hex(canonicalStringify(ledgerSource));

    const contextSource = {
        y: context.taxYear,
        s: context.userStatus,
        r: context.fiscalRegime,
        v: context.vatRegime,
        opt: {
            est: context.options.estimateMode ? 1 : 0,
            freq: context.options.urssafFrequency || 'quarterly'
        }
    };
    const contextFingerprint = sha256Hex(canonicalStringify(contextSource));

    // c. Full Fiscal Hash
    const engineVersion = "2.0.0-strict";
    const fiscalHashInput = {
        v: engineVersion,
        ruleset: {
            year: context.taxYear,
            revision: rulesetRevision,
            fps: paramsFingerprint,
        },
        ctx: contextFingerprint,
        dat: ledgerFingerprint
    };
    const fiscalHash = sha256Hex(canonicalStringify(fiscalHashInput));

    return {
        metadata: {
            engineVersion: engineVersion,
            rulesetYear: context.taxYear,
            rulesetRevision: rulesetRevision,
            fiscalHash: fiscalHash,
            computedAt: context.now,
            paramsFingerprint: paramsFingerprint,
            mode: context.options.estimateMode ? 'ESTIMATED' : 'CERTIFIED'
        },
        bases,
        taxes: {
            urssaf: urssafLines,
            ircec: ircecLines,
            vat: vatLines,
            ir: []
        },
        schedule,
        alerts
    };
}
