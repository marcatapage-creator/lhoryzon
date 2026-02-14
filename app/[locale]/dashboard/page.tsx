"use client";

import React, { useState, useMemo } from "react";
import { ComptaLayout } from "@/components/compta/compta-layout";
import { cn } from "@/lib/utils";
import { useComptaStore } from "@/store/comptaStore";
import { FiscalHealthWidget } from "@/components/compta/dashboard/FiscalHealthWidget";
import { KpiCards, RollingNumber } from "@/components/compta/dashboard/KpiCards";
import {
    computeFilteredTotals,
    getIncomeDistributionFromOp,
    computeMultiYearTotals,
    getMultiYearChartData,
    getMultiYearIncomeDistribution,
    getExpenseDistribution,
    getMultiYearExpenseDistribution,
    getDetailedExpenseDistribution,
    getMultiYearDetailedExpenseDistribution
} from "@/lib/compta/calculations";
import { Month, MONTHS } from "@/lib/compta/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, HelpCircle, PieChart as PieChartIcon, Download, Upload, FlaskConical as Flask, BarChart3 } from "lucide-react";
import { Link, useRouter } from "@/i18n/routing";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { ExpensePieChart } from "@/components/compta/dashboard/ExpensePieChart";
import { IncomePieChart } from "@/components/compta/dashboard/IncomePieChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailedExpensePieChart } from "@/components/compta/dashboard/DetailedExpensePieChart";
import { MobileDashboardSelector } from "@/components/compta/dashboard/MobileDashboardSelector";
import { OperationSchema } from "@/lib/compta/types";
import { migrateOperation } from "@/lib/compta/migration";
import { saveOperation } from "@/app/actions/compta";
import { toast } from "sonner";

