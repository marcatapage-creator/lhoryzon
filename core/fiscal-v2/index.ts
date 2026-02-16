import { Operation, FiscalContext, FiscalSnapshot, TreasuryAnchor } from "./domain/types";
import { computeFiscal } from "./engine/dispatcher";
import { normalizeToFiscalLedger } from "./engine/normalization";
import { projectLedger } from "./engine/projection";

/**
 * SSOT: Single Source of Truth for all fiscal calculations.
 * This is the ONLY function the rest of the application should call for fiscal logic.
 * 
 * @param operations List of accounting operations for the target year.
 * @param context User's fiscal profile and configuration.
 * @param anchor Initial treasury or targeted treasury at a specific month.
 * @returns A strictly raw FiscalSnapshot. Formatting is handled by Presenters.
 */
export function computeFiscalSnapshot(
    operations: Operation[],
    context: FiscalContext,
    anchor: TreasuryAnchor = { amount_cents: 0, monthIndex: -1 }
): FiscalSnapshot {

    // 1. Run Core Engine (Bases, Taxes, Schedule, Alerts)
    const output = computeFiscal(operations, context);

    // 2. Normalize Ops for Projection (Sync with Engine)
    const isIS = context.userStatus === 'sasu';
    const defaultVatRate = context.options.defaultVatRate || 0;
    const normalizedLedger = normalizeToFiscalLedger(operations, isIS, defaultVatRate);

    // 3. Project Ledger (Treasury, Monthly Breakdown, Provisions)
    const ledgerFinal = projectLedger(
        output,
        normalizedLedger.operations,
        anchor,
        {
            vatPaymentFrequency: context.options.vatPaymentFrequency,
            hasManualSchedule: {
                urssaf: !!operations[0]?.entries?.some(e => e.nature === 'TAX_SOCIAL' && e.category === 'URSSAF'),
                ircec: !!operations[0]?.entries?.some(e => e.nature === 'TAX_SOCIAL' && e.category === 'IRCEC'),
                tax: !!operations[0]?.entries?.some(e => e.nature === 'TAX_SOCIAL' && (e.category === 'IR' || e.category === 'FISCAL'))
            }
        }
    );

    // 4. Wrap as Snapshot (SSOT)
    return {
        ...output,
        ledgerFinal,
        projectedOperations: normalizedLedger.operations
    };
}
