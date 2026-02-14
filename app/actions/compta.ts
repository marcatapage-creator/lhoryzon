"use server";

import { Operation, FiscalProfile, OperationSchema } from "@/lib/compta/types";
import { getBusinessParams } from "@/lib/compta/tax_params/registry";
import { calculateParamsHash } from "@/lib/compta/money";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getOperations(): Promise<Operation[]> {
    const session = await auth();
    if (!session?.user?.id) {
        return [];
    }

    const ops: any[] = await prisma.accountingOperation.findMany({
        where: { userId: session.user.id },
        include: { items: true } as any,
        orderBy: { year: "desc" }
    });

    return ops.map(op => {
        // Reconstruct Operation object from flat items and specialized fields
        const baseOp: Operation = {
            id: op.id,
            year: op.year,
            isScenario: op.isScenario,
            scenarioName: op.scenarioName || undefined,
            cashCurrent_cents: Number(op.cashCurrent_cents),
            vatPaymentFrequency: (op.vatPaymentFrequency || "yearly") as any,
            vatCarryover_cents: Number(op.vatCarryover_cents || 0),
            income: {
                salaryTTCByMonth: (op.salaryTTCByMonth || { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 }) as any,
                otherIncomeTTC_cents: Number(op.otherIncomeTTC_cents || 0),
                otherIncomeVATRate_bps: op.otherIncomeVATRate_bps || 0,
                otherIncomeSelectedMonths: (op.otherIncomeSelectedMonths || []) as any,
                items: []
            },
            expenses: {
                pro: {
                    totalOverrideTTC_cents: op.totalOverrideTTC_cents ? Number(op.totalOverrideTTC_cents) : null,
                    items: []
                },
                social: {
                    urssaf_cents: Number(op.urssaf_cents || 0),
                    urssafPeriodicity: (op.urssafPeriodicity || "yearly") as any,
                    urssafByMonth: op.urssafByMonth as any,
                    ircec_cents: Number(op.ircec_cents || 0),
                    ircecPeriodicity: (op.ircecPeriodicity || "yearly") as any,
                    ircecByMonth: op.ircecByMonth as any
                },
                taxes: {
                    incomeTax_cents: Number(op.incomeTax_cents || 0),
                    incomeTaxPeriodicity: (op.incomeTaxPeriodicity || "yearly") as any,
                    incomeTaxByMonth: op.incomeTaxByMonth as any
                },
                personal: { items: [] },
                otherItems: []
            },
            meta: {
                version: op.version || 2,
                engineVersion: op.engineVersion || "2.0.0",
                fiscalHash: op.fiscalHash || "",
                createdAt: op.createdAt.toISOString(),
                updatedAt: op.updatedAt.toISOString(),
            }
        };

        // Populate items
        const items = (op.items || []) as any[];
        items.forEach((item: any) => {
            const amount_cents = Number(item.amount_cents);
            const vatRate_bps = Number(item.vatRate_bps);
            const commonFields = {
                id: item.id,
                label: item.label,
                periodicity: item.periodicity as any,
                selectedMonths: item.selectedMonths as any,
                durationMonths: item.durationMonths || undefined
            };

            if (item.type === 'income') {
                baseOp.income.items.push({
                    ...commonFields,
                    amount_ttc_cents: amount_cents,
                    vatRate_bps,
                    type: item.category || 'other'
                } as any);
            } else if (item.type === 'expense') {
                if (item.category === 'pro') {
                    baseOp.expenses.pro.items.push({
                        ...commonFields,
                        amount_ttc_cents: amount_cents,
                        vatRate_bps,
                        category: 'pro'
                    } as any);
                } else if (item.category === 'personal') {
                    baseOp.expenses.personal.items.push({
                        ...commonFields,
                        amount_cents,
                        category: 'personal'
                    } as any);
                } else {
                    baseOp.expenses.otherItems.push({
                        ...commonFields,
                        amount_cents,
                        category: item.category || 'other'
                    } as any);
                }
            }
        });

        return baseOp;
    });
}

