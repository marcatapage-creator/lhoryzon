"use client";

import React from "react";
import { ComptaLayout } from "@/components/compta/compta-layout";
import { useComptaStore } from "@/store/comptaStore";
import { computeFilteredTotals } from "@/lib/compta/calculations";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Copy, Trash2, Calendar, TrendingUp, ShieldCheck, Wallet, Download, Upload, PlusCircle } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { saveOperation } from "@/app/actions/compta";
import { OperationSchema } from "@/lib/compta/types";
import { migrateOperation } from "@/lib/compta/migration";
import { cn } from "@/lib/utils";
import { FlaskConical as Flask } from "lucide-react";

export default function OperationsPage() {
    const { operations, deleteOperation, duplicateOperation, simulateOperation, setOperations, fiscalProfile } = useComptaStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDuplicate = (id: string, year: number) => {
        duplicateOperation(id);
        toast.success(`Opération ${year} dupliquée`);
    };

    const handleSimulate = async (id: string, year: number) => {
        try {
            await simulateOperation(id);
            toast.success(`Simulation créée pour ${year}`);
        } catch (e) {
            toast.error("Échec de la création de la simulation");
        }
    };

    const handleDelete = (id: string, year: number) => {
        deleteOperation(id);
        toast.info(`Opération ${year} supprimée`);
    };

    const handleExport = () => {
        try {
            const dataStr = JSON.stringify(operations, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `loryzon-compta-${new Date().toISOString().split('T')[0]}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toast.success("Données exportées avec succès");
        } catch {
            toast.error("Erreur lors de l'exportation");
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);

                // Default Profile if missing (Enables VAT calc)
                const store = useComptaStore.getState();
                if (!store.fiscalProfile) {
                    store.setFiscalProfile({
                        status: 'sas_is',
                        vatEnabled: true,
                        isPro: true
                    });
                }

                // Allow both single object and array
                const rawData = Array.isArray(json) ? json : [json];

                // DATA MIGRATION LAYER
                const ops = rawData.map(op => migrateOperation(op));

                const validated = OperationSchema.array().safeParse(ops);

                if (validated.success) {
                    const cleanOps = validated.data;

                    // Optimistic update
                    setOperations(cleanOps);

                    // Persist to DB - Use cleanOps which has all defaults filled by Zod
                    const promise = Promise.all(cleanOps.map(op => saveOperation(op)));

                    toast.promise(promise, {
                        loading: 'Sauvegarde des données importées...',
                        success: `${cleanOps.length} opération(s) importée(s) et sauvegardée(s)`,
                        error: 'Erreur lors de la sauvegarde en base de données'
                    });

                } else {
                    console.error("Validation error:", validated.error);
                    // Extract meaningful error message
                    const firstError = validated.error.issues[0];
                    const path = firstError.path.join('.');
                    toast.error(`Format invalide: ${path} - ${firstError.message}`);
                }
            } catch (err) {
                console.error("Import error:", err);
                toast.error("Erreur de lecture du fichier JSON");
            }
        };
        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const formatCurrency = (amount_cents: number) => {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
        }).format(amount_cents / 100);
    };

    return (
        <ComptaLayout>
            <div className="space-y-8">
                <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-8 pt-6 md:pt-8 pb-6 md:pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10 transition-all duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Vos Opérations</h1>
                            <p className="hidden md:block text-sm md:text-base text-slate-500 dark:text-slate-400">Gérez vos bilans annuels et vos projections.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".json"
                                onChange={handleImport}
                            />
                            <Button
                                variant="outline"
                                className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 h-10 px-4 flex-1 md:flex-none"
                                onClick={handleExport}
                                disabled={operations.length === 0}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                <span>Exporter</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 h-10 px-4 flex-1 md:flex-none"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="mr-2 h-4 w-4" />
                                <span>Importer</span>
                            </Button>
                            <Link href="/operations/new" className="hidden md:block md:flex-none">
                                <Button className="bg-blue-600 hover:bg-blue-700 h-10 px-4 w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    <span>Ajouter une année</span>
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {operations.length === 0 ? (
                    <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/10 rounded-xl p-12 text-center backdrop-blur-sm">
                        <p className="text-slate-500 dark:text-slate-400">Aucune opération pour le moment.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {operations.map((op) => {
                            const totals = computeFilteredTotals(op, "all", fiscalProfile);
                            const profit_cents = totals.incomeTTC_cents - totals.realTreasuryOutflow_cents;
                            return (
                                <Card key={op.id} className="overflow-hidden border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md dark:hover:modern-shadow transition-all group bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm p-0">
                                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-white/10 flex flex-row items-center justify-between pt-6 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "p-2 rounded-lg text-white",
                                                op.isScenario ? "bg-amber-500" : "bg-blue-600"
                                            )}>
                                                {op.isScenario ? <Flask size={18} /> : <Calendar size={18} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <CardTitle className="text-xl font-bold">{op.year}</CardTitle>
                                                {op.isScenario && (
                                                    <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-widest">
                                                        {op.scenarioName || "Simulation"}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link href={`/operations/${op.id}/edit`}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-500">
                                                    <Edit2 size={16} />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-blue-500"
                                                onClick={() => handleDuplicate(op.id, op.year)}
                                                title="Dupliquer"
                                            >
                                                <Copy size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-500 hover:text-amber-500"
                                                onClick={() => handleSimulate(op.id, op.year)}
                                                title="Simuler"
                                            >
                                                <Flask size={16} />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Supprimer l&apos;opération {op.year} ?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cette action est irréversible. Toutes les données saisies pour cette année seront perdues.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(op.id, op.year)} className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-6 pb-6">
                                        <div className="grid grid-cols-2 gap-4 text-slate-900 dark:text-slate-100">
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Trésorerie</span>
                                                <div className="flex items-center gap-2">
                                                    <Wallet size={14} className="text-blue-500" />
                                                    <span className="font-semibold">{formatCurrency(totals.projectedTreasury_cents)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Surplus Réel</span>
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp size={14} className={profit_cents >= 0 ? "text-emerald-500" : "text-red-500"} />
                                                    <span className="font-semibold">{formatCurrency(profit_cents)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">TVA Net</span>
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck size={14} className="text-amber-500" />
                                                    <span className="font-semibold">{formatCurrency(totals.vatNet_cents)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Charges</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 font-bold">€</span>
                                                    <span className="font-semibold">{formatCurrency(totals.totalExpenses_cents)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50/50 dark:bg-slate-900/40 p-2 border-t border-slate-200/60 dark:border-white/10">
                                        <Link href="/dashboard" className="w-full">
                                            <Button
                                                variant="ghost"
                                                className="w-full text-xs text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                onClick={() => useComptaStore.getState().setSelectedOperationId(op.id)}
                                            >
                                                Voir dans le dashboard
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </ComptaLayout>
    );
}
