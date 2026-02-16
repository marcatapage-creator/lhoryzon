import { useMemo } from 'react';
import { computeFiscalSnapshot } from '@/core/fiscal-v2';
import { FiscalContext, Operation, TreasuryAnchor } from '@/core/fiscal-v2/domain/types';

interface SuggestionResult {
    urssaf: number;
    ircec: number;
    tax: number;
    vat: number;
}

/**
 * Hook to provide real-time fiscal suggestions based on income.
 * Used primarily in the Compta Wizard to suggest URSSAF, IRCEC, and Tax payments.
 */
export function useFiscalSuggestions(params: {
    salaryCents: number;
    userStatus: 'artist_author' | 'freelance' | 'sasu';
    fiscalRegime: 'micro' | 'reel';
    vatEnabled: boolean;
    nbParts?: number;
}): SuggestionResult {
    const { salaryCents, userStatus, fiscalRegime, vatEnabled, nbParts = 1 } = params;

    return useMemo(() => {
        if (!salaryCents || salaryCents <= 0) {
            return { urssaf: 0, ircec: 0, tax: 0, vat: 0 };
        }

        // 1. Build Virtual Context
        const context: FiscalContext = {
            taxYear: 2026,
            now: new Date().toISOString(),
            userStatus,
            fiscalRegime,
            vatRegime: vatEnabled ? 'reel_trimestriel' : 'franchise',
            household: { parts: nbParts, children: 0 },
            options: {
                estimateMode: true,
                defaultVatRate: vatEnabled ? 2000 : 0
            }
        };

        // 2. Create Virtual Operation (V3 entries)
        const virtualOp: Operation = {
            id: 'suggestion-virtual-op',
            year: 2026,
            isScenario: true,
            isArtistAuthor: userStatus === 'artist_author',
            cashCurrent_cents: 0,
            vatPaymentFrequency: 'yearly',
            vatCarryover_cents: 0,
            entries: [
                {
                    id: 'suggestion-salary-entry',
                    nature: 'INCOME',
                    label: 'Revenu Artistique (Simulé)',
                    amount_ttc_cents: salaryCents,
                    vatRate_bps: 0,
                    date: '2026-12-15',
                    scope: 'pro',
                    category: 'OTHER',
                    periodicity: 'yearly'
                }
            ],
            meta: {
                version: 3,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };

        // 3. Compute
        const anchor: TreasuryAnchor = { amount_cents: 0, monthIndex: -1 };
        const snapshot = computeFiscalSnapshot([virtualOp], context, anchor);

        // 4. Extract
        const urssaf = snapshot.taxes.urssaf.reduce((s, t) => s + t.amount, 0);
        const ircec = snapshot.taxes.ircec.reduce((s, t) => s + t.amount, 0);
        const tax = snapshot.taxes.ir.reduce((s, t) => s + t.amount, 0);
        const vat = snapshot.bases.vat.balance; // VAT Due

        return { urssaf, ircec, tax, vat };
    }, [salaryCents, userStatus, fiscalRegime, vatEnabled, nbParts]);
}
