"use client";

import React, { useMemo, useCallback } from "react";
import { ComptaLayout } from "@/components/compta/compta-layout";
import { ComptaWizard } from "@/components/compta/wizard/Wizard";
import { useComptaStore } from "@/store/comptaStore";
import { Operation } from "@/lib/compta/types";
import { useRouter } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export default function EditOperationPage() {
    const { operations, updateOperation } = useComptaStore();
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const operation = useMemo(() => {
        return operations.find(o => o.id === id);
    }, [operations, id]);

    const handleSave = useCallback((data: Operation) => {
        const finalOp: Operation = {
            ...data,
            meta: {
                ...data.meta,
                updatedAt: new Date().toISOString(),
            }
        };
        updateOperation(finalOp);
        toast.success(`Bilan ${finalOp.year} mis à jour.`);
        router.push("/compta/operations");
    }, [updateOperation, router]);

    const handleCancel = useCallback(() => {
        router.push("/compta/operations");
    }, [router]);

    const handleDraftUpdate = useCallback(() => {
        // We don't save drafts for editing an existing op
    }, []);

    if (!operation) {
        return (
            <ComptaLayout>
                <div className="text-center py-20">
                    <h2 className="text-xl font-bold">Opération non trouvée</h2>
                    <button onClick={() => router.push("/compta/operations")} className="text-blue-600 underline mt-4">
                        Retour aux opérations
                    </button>
                </div>
            </ComptaLayout>
        );
    }

    return (
        <ComptaLayout>
            <div className="py-4">
                <ComptaWizard
                    initialData={operation}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    onDraftUpdate={handleDraftUpdate}
                />
            </div>
        </ComptaLayout>
    );
}
