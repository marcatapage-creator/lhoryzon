import { FiscalModule, FiscalLedger, FiscalContext, ComputedBases, TaxLineItem, ScheduleItem, FiscalAlert, QualifiedLedger } from "@/core/fiscal-v2/domain/types";
import { computeBases } from "./bases";
import { computeUrssaf } from "./urssaf";
import { computeIrcec } from "./ircec";
import { computeVat } from "./vat";
import { computeSchedule } from "./schedule";
import { computeAlerts } from "./alerts";
import { AA_2026_Fingerprint } from "./fingerprint";

export const ArtistAuthorModule: FiscalModule = {
    computeBases(ledger: QualifiedLedger, context: FiscalContext): ComputedBases {
        return computeBases(ledger, context);
    },

    computeUrssaf(bases: ComputedBases, context: FiscalContext): TaxLineItem[] {
        return computeUrssaf(bases, context);
    },

    computeIrcec(bases: ComputedBases, context: FiscalContext): TaxLineItem[] {
        return computeIrcec(bases, context);
    },

    computeVat(ledger: QualifiedLedger, context: FiscalContext): TaxLineItem[] {
        return computeVat(ledger, context);
    },

    computeIncomeTax(bases: ComputedBases, context: FiscalContext): TaxLineItem[] {
        return [];
    },

    computeSchedule(taxes: TaxLineItem[], context: FiscalContext): ScheduleItem[] {
        return computeSchedule(taxes, context);
    },

    computeAlerts(bases: ComputedBases, taxes: TaxLineItem[], context: FiscalContext): FiscalAlert[] {
        return computeAlerts(bases, taxes, context);
    },

    getParamsFingerprint(): string {
        return AA_2026_Fingerprint;
    },

    getRevision(): string {
        return "2026.1";
    }
};

export { AA_2026_Fingerprint };
