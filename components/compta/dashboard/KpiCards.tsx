"use client";

import React, { useEffect, useState, useMemo } from "react";
import { DashboardStats } from "@/lib/compta/stats";
import { PaymentEvent, MONTHS } from "@/lib/compta/types";
import { cn } from "@/lib/utils";
import {
    Wallet,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Briefcase,
    RefreshCw,
    Landmark,
    ChevronDown,
    PiggyBank,
    CreditCard,
    FileText,
    ShieldCheck,
    Calculator
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useComptaStore } from "@/store/comptaStore";
import { getQontoBalanceAction } from "@/app/actions/accounting";
import { PaymentTimelineSheet } from "./PaymentTimelineSheet";
import { SimulationSheet } from "./SimulationSheet";
import { UnifiedKpiCard } from "./UnifiedKpiCard";
import { DashboardSidepanel } from "./DashboardSidepanel";

interface KpiCardsProps {
    stats: DashboardStats;
    period?: string;
    schedule: PaymentEvent[];
}

export function KpiCards({ stats, period, schedule }: KpiCardsProps) {
    const { dashboardSettings } = useComptaStore();
    const [hasMounted, setHasMounted] = useState(false);
    const [qontoBalance, setQontoBalance] = useState<number | null>(null);
    const [isQontoLoading, setIsQontoLoading] = useState(false);

    // Sidepanel States
    const [isNetOpen, setIsNetOpen] = useState(false);
    const [isOutflowOpen, setIsOutflowOpen] = useState(false);
    const [isTreasuryOpen, setIsTreasuryOpen] = useState(false);

    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [isSimulationOpen, setIsSimulationOpen] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    const fetchQonto = async () => {
        setIsQontoLoading(true);
        try {
            const result = await getQontoBalanceAction();
            if (result.success && result.balance !== undefined) setQontoBalance(result.balance * 100);
        } catch (e) { console.error(e); } finally { setIsQontoLoading(false); }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchQonto();
    }, []);

    const isAnnual = period === "all" || period === "multi";

    // --- Data Preparation ---

    const totalOutflow = stats.expenses + stats.social + stats.tax + stats.vat + stats.distribution.personal + stats.distribution.other;
    const treasuryRestante = stats.projectedTreasury;

    // Filter Schedule
    // incomeEvents: Salary + Items of type 'income'
    const incomeEvents = useMemo(() => schedule.filter(e => e.type === 'income'), [schedule]);

    // outflowEvents: Everything else
    const outflowEvents = useMemo(() => schedule.filter(e => e.type !== 'income'), [schedule]);

    // Pie Chart Data
    const netPieData = [
        { name: "Encaissements", value: stats.income, color: "#22c55e" }, // Green
        { name: "Charges", value: totalOutflow, color: "#ef4444" } // Red
    ];

    const outflowPieData = [
        { name: "Pro", value: stats.distribution.pro, color: "#3b82f6" }, // Blue
        { name: "Social", value: stats.distribution.social, color: "#ec4899" }, // Pink
        { name: "Impôts", value: stats.distribution.tax, color: "#f97316" }, // Orange
        { name: "TVA", value: stats.distribution.vat, color: "#eab308" }, // Yellow
        { name: "Perso", value: stats.distribution.personal, color: "#a855f7" }, // Purple
        { name: "Autre", value: stats.distribution.other, color: "#64748b" } // Slate
    ].filter(d => d.value > 0);

    const treasuryPieData = [
        { name: "Solde Actuel", value: qontoBalance ?? 0, color: "#3b82f6" },
        { name: "Surplus Période", value: Math.max(0, stats.net), color: "#22c55e" }
    ];

    const isVisible = (id: string) => dashboardSettings.visibleKpis.includes(id);

    if (!hasMounted) return null;

    return (
        <div className="space-y-6">

            {/* TOP GRID: 4 MAIN CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

                {/* 1. NET DANS MA POCHE */}
                {isVisible("netPocket") && (
                    <UnifiedKpiCard
                        title={isAnnual ? "Net dans ma poche" : `Net ${period}`}
                        value={stats.net}
                        description="Après paiement de toutes les charges."
                        icon={Wallet}
                        variant="success"
                        onClick={() => setIsNetOpen(true)}
                    />
                )}

                {/* 2. CE QUI SORT DE MA POCHE */}
                {isVisible("realTreasuryOutflow") && (
                    <UnifiedKpiCard
                        title="Ce qui sort"
                        value={totalOutflow}
                        description="Total des charges décaissées."
                        icon={ArrowDownRight}
                        variant="warning"
                        onClick={() => setIsOutflowOpen(true)}
                    />
                )}

                {/* 3. TRÉSORERIE RESTANTE */}
                {isVisible("projectedTreasury") && (
                    <UnifiedKpiCard
                        title="Tréso. Projetée"
                        value={treasuryRestante}
                        description="Solde initial + Flux cumulés."
                        icon={Landmark}
                        variant="invest"
                        onClick={() => setIsTreasuryOpen(true)}
                    />
                )}

                {/* 4. SOLDE ACTUEL */}
                {isVisible("qontoBalance") && (
                    <UnifiedKpiCard
                        title="Solde Actuel"
                        value={qontoBalance ?? 0}
                        description={isQontoLoading ? "Synchronisation..." : "Disponible banque (Qonto)"}
                        icon={RefreshCw}
                        variant="default"
                        onClick={fetchQonto}
                        className={isQontoLoading ? "animate-pulse" : ""}
                    />
                )}
            </div>

            {/* SECONDARY INDICATORS ACCORDION */}
            <div className="border border-slate-200 dark:border-white/5 bg-white sm:bg-transparent dark:bg-slate-900/20 sm:dark:bg-transparent shadow-sm sm:shadow-none backdrop-blur-sm rounded-xl overflow-hidden px-1">
                <button
                    onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                    className="w-full flex items-center justify-between py-4 px-4 group hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <ChartBarIcon className="w-4 h-4 text-slate-400" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            Indicateurs Secondaires
                        </h3>
                    </div>
                    <ChevronDown
                        className={cn(
                            "text-slate-400 size-4 transition-transform duration-300",
                            isAccordionOpen && "rotate-180"
                        )}
                    />
                </button>

                <AnimatePresence initial={false}>
                    {isAccordionOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-2 pb-6 px-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Break Even */}
                                <UnifiedKpiCard
                                    title="Point Mort"
                                    value={stats.expenses + stats.social + stats.tax}
                                    description="Seuil de rentabilité."
                                    icon={Calculator}
                                    variant="default"
                                    className="bg-white dark:bg-zinc-900/50"
                                />
                                {/* Income Raw */}
                                <UnifiedKpiCard
                                    title="Chiffre d'Affaires"
                                    value={stats.income}
                                    description="Total facturé/encaissé."
                                    icon={ArrowUpRight}
                                    variant="default"
                                    className="bg-white dark:bg-zinc-900/50"
                                />
                                {/* Savings Rate */}
                                <UnifiedKpiCard
                                    title="Taux d'Épargne"
                                    value={stats.income > 0 ? Math.round(((stats.net - stats.distribution.personal) * 10000) / stats.income) : 0}
                                    unit="%"
                                    description="Capacité d'épargne réelle."
                                    icon={PiggyBank}
                                    variant="default"
                                    className="bg-white dark:bg-zinc-900/50"
                                />
                                {/* Simulation Button Link? */}
                                <div onClick={() => setIsSimulationOpen(true)}>
                                    <UnifiedKpiCard
                                        title="Simulateur"
                                        value={0}
                                        unit="€"
                                        description="Lancer une simulation d'achat."
                                        icon={ArrowUpRight}
                                        variant="default"
                                        className="bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <SimulationSheet
                isOpen={isSimulationOpen}
                onOpenChange={setIsSimulationOpen}
            />

            {/* SIDEPANELS */}
            <DashboardSidepanel
                isOpen={isNetOpen}
                onOpenChange={setIsNetOpen}
                title="Net dans ma poche"
                description="Analyse de votre résultat net et de vos encaissements."
                totalValue={stats.net}
                data={netPieData}
                timeline={incomeEvents}
                type="income"
            />

            <DashboardSidepanel
                isOpen={isOutflowOpen}
                onOpenChange={setIsOutflowOpen}
                title="Ce qui sort"
                description="Détail de toutes vos charges décaissées."
                totalValue={totalOutflow}
                data={outflowPieData}
                timeline={outflowEvents}
                type="outcome"
            />

            <DashboardSidepanel
                isOpen={isTreasuryOpen}
                onOpenChange={setIsTreasuryOpen}
                title="Trésorerie Projetée"
                description="Projection basée sur le solde actuel et le résultat de la période."
                totalValue={treasuryRestante}
                data={treasuryPieData}
                timeline={[]}
                type="treasury"
            />

        </div>
    );
}

function ChartBarIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </svg>
    )
}

