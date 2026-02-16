"use client";

import React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { useComptaStore } from "@/store/comptaStore";
import { Month, MONTHS, PaymentEvent } from "@/lib/compta/types";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    CreditCard,
    FileText,
    ShieldCheck,
    TrendingDown,
    TrendingUp,
    PiggyBank,
    Wallet,
    Clock,
    CheckCircle2,
    CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentTimelineSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    schedule: PaymentEvent[];
}

const TYPE_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    social: { color: "text-pink-500", bg: "bg-pink-500/10", icon: ShieldCheck, label: "Social" },
    tax: { color: "text-orange-500", bg: "bg-orange-500/10", icon: FileText, label: "Impôts" },
    vat: { color: "text-amber-500", bg: "bg-amber-500/10", icon: Wallet, label: "TVA" },
    pro: { color: "text-blue-500", bg: "bg-blue-500/10", icon: CreditCard, label: "Pro" },
    personal: { color: "text-purple-500", bg: "bg-purple-500/10", icon: TrendingDown, label: "Perso" },
    btc: { color: "text-violet-500", bg: "bg-violet-500/10", icon: TrendingUp, label: "Crypto" },
    per: { color: "text-blue-500", bg: "bg-blue-500/10", icon: PiggyBank, label: "Épargne" },
    other: { color: "text-slate-500", bg: "bg-slate-500/10", icon: Calendar, label: "Autre" },
};

export const PaymentTimelineSheet = ({ isOpen, onOpenChange, schedule }: PaymentTimelineSheetProps) => {
    const { operations, selectedOperationId } = useComptaStore();

    const op = operations.find(o => o.id === selectedOperationId);
    if (!op) return null;

    const actualCurrentMonth = MONTHS[new Date().getMonth()];

    // Group by month
    const grouped = schedule.reduce((acc, event) => {
        if (!acc[event.month]) acc[event.month] = [];
        acc[event.month].push(event);
        return acc;
    }, {} as Record<Month, PaymentEvent[]>);

    const activeMonths = MONTHS.filter(m => grouped[m]);

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 p-0 overflow-hidden flex flex-col">
                <SheetHeader className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <SheetTitle className="text-xl font-bold bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
                            Échéancier {op.year}
                        </SheetTitle>
                    </div>
                    <SheetDescription className="text-slate-500 dark:text-zinc-500">
                        Vision complète de vos flux de trésorerie.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {/* Container with relative rail */}
                    <div className="relative pl-10 space-y-12">
                        {/* The Rail (Vertical Line) */}
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-zinc-700/50" />

                        <AnimatePresence mode="popLayout">
                            {activeMonths.map((month, mIdx) => (
                                <motion.div
                                    key={month}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: mIdx * 0.05 }}
                                    className="relative"
                                >
                                    {/* Month Dot (Centered on rail at 16px) */}
                                    <div className={cn(
                                        "absolute -left-[29px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950 z-10",
                                        month === actualCurrentMonth ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.7)]" : "bg-slate-300 dark:bg-zinc-600"
                                    )} />

                                    <h3 className={cn(
                                        "text-sm font-bold uppercase tracking-widest mb-4",
                                        month === actualCurrentMonth ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"
                                    )}>
                                        {month}
                                        {month === actualCurrentMonth && (
                                            <span className="ml-2 text-[10px] bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                                                Maintenant
                                            </span>
                                        )}
                                    </h3>

                                    <div className="space-y-3">
                                        {grouped[month].map((event, eIdx) => {
                                            const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.other;
                                            const Icon = config.icon;

                                            return (
                                                <motion.div
                                                    key={event.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: mIdx * 0.05 + eIdx * 0.02 }}
                                                    className={cn(
                                                        "group relative p-3 rounded-xl border border-slate-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/30 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-all shadow-sm dark:shadow-none",
                                                        event.status === 'projected' ? "border-dashed" : "border-solid"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("p-2 rounded-lg", config.bg, config.color)}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate leading-none mb-1.5">
                                                                {event.label}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                {event.status === 'realized' ? (
                                                                    <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-500 font-medium">
                                                                        <CheckCircle2 className="w-3 h-3" /> Payé
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-500 font-medium">
                                                                        <Clock className="w-3 h-3" /> Prévu
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(event.amount / 100)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="w-full py-3 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white dark:text-zinc-200 text-sm font-bold transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
