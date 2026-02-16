import { TaxLineItem, ScheduleItem, ComputedBases } from "@/core/fiscal-v2/domain/types";
import {
    VatSummary,
    DashboardOrganization,
    DashboardTaxCategory,
} from "./types";

export function sumLineAmounts(items: TaxLineItem[]): number {
    return items.reduce((s, i) => s + i.amount, 0);
}

export function sumByOrganization(items: TaxLineItem[], org: DashboardOrganization): number {
    return items.filter(i => i.organization === org).reduce((s, i) => s + i.amount, 0);
}

export function sumByCategory(items: TaxLineItem[], cat: DashboardTaxCategory): number {
    return items.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0);
}

export function toPercentageBps(amount: number, total: number): number {
    if (total <= 0) return 0;
    const raw = Math.round((amount * 10000) / total);
    return Math.max(0, Math.min(10000, raw));
}

export function uniqueSorted(arr: string[]): string[] {
    return Array.from(new Set(arr)).sort();
}

// ---------- Schedule: Due logic ----------
export function isDue(item: ScheduleItem, asOfDate: Date): boolean {
    if (item.status !== "PENDING") return false;
    if (item.amount <= 0) return false;

    const [y, m, d] = item.date.split("-").map(Number);
    const itemDay = new Date(y, m - 1, d);

    const asOfDay = new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
    return itemDay >= asOfDay;
}

export function sumDueSchedule(schedule: ScheduleItem[], asOfDate: Date): number {
    return schedule.filter(s => isDue(s, asOfDate)).reduce((sum, s) => sum + s.amount, 0);
}

export function selectNextDue(schedule: ScheduleItem[], asOfDate: Date): ScheduleItem | null {
    const due = schedule.filter(s => isDue(s, asOfDate));
    if (due.length === 0) return null;

    due.sort((a, b) => {
        const c = a.date.localeCompare(b.date);
        if (c !== 0) return c;
        // Prefer CERTIFIED if same date
        if (a.confidence !== b.confidence) return a.confidence === "CERTIFIED" ? -1 : 1;
        return a.id.localeCompare(b.id);
    });

    return due[0];
}

export function groupScheduleByMonth(schedule: ScheduleItem[]): Record<string, ScheduleItem[]> {
    const groups: Record<string, ScheduleItem[]> = {};
    for (const item of schedule) {
        if (item.amount <= 0) continue;
        const month = item.date.substring(0, 7);
        (groups[month] ||= []).push(item);
    }
    // stable order per month
    for (const m of Object.keys(groups)) {
        groups[m].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    }
    return groups;
}

export function formatLocalYYYYMM(date: Date): string {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
}

export function daysBetweenLocal(from: Date, toDateStr: string): number {
    const [y, m, d] = toDateStr.split("-").map(Number);
    const target = new Date(y, m - 1, d);
    const current = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    return Math.ceil((target.getTime() - current.getTime()) / 86_400_000);
}

// ---------- VAT ----------
export function computeVatView(basesVat: ComputedBases["vat"], vatLines: TaxLineItem[]): VatSummary {
    const balance = basesVat.balance;
    const vatDueCents = Math.max(0, balance);
    const vatCreditCents = Math.max(0, -balance);

    const status: VatSummary["status"] =
        balance > 0 ? "PAYMENT_DUE" :
            balance < 0 ? "CREDIT_CARRY_FORWARD" :
                "BALANCED";

    return {
        collectedCents: basesVat.collected,
        deductibleCents: basesVat.deductible,
        balanceCents: balance,
        vatDueCents,
        vatCreditCents,
        status,
    };
}

// ---------- Traceability ----------
export function getLineCodes(items: TaxLineItem[], filterFn: (i: TaxLineItem) => boolean): string[] {
    return uniqueSorted(items.filter(filterFn).map(i => i.code));
}

export function idsWhere(schedule: ScheduleItem[], filterFn: (s: ScheduleItem) => boolean): string[] {
    return uniqueSorted(schedule.filter(filterFn).map(s => s.id));
}

export function codesWhere(items: TaxLineItem[], filterFn: (i: TaxLineItem) => boolean): string[] {
    return uniqueSorted(items.filter(filterFn).map(i => i.code));
}
