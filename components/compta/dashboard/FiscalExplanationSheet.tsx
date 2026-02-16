"use client";

import React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FiscalOutput } from "@/core/fiscal-v2/domain/types";
import { Calculator, Scale, FileText, ShieldCheck, Lock } from "lucide-react";

interface FiscalExplanationSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    fiscalOutput: FiscalOutput | null | undefined;
    category?: "SOCIAL" | "TAX" | "VAT";
}

export function FiscalExplanationSheet({
    isOpen,
    onOpenChange,
    fiscalOutput,
    category
}: FiscalExplanationSheetProps) {
    if (!fiscalOutput) return null;

    const { metadata, taxes } = fiscalOutput;

    // Filter relevant taxes based on category
    const relevantTaxes = category === "SOCIAL"
        ? [...taxes.urssaf, ...taxes.ircec]
        : category === "TAX"
            ? taxes.ir
            : category === "VAT"
                ? taxes.vat
                : [];

    const totalAmount = relevantTaxes.reduce((sum, t) => sum + t.amount, 0);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(val / 100);
    };

    const formatRate = (bps: number) => {
        return `${(bps / 100).toFixed(2)}%`;
    };

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl bg-slate-50 dark:bg-zinc-950 p-0 flex flex-col">
                <SheetHeader className="p-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            Certifié Conforme
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                            v{metadata.engineVersion}
                        </Badge>
                    </div>
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                        {category === "SOCIAL" ? "Charges Sociales" : category === "TAX" ? "Impôt sur le Revenu" : "TVA"}
                    </SheetTitle>
                    <SheetDescription>
                        Règles appliquées : {metadata.rulesetYear} (Rev {metadata.rulesetRevision})
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 p-6">
                    <div className="space-y-8">

                        {/* Summary Card */}
                        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-4 shadow-sm">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Total Calculé</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {formatCurrency(totalAmount)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-mono">HASH: {metadata.fiscalHash.substring(0, 8)}...</p>
                                    <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1 justify-end">
                                        <Lock className="w-3 h-3" />
                                        <span>Déterministe</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                <Calculator className="w-4 h-4" /> Détail du Calcul
                            </h3>

                            <div className="space-y-3">
                                {relevantTaxes.map((tax, idx) => (
                                    <div key={idx} className="bg-white dark:bg-zinc-900/50 rounded-lg border border-slate-100 dark:border-zinc-800 p-4 transition-all hover:border-slate-300 dark:hover:border-zinc-700">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="max-w-[70%]">
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{tax.label}</p>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">{tax.code}</p>
                                            </div>
                                            <p className="font-bold text-slate-900 dark:text-white">
                                                {formatCurrency(tax.amount)}
                                            </p>
                                        </div>

                                        <Separator className="my-3 bg-slate-100 dark:bg-zinc-800" />

                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div>
                                                <p className="text-slate-500">Base Assujettie</p>
                                                <p className="font-medium font-mono text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(tax.base)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-slate-500">Taux Appliqué</p>
                                                <p className="font-medium font-mono text-slate-700 dark:text-slate-300">
                                                    {formatRate(tax.rate_bps)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Explanation Badge */}
                                        <div className="mt-3 flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500">
                                                {tax.juridicalBasis?.source || "Règle Standard"}
                                            </Badge>
                                            {tax.capApplied && (
                                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                                                    Plafonné ({tax.capApplied.name})
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Audit Trail */}
                        <div className="bg-slate-50 dark:bg-zinc-900/30 rounded-lg p-4 border border-slate-100 dark:border-zinc-800">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Traçabilité
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Ce calcul a été effectué le <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(metadata.computedAt).toLocaleString()}</span> avec le ruleset <span className="font-mono text-slate-700 dark:text-slate-300">{metadata.paramsFingerprint.substring(0, 8)}</span>.
                                Il est certifié conforme au mode <span className="font-bold">{metadata.mode}</span>.
                            </p>
                        </div>

                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
