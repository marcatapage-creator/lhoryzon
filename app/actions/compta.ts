"use server";

import { Operation, FiscalProfile, OperationSchema, AppEntry } from "@/lib/compta/types";
import { getBusinessParams } from "@/lib/compta/tax_params/registry";
import { calculateParamsHash } from "@/lib/compta/money";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Helper to ensure JSON records (ByMonth) only contain valid numbers
function sanitizeByMonth(record: unknown): Record<string, number> {
    const sanitized: Record<string, number> = {};
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Ensure record is a valid object
    const validRecord = (record && typeof record === 'object' && !Array.isArray(record)) ? (record as Record<string, unknown>) : {};

    months.forEach(m => {
        const val = validRecord[m];
        // Ensure strictly non-negative integer
        const num = Number(val);
        if (Number.isFinite(num)) {
            sanitized[m] = Math.max(0, Math.round(num));
        } else {
            sanitized[m] = 0;
        }
    });
    return sanitized;
}

export async function getOperations(): Promise<Operation[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const ops = await prisma.accountingOperation.findMany({
        where: { userId: session.user.id },
        include: { items: true },
        orderBy: { year: "desc" }
    });

    return ops.map(op => {
        const entries: AppEntry[] = [];

        // 1. Map existing items (AccountingItem) to V3 entries
        const dbItems = op.items || [];
        dbItems.forEach((item) => {
            // Explicit cast to ignore stale Prisma client types in lint
            const itemWithDate = item as any;
            entries.push({
                id: item.id,
                nature: item.type as AppEntry['nature'],
                label: item.label,
                amount_ttc_cents: Number(item.amount_cents),
                vatRate_bps: item.vatRate_bps,
                date: itemWithDate.date || `${op.year}-06-15`,
                scope: 'pro',
                category: item.category,
                periodicity: (item.periodicity as AppEntry['periodicity']) || 'yearly'
            });
        });

        // 2. Map Specialized Columns (Shim) to entries if not already represented in items
        // This ensures compatibility with data that was only in specialized columns
        if (Number(op.urssaf_cents) > 0 && !entries.find(e => e.nature === 'TAX_SOCIAL' && e.category === 'URSSAF')) {
            entries.push({
                id: `legacy-urssaf-${op.id}`,
                nature: 'TAX_SOCIAL',
                label: 'URSSAF (Legacy)',
                amount_ttc_cents: Number(op.urssaf_cents),
                vatRate_bps: 0,
                date: `${op.year}-01-01`,
                scope: 'pro',
                category: 'URSSAF',
                periodicity: (op.urssafPeriodicity || 'yearly') as any
            });
        }

        // Similar for IRCEC and Tax... (Simplified for MVP V1)

        const baseOp: Operation = {
            id: op.id,
            year: op.year,
            isScenario: op.isScenario,
            scenarioName: op.scenarioName || undefined,
            isArtistAuthor: !!op.isArtistAuthor,
            cashCurrent_cents: Number(op.cashCurrent_cents),
            vatPaymentFrequency: (op.vatPaymentFrequency as AppEntry['periodicity']) || "yearly",
            vatCarryover_cents: Number(op.vatCarryover_cents || 0),
            entries,
            meta: {
                version: 3, // Default to 3 as DB doesn't store version yet
                createdAt: op.createdAt.toISOString(),
                updatedAt: op.updatedAt.toISOString(),
            }
        };

        return baseOp;
    });
}