export async function saveOperation(op: Operation) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    // A. Runtime Validation
    const validated = OperationSchema.parse(op);

    // B. Calculate Fiscal Fingerprint for Audit
    // We assumeei/bnc for fingerprint if profile not passed (simplified for server action)
    const profile: FiscalProfile = { status: 'ei', vatEnabled: true, isPro: true };
    const params = getBusinessParams(validated.year, profile.status);
    const fiscalHash = calculateParamsHash(params);
    const engineVersion = "2.1.0";

    // 1. Upsert Operation
    const operation: any = await prisma.accountingOperation.upsert({
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

            // Specialized fields
            salaryTTCByMonth: validated.income.salaryTTCByMonth,
            otherIncomeTTC_cents: BigInt(Math.round(validated.income.otherIncomeTTC_cents || 0)),
            otherIncomeVATRate_bps: Math.round(validated.income.otherIncomeVATRate_bps || 0),
            otherIncomeSelectedMonths: validated.income.otherIncomeSelectedMonths,

            totalOverrideTTC_cents: typeof validated.expenses.pro.totalOverrideTTC_cents === 'number'
                ? BigInt(Math.round(validated.expenses.pro.totalOverrideTTC_cents))
                : null,

            urssaf_cents: BigInt(Math.round(validated.expenses.social.urssaf_cents || 0)),
            urssafPeriodicity: validated.expenses.social.urssafPeriodicity,
            urssafByMonth: validated.expenses.social.urssafByMonth || {},

            ircec_cents: BigInt(Math.round(validated.expenses.social.ircec_cents || 0)),
            ircecPeriodicity: validated.expenses.social.ircecPeriodicity,
            ircecByMonth: validated.expenses.social.ircecByMonth || {},

            incomeTax_cents: BigInt(Math.round(validated.expenses.taxes.incomeTax_cents || 0)),
            incomeTaxPeriodicity: validated.expenses.taxes.incomeTaxPeriodicity,
            incomeTaxByMonth: validated.expenses.taxes.incomeTaxByMonth || {},

            vatPaymentFrequency: validated.vatPaymentFrequency,
            vatCarryover_cents: BigInt(Math.round(validated.vatCarryover_cents)),

            // Engine Versioning & Fiscal Fingerprint
            engineVersion,
            fiscalHash
        },
        update: {
            cashCurrent_cents: BigInt(Math.round(validated.cashCurrent_cents)),
            isScenario: validated.isScenario,
            scenarioName: validated.scenarioName,

            salaryTTCByMonth: validated.income.salaryTTCByMonth,
            otherIncomeTTC_cents: BigInt(Math.round(validated.income.otherIncomeTTC_cents || 0)),
            otherIncomeVATRate_bps: Math.round(validated.income.otherIncomeVATRate_bps || 0),
            otherIncomeSelectedMonths: validated.income.otherIncomeSelectedMonths,

            totalOverrideTTC_cents: typeof validated.expenses.pro.totalOverrideTTC_cents === 'number'
                ? BigInt(Math.round(validated.expenses.pro.totalOverrideTTC_cents))
                : null,

            urssaf_cents: BigInt(Math.round(validated.expenses.social.urssaf_cents || 0)),
            urssafPeriodicity: validated.expenses.social.urssafPeriodicity,
            urssafByMonth: validated.expenses.social.urssafByMonth || {},

            ircec_cents: BigInt(Math.round(validated.expenses.social.ircec_cents || 0)),
            ircecPeriodicity: validated.expenses.social.ircecPeriodicity,
            ircecByMonth: validated.expenses.social.ircecByMonth || {},

            incomeTax_cents: BigInt(Math.round(validated.expenses.taxes.incomeTax_cents || 0)),
            incomeTaxPeriodicity: validated.expenses.taxes.incomeTaxPeriodicity,
            incomeTaxByMonth: validated.expenses.taxes.incomeTaxByMonth || {},

            vatPaymentFrequency: validated.vatPaymentFrequency,
            vatCarryover_cents: BigInt(Math.round(validated.vatCarryover_cents)),
            engineVersion,
            fiscalHash
        }
    });

    // 2. Delete existing items to replace (simple sync strategy for MVP)
    await prisma.accountingItem.deleteMany({
        where: { operationId: operation.id }
    });

    // 3. Create new items
    const itemsToCreate = [
        ...validated.income.items.map(i => ({
            id: i.id,
            label: i.label,
            periodicity: i.periodicity,
            type: 'income',
            category: i.type,
            amount_cents: BigInt(Math.round(i.amount_ttc_cents)),
            vatRate_bps: Math.round(i.vatRate_bps),
            operationId: operation.id
        })),
        ...validated.expenses.pro.items.map(i => ({
            id: i.id,
            label: i.label,
            periodicity: i.periodicity,
            type: 'expense',
            category: i.category,
            amount_cents: BigInt(Math.round(i.amount_ttc_cents)),
            vatRate_bps: Math.round(i.vatRate_bps),
            operationId: operation.id
        })),
        ...validated.expenses.personal.items.map(i => ({
            id: i.id,
            label: i.label,
            periodicity: i.periodicity,
            type: 'expense',
            category: 'personal',
            amount_cents: BigInt(Math.round(i.amount_cents)),
            operationId: operation.id
        })),
        ...validated.expenses.otherItems.map(i => ({
            id: i.id,
            label: i.label,
            periodicity: i.periodicity,
            type: 'expense',
            category: i.category,
            amount_cents: BigInt(Math.round(i.amount_cents)),
            durationMonths: i.durationMonths,
            selectedMonths: i.selectedMonths,
            operationId: operation.id
        }))
    ];

    if (itemsToCreate.length > 0) {
        await prisma.accountingItem.createMany({
            data: itemsToCreate.map(({ id, ...rest }: any) => rest)
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
