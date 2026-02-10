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
import { OperationSchema } from "@/lib/compta/types";

export default function OperationsPage() {
    const { operations, deleteOperation, duplicateOperation, setOperations, fiscalProfile } = useComptaStore();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDuplicate = (id: string, year: number) => {
        duplicateOperation(id);
        toast.success(`Opération ${year} dupliquée`);
    };

    const handleDelete = (id: string, year: number) => {
        deleteOperation(id);
        toast.info(`Opération ${year} supprimée`);
    };

    const handleExport = () => {
        try {
            const dataStr = JSON.stringify(operations, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            const exportFileDefaultName = `flux-compta-${new Date().toISOString().split('T')[0]}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            toast.success("Données exportées avec succès");
        } catch {
            toast.error("Erreur lors de l'exportation");
        }
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                const validated = OperationSchema.array().safeParse(json);

                if (validated.success) {
                    setOperations(validated.data);
                    toast.success(`${validated.data.length} bilan(s) importé(s) avec succès`);
                } else {
                    toast.error("Format de fichier invalide");
                    console.error(validated.error);
                }
            } catch {
                toast.error("Erreur de lecture du fichier");
            }
        };
        reader.readAsText(file);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    return (
        <ComptaLayout>
            <div className="space-y-8">
                <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-8 pt-8 pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-transparent transition-all duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Vos Opérations</h1>
                            <p className="text-slate-500 dark:text-slate-400 hidden md:block">Gérez vos bilans annuels et vos projections.</p>
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
                                className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 h-9 px-3 md:h-10 md:px-4"
                                onClick={handleExport}
                                disabled={operations.length === 0}
                            >
                                <Download className="md:mr-2 h-4 w-4" />
                                <span className="hidden md:inline">Exporter</span>
                            </Button>
                            <Button
                                variant="outline"
                                className="border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 h-9 px-3 md:h-10 md:px-4"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="md:mr-2 h-4 w-4" />
                                <span className="hidden md:inline">Importer</span>
                            </Button>
                            <Link href="/operations/new" className="hidden md:flex">
                                <Button className="bg-blue-600 hover:bg-blue-700 h-9 px-3 md:h-10 md:px-4">
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
                            const profitTTC = totals.incomeTTC - totals.realTreasuryOutflow;
                            return (
                                <Card key={op.id} className="overflow-hidden border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md dark:hover:modern-shadow transition-all group bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm p-0">
                                    <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-white/10 flex flex-row items-center justify-between pt-6 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-600 p-2 rounded-lg text-white">
                                                <Calendar size={18} />
                                            </div>
                                            <CardTitle className="text-xl font-bold">{op.year}</CardTitle>
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
                                            >
                                                <Copy size={16} />
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
                                                    <span className="font-semibold">{formatCurrency(totals.projectedTreasury)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Bénéfice TTC</span>
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp size={14} className={profitTTC >= 0 ? "text-emerald-500" : "text-red-500"} />
                                                    <span className="font-semibold">{formatCurrency(profitTTC)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">TVA Net</span>
                                                <div className="flex items-center gap-2">
                                                    <ShieldCheck size={14} className="text-amber-500" />
                                                    <span className="font-semibold">{formatCurrency(totals.vatNet)}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Charges</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400 font-bold">€</span>
                                                    <span className="font-semibold">{formatCurrency(totals.totalExpenses)}</span>
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