export async function saveOperation(op: Operation) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // A. Runtime Validation (V3)
    const validated = OperationSchema.parse(op);

    // B. Calculate Fiscal Fingerprint for Audit
    const profile: FiscalProfile = { status: 'sasu', vatEnabled: true, isPro: true }; // 'sasu' replaces 'sas_is'
    const params = getBusinessParams(validated.year, profile.status);
    const fiscalHash = calculateParamsHash(params);
    const engineVersion = "3.0.0-shim";

    // C. Shim: Extract specialized fields from entries for legacy DB columns
    const entries = validated.entries;

    const urssafEntry = entries.find(e => e.nature === 'TAX_SOCIAL' && (e.category === 'URSSAF' || e.label.includes('URSSAF')));
    const ircecEntry = entries.find(e => e.nature === 'TAX_SOCIAL' && (e.category === 'IRCEC' || e.label.includes('IRCEC')));
    const taxEntry = entries.find(e => e.nature === 'TAX_SOCIAL' && (e.category === 'INCOME_TAX' || e.label.includes('Impôt')));

    // 1. Upsert Operation Metadata
    const operation = await prisma.accountingOperation.upsert({
        where: {
            userId_year: {
                userId: session.user.id,
                year: validated.year
            }
        },
        create: {
            userId: session.user.id,
            year: validated.year,
            cashCurrent_cents: BigInt(Math.round(validated.cashCurrent_cents)),
            isScenario: validated.isScenario,
            scenarioName: validated.scenarioName,
            isArtistAuthor: validated.isArtistAuthor,
            vatPaymentFrequency: validated.vatPaymentFrequency,
            vatCarryover_cents: BigInt(Math.round(validated.vatCarryover_cents)),

            // Shim Populate
            urssaf_cents: BigInt(Math.round(urssafEntry?.amount_ttc_cents || 0)),
            urssafPeriodicity: urssafEntry?.periodicity || "yearly",
            ircec_cents: BigInt(Math.round(ircecEntry?.amount_ttc_cents || 0)),
            ircecPeriodicity: ircecEntry?.periodicity || "yearly",
            incomeTax_cents: BigInt(Math.round(taxEntry?.amount_ttc_cents || 0)),
            incomeTaxPeriodicity: taxEntry?.periodicity || "yearly",

            engineVersion,
            fiscalHash
        },
        update: {
            cashCurrent_cents: BigInt(Math.round(validated.cashCurrent_cents)),
            isScenario: validated.isScenario,
            scenarioName: validated.scenarioName,
            isArtistAuthor: validated.isArtistAuthor,
            vatPaymentFrequency: validated.vatPaymentFrequency,
            vatCarryover_cents: BigInt(Math.round(validated.vatCarryover_cents)),

            urssaf_cents: BigInt(Math.round(urssafEntry?.amount_ttc_cents || 0)),
            urssafPeriodicity: urssafEntry?.periodicity || "yearly",
            ircec_cents: BigInt(Math.round(ircecEntry?.amount_ttc_cents || 0)),
            ircecPeriodicity: ircecEntry?.periodicity || "yearly",
            incomeTax_cents: BigInt(Math.round(taxEntry?.amount_ttc_cents || 0)),
            incomeTaxPeriodicity: taxEntry?.periodicity || "yearly",

            engineVersion,
            fiscalHash,
            updatedAt: new Date()
        }
    });

    // 2. Clear and Replace items (Entries)
    await prisma.accountingItem.deleteMany({
        where: { operationId: operation.id }
    });

    if (validated.entries.length > 0) {
        const itemsToCreate = validated.entries.map(entry => ({
            label: entry.label,
            amount_cents: BigInt(Math.round(entry.amount_ttc_cents)),
            vatRate_bps: entry.vatRate_bps || 0,
            type: entry.nature,
            category: entry.category || 'OTHER',
            periodicity: entry.periodicity || 'yearly',
            date: entry.date,
            operationId: operation.id,
            selectedMonths: []
        }));

        console.log("[saveOperation] Creating items:", JSON.stringify(itemsToCreate, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value, 2));

        await prisma.accountingItem.createMany({
            data: itemsToCreate
        });
    }

    revalidatePath("/dashboard");
    revalidatePath("/operations");
}

export async function deleteOperation(year: number) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    try {
        await prisma.accountingOperation.delete({
            where: {
                userId_year: {
                    userId: session.user.id,
                    year: year
                }
            }
        });
        revalidatePath("/dashboard");
        revalidatePath("/operations");
        return { success: true };
    } catch (error) {
        console.error("Delete operation error:", error);
        return { success: false, error: "Not found" };
    }
}
