"use client";

import React from "react";
import { cn } from "@/lib/utils";

// --- Design Tokens ---
const TOKENS = {
    radius: {
        card: "rounded-2xl",
        inner: "rounded-xl",
        pill: "rounded-full",
    },
    shadow: {
        card: "shadow-sm",
        float: "shadow-lg",
    },
    border: {
        light: "border-zinc-200",
        dark: "dark:border-zinc-800",
    },
    colors: {
        bg: "bg-white dark:bg-zinc-900",
        bgSubtle: "bg-zinc-50 dark:bg-zinc-900/50",
        textMain: "text-zinc-900 dark:text-white",
        textMuted: "text-zinc-500 dark:text-zinc-400",
        success: "text-emerald-600 dark:text-emerald-400",
        successBg: "bg-emerald-50 dark:bg-emerald-900/20",
        warning: "text-orange-600 dark:text-orange-400",
        danger: "text-red-600 dark:text-red-400",
    }
};

// --- Wrapper Component ---
export const LandingVisualFrame = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={cn(
            "relative w-full aspect-[4/3] md:aspect-auto md:h-[480px] overflow-hidden flex items-center justify-center p-6",
            "bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950",
            TOKENS.border.light, TOKENS.border.dark, "border",
            TOKENS.radius.card,
            className
        )}>
            {/* Background Pattern (Optional subtle grid) */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            />
            {children}
        </div>
    );
};

// --- Step 1: Déclarez vos encaissements ---
export const LandingVisualStep1 = () => {
    const items = [
        { label: "Facture #2026-02", client: "Studio Design", amount: "4 500,00 €", tag: "Prestation" },
        { label: "Acompte Projet Web", client: "Tech Corp", amount: "3 200,00 €", tag: "Acompte" },
        { label: "Formation équipe", client: "Startup Flow", amount: "1 850,00 €", tag: "Formation" },
    ];

    return (
        <div className={cn(
            "w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl",
            TOKENS.radius.card, "overflow-hidden flex flex-col"
        )}>
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Février 2026</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                    12 450,00 €
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Total encaissé
                </div>
            </div>

            {/* List */}
            <div className="p-4 space-y-3">
                {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-default">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                                <div className="w-4 h-4 rounded-sm border-2 border-current opacity-50" />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-zinc-900 dark:text-white">{item.client}</div>
                                <div className="text-xs text-zinc-400 flex items-center gap-2">
                                    {item.label}
                                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                    <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-medium tracking-wide">
                                        {item.tag}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                            + {item.amount}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 text-center">
                <button className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
                    + Ajouter un encaissement
                </button>
            </div>
        </div>
    );
};

// --- Step 2: Provision Automatique ---
export const LandingVisualStep2 = () => {
    return (
        <div className="relative w-full max-w-md flex flex-col items-center gap-6">
            {/* Top Card: Total Income */}
            <div className={cn(
                "w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md",
                TOKENS.radius.card, "p-4 text-center z-10"
            )}>
                <div className="text-xs text-zinc-500 mb-1">Encaissements</div>
                <div className="text-xl font-bold text-zinc-900 dark:text-white">12 450 €</div>
            </div>

            {/* Flow Lines (SVG) */}
            <div className="absolute top-[60px] md:top-[68px] w-full h-12 pointer-events-none text-zinc-300 dark:text-zinc-700">
                <svg width="100%" height="100%" viewBox="0 0 400 60" preserveAspectRatio="none" className="overflow-visible">
                    {/* Center to Left-1 (TVA) */}
                    <path d="M200,0 C200,30 60,30 60,60" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
                    {/* Center to Left-2 (URSSAF) */}
                    <path d="M200,0 C200,30 150,30 150,60" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
                    {/* Center to Right-1 (Impots) */}
                    <path d="M200,0 C200,30 250,30 250,60" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
                    {/* Center to Right-2 (Net) */}
                    <path d="M200,0 C200,30 340,30 340,60" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500/50" />
                </svg>
            </div>

            {/* Bottom Cards: Distribution */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                {/* TVA */}
                <div className={cn(
                    "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800",
                    TOKENS.radius.inner, "p-3 flex flex-col items-center justify-center text-center gap-1"
                )}>
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs font-bold mb-1">
                        %
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">TVA</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">2 075 €</div>
                </div>

                {/* URSSAF */}
                <div className={cn(
                    "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800",
                    TOKENS.radius.inner, "p-3 flex flex-col items-center justify-center text-center gap-1"
                )}>
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-xs font-bold mb-1">
                        €
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Urssaf</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">3 400 €</div>
                </div>

                {/* Impôts */}
                <div className={cn(
                    "bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800",
                    TOKENS.radius.inner, "p-3 flex flex-col items-center justify-center text-center gap-1"
                )}>
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold mb-1">
                        🏛
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Impôt</div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-white">1 850 €</div>
                </div>

                {/* Net (Highlighted) */}
                <div className={cn(
                    "col-span-1 md:col-span-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 shadow-lg shadow-emerald-500/10",
                    TOKENS.radius.inner, "p-3 flex flex-col items-center justify-center text-center gap-1 relative overflow-hidden ring-1 ring-emerald-500/20"
                )}>
                    <div className="absolute top-0 right-0 p-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold mb-1">
                        🔒
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold tracking-wider">Dispo Réel</div>
                    <div className="text-base font-bold text-emerald-700 dark:text-emerald-400">5 125 €</div>
                </div>
            </div>
        </div>
    );
};

// --- Step 3: Décidez Sereinement ---
export const LandingVisualStep3 = () => {
    return (
        <div className={cn(
            "w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col",
            TOKENS.radius.card
        )}>
            {/* Main Metric */}
            <div className="p-8 pb-6 text-center">
                <div className="inline-flex items-center justify-center p-2 rounded-full bg-emerald-50 dark:bg-emerald-900/10 mb-4 ring-1 ring-inset ring-emerald-500/20">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2">VOTRE VRAI DISPONIBLE</span>
                </div>
                <div className="text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-2">
                    5 125 €
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>Projection J+60 : <span className="font-medium text-emerald-600 dark:text-emerald-400">+ 4 320 €</span></span>
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full" />

            {/* Timeline / Next Events */}
            <div className="p-6 bg-zinc-50/50 dark:bg-zinc-900/50 flex-1">
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Prochaines échéances</div>
                <div className="space-y-4 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800" />

                    {/* Event 1 */}
                    <div className="relative flex items-center gap-4 group">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 bg-orange-400 z-10 shadow-sm" />
                        <div className="flex-1 flex justify-between items-center p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                            <div>
                                <div className="text-sm font-semibold text-zinc-900 dark:text-white">TVA</div>
                                <div className="text-xs text-zinc-500">20 Février</div>
                            </div>
                            <div className="text-sm font-medium text-orange-600 dark:text-orange-400">- 2 075 €</div>
                        </div>
                    </div>

                    {/* Event 2 */}
                    <div className="relative flex items-center gap-4 group">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900 bg-red-400 z-10 shadow-sm" />
                        <div className="flex-1 flex justify-between items-center p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                            <div>
                                <div className="text-sm font-semibold text-zinc-900 dark:text-white">URSSAF</div>
                                <div className="text-xs text-zinc-500">05 Mars</div>
                            </div>
                            <div className="text-sm font-medium text-red-600 dark:text-red-400">- 3 400 €</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
