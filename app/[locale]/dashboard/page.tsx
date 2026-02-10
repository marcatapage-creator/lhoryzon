"use client";

import React, { useState, useMemo } from "react";
import { ComptaLayout } from "@/components/compta/compta-layout";
import { cn } from "@/lib/utils";
import { useComptaStore } from "@/store/comptaStore";
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
import { PlusCircle, Search, HelpCircle, PieChart as PieChartIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { ExpensePieChart } from "@/components/compta/dashboard/ExpensePieChart";
import { IncomePieChart } from "@/components/compta/dashboard/IncomePieChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailedExpensePieChart } from "@/components/compta/dashboard/DetailedExpensePieChart";
import { MobileDashboardSelector } from "@/components/compta/dashboard/MobileDashboardSelector";

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
            <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-xl relative z-[100]">
                <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: item.color || item.fill }} />
                            <span className="text-white font-bold text-sm">
                                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(item.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function ComptaDashboardPage() {
    const { operations, selectedOperationId, setSelectedOperationId, monthFilter, setMonthFilter, fiscalProfile } = useComptaStore();
    const hasScrolledRef = React.useRef(false);

    React.useEffect(() => {
        if (!hasScrolledRef.current) {
            // Use a small timeout to ensure other effects/autofocus have completed
            const timer = setTimeout(() => {
                window.scrollTo({ top: 0, behavior: "instant" });
                hasScrolledRef.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, []);
    const [expenseDetailType, setExpenseDetailType] = useState<"pro" | "personal">("pro");

    const selectedOperationIdOrFirst = selectedOperationId || operations[0]?.id;
    const isMultiYear = selectedOperationIdOrFirst === "all";

    React.useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

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
                "Entrées TTC": monthTotals.incomeTTC,
                "Sorties Réelles": monthTotals.realTreasuryOutflow,
                "Surplus": monthTotals.incomeTTC - monthTotals.realTreasuryOutflow,
            };
        });
    }, [isMultiYear, selectedOp, operations]);

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
                </div>
            </ComptaLayout>
        );
    }

    return (
        <ComptaLayout>
            <div className="space-y-8">
                <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-8 pt-8 pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-transparent transition-all duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pilotage Financier</h1>
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
                                                <SelectItem key={op.id} value={op.id}>{op.year}</SelectItem>
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

                {totals && <KpiCards totals={totals} period={isMultiYear ? "multi" : monthFilter} />}

                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle>Répartition des rentrées</CardTitle>
                                <CardDescription>Provenance de vos revenus</CardDescription>
                            </div>
                            <PieChartIcon className="h-4 w-4 text-emerald-400" />
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px]">
                            {isMultiYear ? (
                                <IncomePieChart data={getMultiYearIncomeDistribution(operations)} />
                            ) : (
                                selectedOp && <IncomePieChart data={getIncomeDistributionFromOp(selectedOp, monthFilter)} />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm flex flex-col h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle>Répartition globale</CardTitle>
                                <CardDescription>Catégories de dépenses</CardDescription>
                            </div>
                            <PieChartIcon className="h-4 w-4 text-slate-400" />
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px]">
                            {isMultiYear ? (
                                <ExpensePieChart data={getMultiYearExpenseDistribution(operations)} />
                            ) : (
                                selectedOp && <ExpensePieChart data={getExpenseDistribution(selectedOp, monthFilter)} />
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm flex flex-col h-full">
                        <CardHeader className="flex flex-wrap items-center justify-between gap-y-2 space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle>Détail des charges</CardTitle>
                                <CardDescription>Répartition par libellé</CardDescription>
                            </div>
                            <Tabs value={expenseDetailType} onValueChange={(v) => setExpenseDetailType(v as "pro" | "personal")} className="w-auto">
                                <TabsList className="grid w-[120px] grid-cols-2 h-8 p-1 overflow-hidden">
                                    <TabsTrigger value="pro" className="text-[10px] h-full p-0">Pro</TabsTrigger>
                                    <TabsTrigger value="personal" className="text-[10px] h-full p-0">Perso</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px]">
                            {isMultiYear ? (
                                <DetailedExpensePieChart data={getMultiYearDetailedExpenseDistribution(operations, expenseDetailType)} />
                            ) : (
                                selectedOp && <DetailedExpensePieChart data={getDetailedExpenseDistribution(selectedOp, monthFilter, expenseDetailType)} />
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                    <CardHeader className="pb-0">
                        <CardTitle>Flux de trésorerie</CardTitle>
                        <CardDescription>Impact réel sur votre compte (Entrées TTC vs Sorties + TVA Net + Impôts)</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] pt-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 0, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/50 dark:text-white/10" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                                    content={<CustomTooltip />}
                                    wrapperStyle={{ zIndex: 100 }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    align="right"
                                    iconType="circle"
                                    wrapperStyle={{ paddingBottom: '24px' }}
                                    content={({ payload }) => (
                                        <div className="flex justify-end gap-6 pb-6 text-xs font-medium text-slate-400">
                                            {payload?.map((entry: { color?: string; value?: string | number | null }, index: number) => (
                                                <div key={`item-${index}`} className="flex items-center gap-1.5">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: entry.color }}
                                                    />
                                                    <span>{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                />
                                <Bar dataKey="Entrées TTC" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-income-${index}`}
                                            fill="#3b82f6"
                                            fillOpacity={monthFilter === "all" || monthFilter === entry.name ? 1 : 0.3}
                                        />
                                    ))}
                                </Bar>
                                <Bar dataKey="Sorties Réelles" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-expense-${index}`}
                                            fill="#f43f5e"
                                            fillOpacity={monthFilter === "all" || monthFilter === entry.name ? 1 : 0.3}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-1">
                    <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Détail de la période</CardTitle>
                            <CardDescription>
                                {isMultiYear ? "Toutes les années cumulées" : (monthFilter === "all" ? "Vue annuelle" : `Vue pour ${monthFilter}`)}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Revenus TTC</span>
                                    <span className="font-bold text-slate-900 dark:text-slate-100">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totals?.incomeTTC || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Paiement TVA (Net)</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Collectée - Déductible</span>
                                    </div>
                                    <span className="font-semibold text-amber-600 dark:text-amber-500">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totals?.vatNet || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Charges + Impôts</span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totals?.totalExpenses || 0)}</span>
                                </div>
                                <div className={cn(
                                    "flex justify-between items-center py-2 border-b border-slate-200/60 dark:border-white/10 px-2 -mx-2 rounded transition-colors duration-300",
                                    (totals?.profitHT || 0) >= 0
                                        ? "bg-emerald-50 dark:bg-emerald-900/10"
                                        : "bg-red-50 dark:bg-red-900/10"
                                )}>
                                    <div className="flex flex-col">
                                        <span className={cn(
                                            "text-sm font-bold",
                                            (totals?.profitHT || 0) >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                                        )}>Surplus Net (HT)</span>
                                        <span className={cn(
                                            "text-[10px]",
                                            (totals?.profitHT || 0) >= 0 ? "text-emerald-600/70 dark:text-emerald-400/50" : "text-red-600/70 dark:text-red-400/50"
                                        )}>Argent de poche réel</span>
                                    </div>
                                    <span className="font-bold">
                                        <RollingNumber value={totals?.profitHT || 0} showPositiveColor />
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-white/10 flex items-start gap-3">
                                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    <strong>Impact Trésorerie :</strong> Les &quot;Sorties Réelles&quot; dans le graphique incluent vos charges TTC ET le versement de la TVA à l&apos;État, pour refléter exactement ce qui sort de votre compte.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div >
        </ComptaLayout >
    );
}
