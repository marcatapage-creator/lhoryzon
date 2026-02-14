"use client";

import React, { useMemo, useCallback } from "react";
import { ComptaLayout } from "@/components/compta/compta-layout";
import { ComptaWizard } from "@/components/compta/wizard/Wizard";
import { useComptaStore } from "@/store/comptaStore";
import { Operation } from "@/lib/compta/types";
import { migrateOperation } from "@/lib/compta/migration";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";

export default function NewOperationPage() {
    const { addOperation, setDraft, currentDraft } = useComptaStore();
    const router = useRouter();

    const initialData: Partial<Operation> = useMemo(() => {
        if (currentDraft && !("id" in currentDraft)) {
            return migrateOperation(currentDraft);
        }
        return {
            year: new Date().getFullYear(),
            cashCurrent_cents: 0,
            income: {
                salaryTTCByMonth: {
                    Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
                    Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
                },
                otherIncomeTTC_cents: 0,
                otherIncomeVATRate_bps: 0,
                otherIncomeSelectedMonths: [],
                items: [],
            },
            expenses: {
                pro: { items: [] },
                social: {
                    urssaf_cents: 0,
                    urssafPeriodicity: "yearly",
                    ircec_cents: 0,
                    ircecPeriodicity: "yearly",
                },
                taxes: {
                    incomeTax_cents: 0,
                    incomeTaxPeriodicity: "yearly",
                },
                personal: { items: [] },
                otherItems: [],
            },
            meta: { version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        };
    }, [currentDraft]);

    const handleSave = useCallback(async (data: Operation) => {
        const finalOp: Operation = {
            ...data,
            id: `op-${Date.now()}`,
            meta: {
                ...data.meta,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
        };
        await addOperation(finalOp);
        toast.success(`Opération ${finalOp.year} enregistrée avec succès !`);
        router.push("/operations");
    }, [addOperation, router]);

    const handleCancel = useCallback(() => {
        router.push("/operations");
    }, [router]);

    const handleDraftUpdate = useCallback((draft: Partial<Operation>) => {
        // Only save as draft if it's a "new" op (no id)
        if (!draft.id) {
            setDraft(draft);
        }
    }, [setDraft]);

    return (
        <ComptaLayout>
            <div className="min-h-[calc(100vh-64px)] -mx-4 -my-8 px-4 py-8 sm:-mx-6 sm:px-6 bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
                <ComptaWizard
                    initialData={initialData}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onDraftUpdate={handleDraftUpdate}
                />
            </div>
        </ComptaLayout>
    );
}
