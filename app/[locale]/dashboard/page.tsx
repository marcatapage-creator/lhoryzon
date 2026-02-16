"use client";

import React, { useState, useMemo } from "react";
import { ComptaLayout } from "@/components/compta/compta-layout";
import { useComptaStore } from "@/store/comptaStore";

import { KpiCards } from "@/components/compta/dashboard/KpiCards";
import { useDashboardData, DashboardDataV2 } from "@/lib/hooks/useDashboardData";
import { Month, MONTHS, PaymentEvent } from "@/lib/compta/types";
import { FiscalOutput, ScheduleItem } from '@/core/fiscal-v2/domain/types';
import { DashboardSidepanel } from "@/components/compta/dashboard/DashboardSidepanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Filter, FlaskConical as Flask, Info, PlusCircle, Search, TrendingUp, BarChart3, PieChart as PieChartIcon, Wallet, Landmark, Scale, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import CountUp from 'react-countup';
import { Link } from "@/i18n/routing";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ExpensePieChart } from "@/components/compta/dashboard/ExpensePieChart";
import { IncomePieChart } from "@/components/compta/dashboard/IncomePieChart";
import { Badge } from "@/components/ui/badge";
import { PeriodSelector } from "@/components/compta/dashboard/PeriodSelector";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailedExpensePieChart } from "@/components/compta/dashboard/DetailedExpensePieChart";
import { MobileDashboardSelector } from "@/components/compta/dashboard/MobileDashboardSelector";
import { OperationSchema } from "@/lib/compta/types";
import { migrateOperation } from "@/lib/compta/migration";
import { saveOperation } from "@/app/actions/compta";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
// import { cn } removed

// --- Tooltip Components ---
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

