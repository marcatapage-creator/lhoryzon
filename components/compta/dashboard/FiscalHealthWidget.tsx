"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFiscalEngine } from '@/lib/hooks/useFiscalEngine';
import { useComptaStore } from "@/store/comptaStore";
import { AlertTriangle, PiggyBank, TrendingUp, Info } from 'lucide-react';
import { WarningCode } from '@/core/fiscalEngine';

export function FiscalHealthWidget() {
    const { simulation, isLoading } = useFiscalEngine();

    if (isLoading || !simulation) return <div className="animate-pulse h-48 bg-slate-100 rounded-xl" />;

    const { forecast, social, tax, vat } = simulation.base; // Use base simulation (no purchase scenario)

    // Warning Mapping
    const warningMessages: Record<string, string> = {
        [WarningCode.SOLVER_DIVERGENCE_FALLBACK_APPROX]: "Le calcul expert n'a pas convergé. Bascule automatique en mode estimation.",
        [WarningCode.INPUT_INCONSISTENT]: "Attention : Les dividendes demandés dépassent le bénéfice disponible ou incohérence détectée.",
        [WarningCode.NEGATIVE_REGULARIZATION]: "Attention : Régularisation URSSAF négative détectée.",
        [WarningCode.EXCESSIVE_SOCIAL_CONTRIBUTIONS]: "Attention : Les cotisations dépassent 60% du résultat. Vérifiez les saisies."
    };

    const activeWarnings = (forecast.warnings || []).map(w => warningMessages[w] || w);

    // Calculate "Safe to Spend"
    const totalDue = social.cotisations_totales + tax.impot_revenu_total + vat.tva_due;
    const safeToSpend = forecast.restant_a_vivre_annuel;

    const pressure = simulation.base.revenue.ca_ht > 0
        ? ((social.cotisations_totales + tax.impot_revenu_total) / simulation.base.revenue.ca_ht) * 100
        : 0;

    return (
        <div className="space-y-4 mb-8">
            {/* Warnings Container */}
            {activeWarnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                Points d'attention
                            </h4>
                            <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
                                {activeWarnings.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* RED: Short Term Risk */}
                <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-red-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle className="text-red-500 h-4 w-4" />
                            Risque Court Terme
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {/* Mocking next payment date */}
                                15 Prochain mois
                            </p>
                            <p className="text-xs text-slate-500">
                                Prochaine échéance fiscale
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* YELLOW: Provisions */}
                <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <PiggyBank className="text-amber-500 h-4 w-4" />
                            Provisions dues
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                {Math.round(totalDue / 100).toLocaleString()} €
                            </p>
                            <p className="text-xs text-slate-500">
                                TVA + URSSAF + IR à mettre de côté
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* GREEN: Annual Vision */}
                <Card className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="text-emerald-500 h-4 w-4" />
                            Dispo Réel Annuel
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {Math.round(safeToSpend / 100).toLocaleString()} €
                            </p>
                            <p className="text-xs text-slate-500">
                                Après tous impôts ({pressure.toFixed(1)}% pression)
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