interface TooltipPayloadItem {
    color?: string;
    fill?: string;
    value: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-xl relative z-[100]">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.color || item.fill }} />
                            <span className="text-slate-900 dark:text-white font-bold text-sm">
                                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(item.value / 100)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

import { Skeleton } from "@/components/ui/skeleton";

export default function ComptaDashboardPage() {
    const { operations, selectedOperationId, setSelectedOperationId, monthFilter, setMonthFilter, fiscalProfile, isLoading } = useComptaStore();
    const [expenseDetailType, setExpenseDetailType] = useState<"pro" | "personal">("pro");

    const selectedOperationIdOrFirst = selectedOperationId || operations[0]?.id;
    const isMultiYear = selectedOperationIdOrFirst === "all";


    // Initialize selection to most recent year if not set (for persistence)
    // We add a small delay to ensure hydration has settled
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (!selectedOperationId && operations.length > 0) {
                const sorted = [...operations].sort((a, b) => b.year - a.year);
                if (sorted[0]) {
                    setSelectedOperationId(sorted[0].id);
                }
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [operations, selectedOperationId, setSelectedOperationId]);

    const selectedOp = useMemo(() => {
        if (selectedOperationIdOrFirst && selectedOperationIdOrFirst !== "all") {
            return operations.find(o => o.id === selectedOperationIdOrFirst);
        }
        return null; // isMultiYear
    }, [operations, selectedOperationIdOrFirst]);

    const totals = useMemo(() => {
        if (isMultiYear) return computeMultiYearTotals(operations, fiscalProfile);
        if (!selectedOp) return null;
        return computeFilteredTotals(selectedOp, monthFilter, fiscalProfile);
    }, [isMultiYear, selectedOp, monthFilter, operations, fiscalProfile]);

    const chartData = useMemo(() => {
        if (isMultiYear) return getMultiYearChartData(operations);
        if (!selectedOp) return [];

        return MONTHS.map((month) => {
            const monthTotals = computeFilteredTotals(selectedOp, month as Month, fiscalProfile);

            return {
                name: month,
                "Entrées TTC": monthTotals.incomeTTC_cents,
                "Sorties Réelles": monthTotals.realTreasuryOutflow_cents,
                "Surplus": monthTotals.incomeTTC_cents - monthTotals.realTreasuryOutflow_cents,
            };
        });
    }, [isMultiYear, selectedOp, operations, fiscalProfile]);

    if (isLoading) {
        return (
            <ComptaLayout>
                <div className="space-y-8">
                    <div className="flex flex-col gap-4">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-4 w-96" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <Skeleton className="h-[300px] w-full" />
                        <Skeleton className="h-[300px] w-full" />
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                </div>
            </ComptaLayout>
        );
    }

    if (operations.length === 0) {
        return (
            <ComptaLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-full mb-6">
                        <Search className="h-12 w-12 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Aucune opération enregistrée</h2>
                    <p className="text-slate-500 mb-8 max-w-md">Commencez par ajouter votre première année d&apos;activité pour piloter votre trésorerie et votre TVA.</p>
                    <Link href="/operations/new">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-lg font-semibold">
                            <PlusCircle className="mr-2 h-5 w-5" />
                            Ajouter une opération
                        </Button>
                    </Link>

                    <div className="mt-8 flex flex-col md:flex-row items-center gap-4">
                        <Button variant="outline" onClick={() => {
                            const template = {
                                title: "Modèle d'importation (JSON)",
                                id: "model-2025",
                                year: 2025,
                                cashCurrent: 0,
                                income: {
                                    salaryTTCByMonth: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 },
                                    otherIncomeTTC: 0,
                                    otherIncomeVATRate: 0,
                                    otherIncomeSelectedMonths: []
                                },
                                expenses: {
                                    pro: { items: [] },
                                    social: { urssaf: 0, ircec: 0 },
                                    taxes: { incomeTax: 0 },
                                    personal: { items: [] },
                                    otherItems: []
                                },
                                meta: { version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
                            };
                            const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "modele-compta-loryzon.json";
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }}>
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger le modèle (JSON)
                        </Button>

                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                        try {
                                            const json = JSON.parse(event.target?.result as string);
                                            // Allow both single object and array
                                            const rawData = Array.isArray(json) ? json : [json];

                                            // DATA MIGRATION LAYER
                                            const migratedOps = rawData.map(op => migrateOperation(op));

                                            // VALIDATION
                                            const validated = OperationSchema.array().safeParse(migratedOps);

                                            if (!validated.success) {
                                                const firstError = validated.error.issues[0];
                                                const path = firstError.path.join('.');
                                                toast.error(`Format invalide: ${path} - ${firstError.message}`);
                                                return;
                                            }

                                            const ops = validated.data;
                                            const store = useComptaStore.getState();

                                            // Default Profile if missing
                                            if (!store.fiscalProfile) {
                                                store.setFiscalProfile({
                                                    status: 'sas_is',
                                                    vatEnabled: true,
                                                    isPro: true
                                                });
                                            }

                                            // Optimistic update
                                            store.setOperations([...store.operations, ...ops]);

                                            // Persist to DB
                                            const promise = Promise.all(ops.map(op => saveOperation(op)));

                                            toast.promise(promise, {
                                                loading: 'Sauvegarde des données importées...',
                                                success: `${ops.length} opération(s) importée(s) et sauvegardée(s)`,
                                                error: 'Erreur lors de la sauvegarde en base de données'
                                            });

                                        } catch (err) {
                                            console.error("Import error:", err);
                                            toast.error("Erreur de lecture du fichier JSON");
                                        } finally {
                                            e.target.value = "";
                                        }
                                    };
                                    reader.readAsText(file);
                                }}
                            />
                            <Button variant="outline">
                                <Upload className="mr-2 h-4 w-4" />
                                Importer un fichier
                            </Button>
                        </div>
                    </div>
                </div>
            </ComptaLayout>
        );
    }

    return (
        <ComptaLayout>
            <div className="space-y-4">
                <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-6 md:mb-8 pt-8 pb-3 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-transparent transition-all duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pilotage Financier</h1>
                                {selectedOp?.isScenario && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800/50">
                                        <Flask size={14} className="animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{selectedOp.scenarioName || "Mode Simulation"}</span>
                                    </div>
                                )}
                            </div>
                            <p className="hidden md:block text-slate-500 dark:text-slate-400">Suivez vos indicateurs de performance et votre TVA en temps réel.</p>
                        </div>

                        <div className="w-full md:w-auto">
                            <MobileDashboardSelector
                                operations={operations}
                                selectedOperationId={selectedOperationId}
                                onOperationChange={setSelectedOperationId}
                                monthFilter={monthFilter}
                                onMonthChange={setMonthFilter}
                            />

                            <div className="hidden md:flex flex-wrap items-center gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Opération (Année)</label>
                                    <Select
                                        value={selectedOperationIdOrFirst}
                                        onValueChange={(val) => setSelectedOperationId(val)}
                                    >
                                        <SelectTrigger className="w-[160px] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                                            <SelectValue placeholder="Sélectionner" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Toutes les années</SelectItem>
                                            {[...operations].sort((a, b) => b.year - a.year).map(op => (
                                                <SelectItem key={op.id} value={op.id}>
                                                    <div className="flex items-center gap-2">
                                                        {op.isScenario && <Flask size={12} className="text-amber-500" />}
                                                        <span>{op.year}</span>
                                                        {op.isScenario && <span className="text-[10px] opacity-50">(Simu)</span>}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {!isMultiYear && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Période</label>
                                        <Select
                                            value={monthFilter}
                                            onValueChange={(val: Month | "all") => setMonthFilter(val)}
                                        >
                                            <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm">
                                                <SelectValue placeholder="Période" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Année complète</SelectItem>
                                                {MONTHS.map(m => (
                                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <FiscalHealthWidget />

                {totals && <KpiCards totals={totals} period={isMultiYear ? "multi" : monthFilter} />}

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-slate-200 dark:border-white/5 shadow-sm dark:shadow-2xl bg-white dark:bg-slate-900/10 backdrop-blur-md flex flex-col h-full lg:col-span-2 order-2 md:order-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5 mb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold">Flux de trésorerie</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-50">Impact réel sur compte</CardDescription>
                            </div>
                            <BarChart3 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        </CardHeader>
                        <CardContent className="h-[300px] pt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-white/5" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <Tooltip
                                        cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                        content={<CustomTooltip />}
                                        wrapperStyle={{ zIndex: 100 }}
                                    />
                                    <Bar dataKey="Entrées TTC" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Sorties Réelles" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-white/5 shadow-sm dark:shadow-xl bg-white dark:bg-slate-900/10 backdrop-blur-md flex flex-col h-full order-1 md:order-2">
                        <CardHeader className="pb-2 border-b border-slate-200 dark:border-white/5 mb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold text-center">Répartition Globale</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-50 text-center">Où part votre argent</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px]">
                            {isMultiYear ? (
                                <ExpensePieChart data={getMultiYearExpenseDistribution(operations, fiscalProfile)} />
                            ) : (
                                selectedOp && <ExpensePieChart data={getExpenseDistribution(selectedOp, monthFilter, fiscalProfile)} />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/5 backdrop-blur-sm shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-md font-bold">Provenance des revenus</CardTitle>
                            </div>
                            <PieChartIcon className="h-4 w-4 text-emerald-500 dark:text-emerald-400 opacity-50" />
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            {isMultiYear ? (
                                <IncomePieChart data={getMultiYearIncomeDistribution(operations)} />
                            ) : (
                                selectedOp && <IncomePieChart data={getIncomeDistributionFromOp(selectedOp, monthFilter)} />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/5 backdrop-blur-sm shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-md font-bold">Détail des charges</CardTitle>
                            </div>
                            <Tabs value={expenseDetailType} onValueChange={(v) => setExpenseDetailType(v as "pro" | "personal")} className="w-auto">
                                <TabsList className="h-7 p-1 overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <TabsTrigger value="pro" className="text-[9px] h-full p-0 px-2 uppercase font-black">Pro</TabsTrigger>
                                    <TabsTrigger value="personal" className="text-[9px] h-full p-0 px-2 uppercase font-black">Perso</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent className="h-[250px]">
                            {isMultiYear ? (
                                <DetailedExpensePieChart data={getMultiYearDetailedExpenseDistribution(operations, expenseDetailType)} />
                            ) : (
                                selectedOp && <DetailedExpensePieChart data={getDetailedExpenseDistribution(selectedOp, monthFilter, expenseDetailType)} />
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ComptaLayout >
    );
}