export default function ComptaDashboardPage() {
    const { operations, selectedOperationId, setSelectedOperationId, monthFilter, setMonthFilter, fiscalProfile, isLoading } = useComptaStore();
    const [expenseDetailType, setExpenseDetailType] = useState<"pro" | "personal">("pro");
    const [globalChartMode, setGlobalChartMode] = useState<"global" | "pro" | "personal">("global");

    // Sidepanel State
    const [activeSidepanel, setActiveSidepanel] = useState<"income" | "outcome" | "treasury" | null>(null);

    // V2 Data Source
    const { ledger, filteredStats, comparisonStats, currentOp, isLoading: isDataLoading, nextPayment, fiscalOutput, charts, timelineEvents } = useDashboardData();
    const { viewState } = useComptaStore();
    const isMultiYear = false;

    // --- Using Presenter Data for Charts ---
    const expenseDistributionData = useMemo(() => {
        if (!charts) return { global: [], pro: [], personal: [] };
        // Presenter returns a single list. We might need to split it if the UI strictly requires it, 
        // OR update the UI to use the unified list.
        // For MVP, Presenter only returns "expenseDistribution" (global categories).
        // If we want detailed Split (Pro vs Perso), we should update Presenter later.
        // For now, let's map the global one to "global".

        return {
            global: charts.expenseDistribution.map(d => ({ ...d, fill: d.color })),
            pro: [], // To be implemented in Presenter V2
            personal: [] // To be implemented in Presenter V2
        };
    }, [charts]);

    const incomeDistributionData = useMemo(() => {
        return charts ? charts.incomeDistribution.map(d => ({ ...d, fill: d.color })) : [];
    }, [charts]);

    // Projection Chart Data (Treasury)
    const chartData = useMemo(() => {
        if (!charts) return [];
        return charts.projectionSeries.map(s => ({
            name: s.month,
            "Trésorerie": s.treasury,
            "Disponibles": s.safeLine
        }));
    }, [charts]);

    if (isDataLoading || !ledger || !filteredStats) {
        return (
            <ComptaLayout>
                <div className="space-y-8">
                    <Skeleton className="h-12 w-full" />
                    <div className="grid gap-4 md:grid-cols-3">
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                    </div>
                </div>
            </ComptaLayout>
        );
    }

    return (
        <ComptaLayout>
            <div className="space-y-8">
                {/* Fixed Header V2 with Dashboard Selector & Period Selector */}
                <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-8 pt-6 md:pt-8 pb-6 md:pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10 transition-all duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Pilotage Financier</h1>
                            <div className="flex flex-wrap items-center gap-2">
                                <Tabs
                                    value={viewState.scope || 'all'}
                                    onValueChange={(v) => useComptaStore.getState().setViewState({ scope: v as any })}
                                    className="scale-90 -ml-2"
                                >
                                    <TabsList className="bg-slate-200/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 h-8">
                                        <TabsTrigger value="all" className="text-[10px] uppercase font-bold py-1 px-3">Tout</TabsTrigger>
                                        <TabsTrigger value="pro" className="text-[10px] uppercase font-bold py-1 px-3">Pro</TabsTrigger>
                                        <TabsTrigger value="perso" className="text-[10px] uppercase font-bold py-1 px-3">Perso</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/30 text-[10px]">
                                    Mode : Trésorerie Réelle
                                </Badge>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block">
                                <PeriodSelector />
                            </div>
                            <MobileDashboardSelector
                                operations={operations}
                                selectedOperationId={selectedOperationId}
                                onOperationChange={setSelectedOperationId}
                            />
                        </div>
                    </div>
                </div>

                {/* KPI Pulse (Above Fold) */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
                    {/* 0. Net Pocket (Ce qui reste dans ma poche) */}
                    <Card
                        onClick={() => setActiveSidepanel('treasury')}
                        className="border-blue-100 dark:border-blue-800/20 shadow-sm bg-blue-50/50 dark:bg-blue-900/10 backdrop-blur-xl cursor-pointer hover:border-blue-300 transition-colors"
                    >
                        <CardHeader className="flex flex-row items-center justify-start gap-2 p-4 pb-1 space-y-0">
                            <Wallet className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ce qui reste dans ma poche</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex items-center gap-3">
                                <div className={cn("flex items-baseline gap-1", filteredStats.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400")}>
                                    <CountUp
                                        start={0}
                                        end={filteredStats.balance / 100}
                                        duration={1}
                                        separator=" "
                                        decimals={2}
                                        decimal=","
                                        preserveValue={true}
                                        formattingFn={(value) => {
                                            const parts = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).formatToParts(value);
                                            const integerPart = parts.filter(p => p.type === 'integer' || p.type === 'group').map(p => p.value).join('');
                                            const fractionPart = parts.filter(p => p.type === 'decimal' || p.type === 'fraction').map(p => p.value).join('');
                                            return `<span class="text-4xl font-bold tracking-tight font-mono">${integerPart}</span><span class="text-xl font-medium opacity-80 font-mono">${fractionPart} €</span>`;
                                        }}
                                    >
                                        {({ countUpRef }) => (
                                            <span ref={countUpRef} dangerouslySetInnerHTML={{ __html: '' }} />
                                        )}
                                    </CountUp>
                                </div>
                                {renderGrowthBadge(filteredStats.balance, comparisonStats?.balance)}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {viewState.scope === 'pro' ? 'Encaissements - Dépenses Pro' : viewState.scope === 'perso' ? 'Dépenses Perso' : 'Encaissements - Décaissements'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* 1. Provisions / Dettes Futures */}
                    <Card
                        onClick={() => setActiveSidepanel('outcome')} // Changed from 'provisions' to 'outcome'
                        className="border-amber-100 dark:border-amber-800/20 shadow-sm bg-amber-50/50 dark:bg-amber-900/10 backdrop-blur-xl cursor-pointer hover:border-amber-300 transition-colors"
                    >
                        <CardHeader className="flex flex-row items-center justify-start gap-2 p-4 pb-1 space-y-0">
                            <Scale className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ce qui sort de ma poche</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl xl:text-3xl font-semibold text-amber-600 dark:text-amber-400 font-mono">
                                <CountUp
                                    start={0}
                                    end={filteredStats.outflow / 100}
                                    duration={1}
                                    separator=" "
                                    decimals={2}
                                    decimal=","
                                    suffix=" €"
                                    preserveValue={true}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {viewState.scope === 'pro' ? 'Décaissements Pro (Frais + Taxes + Social)' : viewState.scope === 'perso' ? 'Dépenses Personnelles (+ Impôt Revenu)' : 'Total des décaissements (Pro + Perso + Taxes)'}
                            </p>
                        </CardContent>
                    </Card>

                    {/* 2. Safe to Spend (Renamed) */}
                    <Card className="border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/10 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-start gap-2 p-4 pb-1 space-y-0">
                            <Landmark className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">État de ma trésorerie</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-2xl xl:text-3xl font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                <CountUp
                                    start={0}
                                    end={filteredStats.safeToSpend / 100}
                                    duration={1}
                                    separator=" "
                                    decimals={2}
                                    decimal=","
                                    suffix=" €"
                                    preserveValue={true}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Après provisions fiscales & sociales
                            </p>
                        </CardContent>
                    </Card>

                    {/* 3. Next Payment */}
                    <Card className="border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/10 backdrop-blur-md">
                        <CardHeader className="flex flex-row items-center justify-start gap-2 p-4 pb-1 space-y-0">
                            <CalendarClock className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Prochaine Échéance</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            {nextPayment ? (
                                <div>
                                    <div className="text-xl xl:text-2xl font-semibold text-slate-900 dark:text-white font-mono">
                                        <CountUp
                                            start={0}
                                            end={nextPayment.amount / 100}
                                            duration={1}
                                            separator=" "
                                            decimals={2}
                                            decimal=","
                                            suffix=" €"
                                            preserveValue={true}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs font-bold bg-slate-100">{nextPayment.date}</Badge>
                                        <span className="text-xs text-slate-500">{nextPayment.label}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic py-2">Aucune grosse échéance détectée</div>
                            )}
                        </CardContent>
                    </Card>
                </div>


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
                                <BarChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 5 }} barCategoryGap="20%">
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-white/5" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        interval={0}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(value) => `${Math.round(value / 100)}€`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                        content={<CustomTooltip />}
                                        wrapperStyle={{ zIndex: 100 }}
                                    />
                                    <Bar dataKey="Trésorerie" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="Disponibles" fill="#10b981" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 dark:border-white/5 shadow-sm dark:shadow-xl bg-white dark:bg-slate-900/10 backdrop-blur-md flex flex-col h-full order-1 md:order-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-200 dark:border-white/5 mb-4">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold">Répartition Globale</CardTitle>
                                <CardDescription className="text-[10px] uppercase font-bold tracking-widest opacity-50">Où part votre argent</CardDescription>
                            </div>
                            <Tabs value={globalChartMode} onValueChange={(v) => setGlobalChartMode(v as "global" | "pro" | "personal")} className="w-auto">
                                <TabsList className="h-7 p-1 overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                    <TabsTrigger value="global" className="text-[9px] h-full p-0 px-2 uppercase font-black">Vue</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px]">
                            <ExpensePieChart data={expenseDistributionData[globalChartMode]} />
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
                            {incomeDistributionData.length > 0 ? (
                                <IncomePieChart data={incomeDistributionData} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                                    Aucune donnée à afficher
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Sidepanel Portal */}
            {ledger && currentOp && (
                <DashboardSidepanel
                    isOpen={!!activeSidepanel}
                    onOpenChange={(v) => !v && setActiveSidepanel(null)}
                    title={
                        activeSidepanel === 'income' ? 'Détail Encaissements' :
                            activeSidepanel === 'outcome' ? 'Détail Décaissements' :
                                'Analyse Trésorerie'
                    }
                    description={
                        activeSidepanel === 'income' ? 'Vos revenus encaissés sur la période' :
                            activeSidepanel === 'outcome' ? 'Totalité des flux sortants (Pro + Perso + Taxes)' :
                                'Projection de trésorerie en fin de période'
                    }
                    totalValue={
                        activeSidepanel === 'income' ? filteredStats.income :
                            activeSidepanel === 'outcome' ? filteredStats.outflow :
                                filteredStats.closingTreasury
                    }
                    data={
                        activeSidepanel === 'income' ? incomeDistributionData :
                            activeSidepanel === 'outcome' ? expenseDistributionData.global :
                                chartData.map(d => ({ name: d.name, value: d["Trésorerie"], color: '#3b82f6' }))
                    }
                    timeline={timelineEvents as any} // Cast to compatibility if needed
                    type={activeSidepanel || 'income'}
                    fiscalOutput={fiscalOutput}
                />
            )}

        </ComptaLayout >
    );
}

function renderGrowthBadge(current: number, previous?: number | null) {
    if (previous === undefined || previous === null) return null;
    if (previous === 0) return null;

    const diff = current - previous;
    const percent = (diff / Math.abs(previous)) * 100;

    if (Math.abs(percent) < 0.1) return null;

    const isPositive = percent > 0;
    const colorClass = isPositive
        ? "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30"
        : "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";

    const Icon = TrendingUp;

    return (
        <Badge variant="secondary" className={cn("gap-1 px-1.5 py-0.5 text-[10px] font-bold border-none", colorClass)}>
            {isPositive ? "+" : ""}{percent.toFixed(1)}%
        </Badge>
    );
}
