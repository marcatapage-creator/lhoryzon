import React, { useState } from "react";
import { FiscalExplanationSheet } from "./FiscalExplanationSheet";
import { FiscalOutput } from "@/core/fiscal-v2/domain/types";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { Month, MONTHS, PaymentEvent } from "@/lib/compta/types";
import { motion, AnimatePresence } from "framer-motion";
import {
    ListFilter,
    ArrowUpRight,
    ArrowDownRight,
    ShieldCheck,
    Scale,
    PieChart as PieChartIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { RollingNumber } from "./RollingNumber";

interface DashboardSidepanelProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    totalValue: number;
    data: { name: string; value: number; color: string }[];
    timeline: PaymentEvent[];
    type: "income" | "outcome" | "treasury";
    fiscalOutput?: FiscalOutput | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const DashboardSidepanel = ({
    isOpen,
    onOpenChange,
    title,
    description,
    totalValue,
    data,
    timeline,
    type,
    fiscalOutput
}: DashboardSidepanelProps) => {

    const [explainCategory, setExplainCategory] = useState<"SOCIAL" | "TAX" | "VAT" | null>(null);
    const isExplainOpen = !!explainCategory;

    const actualCurrentMonth = MONTHS[new Date().getMonth()];

    // Group timeline by month
    const grouped = timeline.reduce((acc, event) => {
        if (!acc[event.month]) acc[event.month] = [];
        acc[event.month].push(event);
        return acc;
    }, {} as Record<Month, PaymentEvent[]>);

    const activeMonths = MONTHS.filter(m => grouped[m]);

    const formatCurrency = (val: number | undefined) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format((val ?? 0) / 100);
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 p-0 overflow-hidden flex flex-col">
                <SheetHeader className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3 mb-1">
                        <div className={cn(
                            "p-2 rounded-xl",
                            type === "income" ? "bg-green-500/10 text-green-600" :
                                type === "outcome" ? "bg-red-500/10 text-red-600" :
                                    "bg-blue-500/10 text-blue-600"
                        )}>
                            {type === "income" ? <ArrowUpRight className="w-5 h-5" /> :
                                type === "outcome" ? <ArrowDownRight className="w-5 h-5" /> :
                                    <PieChartIcon className="w-5 h-5" />}
                        </div>
                        <SheetTitle className="text-xl font-bold bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                            {title}
                        </SheetTitle>
                    </div>
                    {description && (
                        <SheetDescription className="text-slate-500 dark:text-zinc-500">
                            {description}
                        </SheetDescription>
                    )}
                    <div className="mt-4">
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total {type === 'income' ? 'Encaissements' : type === 'outcome' ? 'Sorties' : 'Solde'}</p>
                        <p className={cn(
                            "text-4xl font-black mt-1 tracking-tight",
                            type === "income" ? "text-green-500" :
                                type === "outcome" ? "text-red-500" :
                                    "text-blue-500"
                        )}>
                            <RollingNumber value={totalValue} />
                        </p>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-8">

                    {/* Pie Chart Section */}
                    {data.length > 0 && (
                        <div className="bg-white dark:bg-zinc-900/50 rounded-2xl p-4 border border-slate-100 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                <PieChartIcon className="w-3 h-3" /> Répartition
                            </h3>
                            <div className="h-[250px] w-full min-h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number | undefined) => [formatCurrency(value), "Montant"]}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            labelStyle={{ color: '#666' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Fiscal Explanation Block (Only for Outcome) */}
                    {type === "outcome" && fiscalOutput && (
                        <div className="grid grid-cols-1 gap-3">
                            <div
                                onClick={() => setExplainCategory("SOCIAL")}
                                className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-pink-100 dark:border-pink-900/30 flex items-center justify-between cursor-pointer hover:bg-pink-50/50 dark:hover:bg-pink-900/20 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Charges Sociales</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide group-hover:text-pink-600 transition-colors">Voir le calcul certifié</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-pink-500 transition-colors" />
                            </div>

                            <div
                                onClick={() => setExplainCategory("TAX")}
                                className="bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 flex items-center justify-between cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                                        <Scale className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Impôts (IR)</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide group-hover:text-orange-600 transition-colors">Voir le calcul certifié</p>
                                    </div>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 transition-colors" />
                            </div>
                        </div>
                    )}

                    {/* Timeline Section */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                            <ListFilter className="w-3 h-3" /> Historique & Prévisions
                        </h3>

                        <div className="relative pl-8 space-y-10">
                            {/* Rail */}
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 dark:bg-zinc-700/50" />

                            <AnimatePresence mode="popLayout">
                                {activeMonths.map((month, mIdx) => (
                                    <motion.div
                                        key={month}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: mIdx * 0.05 }}
                                        className="relative"
                                    >
                                        {/* Month Dot */}
                                        <div className={cn(
                                            "absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950 z-10",
                                            month === actualCurrentMonth ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-slate-300 dark:bg-zinc-600"
                                        )} />

                                        <div className="mb-3">
                                            <span className={cn(
                                                "text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md",
                                                month === actualCurrentMonth ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-500"
                                            )}>
                                                {month}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {grouped[month].map((event, eventIdx) => (
                                                <div key={`${event.id}-${month}-${eventIdx}`} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{event.label}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{event.type} • {event.status === 'projected' ? 'Prévu' : 'Réalisé'}</span>
                                                    </div>
                                                    <span className={cn(
                                                        "font-bold tabular-nums",
                                                        type === "income" ? "text-green-600 dark:text-green-400" : "text-slate-900 dark:text-zinc-100"
                                                    )}>
                                                        {type === "income" ? "+" : "-"} {formatCurrency(event.amount)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};
