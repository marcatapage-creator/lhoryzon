"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useFiscalEngine } from '@/lib/hooks/useFiscalEngine';
import { useComptaStore } from "@/store/comptaStore";
import { ChevronDown, ChevronUp, Info, Zap, Receipt, Landmark, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SimulationView() {
    const [amount, setAmount] = useState(1500); // Amount in Euros (UI)
    const [category, setCategory] = useState<"hardware" | "software" | "vehicle">("hardware");
    const [showTrace, setShowTrace] = useState(false);
    const [socialMode, setSocialMode] = useState<'approx' | 'iteratif'>('approx');
    const { fiscalProfile, setFiscalProfile } = useComptaStore();
    const isSasu = fiscalProfile?.status === 'sas_is';

    // SASU Local State
    const [remunMode, setRemunMode] = useState<'total_charge' | 'net_target'>('total_charge');
    const [remunAmount, setRemunAmount] = useState(30000); // Euros
    const [dividends, setDividends] = useState(0); // Euros

    // Sync local state with store on mount
    useEffect(() => {
        if (fiscalProfile?.sasuRemunerationAmount) setRemunAmount(fiscalProfile.sasuRemunerationAmount / 100);
        if (fiscalProfile?.sasuDividendesBruts) setDividends(fiscalProfile.sasuDividendesBruts / 100);
        if (fiscalProfile?.sasuRemunerationMode) setRemunMode(fiscalProfile.sasuRemunerationMode);
    }, [fiscalProfile]);

    const { simulation } = useFiscalEngine({
        additionalExpense: {
            amount_ttc: amount * 100,
            vat_rate: 2000,
            is_deductible: true // Simplify for now
        },
        socialMode
    });

    if (!simulation) return null;

    const result = {
        coutReel_cents: simulation.delta.realCost,
        sortieImmediate_cents: amount * 100,
        tvaRecuperee_cents: simulation.delta.savedVat,
        economieIR_cents: simulation.delta.savedTax,
        economieIS_cents: 0,
        economieCotisations_cents: simulation.delta.savedSocial,
        messagesPedagogiques: [] as string[],
        traceCalcul: [] as any[]
    };

    const categories = [
        { id: 'hardware', label: 'Matériel', icon: Landmark },
        { id: 'software', label: 'Logiciel', icon: Zap },
        { id: 'vehicle', label: 'Véhicule', icon: Scale },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Configuration */}
                <div className="lg:col-span-5 space-y-4">
                    <Card className="bg-white dark:bg-slate-900/40 border-slate-200 dark:border-white/5 shadow-sm backdrop-blur-xl overflow-hidden">
                        <CardHeader className="pb-4">
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400">Configuration</p>
                            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Paramètres d&apos;Achat
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Montant TTC</Label>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{amount.toLocaleString()} €</span>
                                </div>
                                <Slider
                                    value={[amount]}
                                    onValueChange={(val: number[]) => setAmount(val[0])}
                                    max={10000}
                                    step={100}
                                    className="py-2"
                                />
                            </div>

                            <div className="flex flex-col gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => setSocialMode('approx')}
                                        className={cn(
                                            "px-3 py-2 rounded-md text-xs font-bold transition-all duration-200",
                                            socialMode === 'approx'
                                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        )}
                                    >
                                        Recommandé
                                        <span className="block text-[9px] font-normal opacity-70">Estimation stable</span>
                                    </button>
                                    <button
                                        onClick={() => setSocialMode('iteratif')}
                                        className={cn(
                                            "px-3 py-2 rounded-md text-xs font-bold transition-all duration-200",
                                            socialMode === 'iteratif'
                                                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        )}
                                    >
                                        Expert
                                        <span className="block text-[9px] font-normal opacity-70">Calcul itératif</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setCategory(cat.id as "hardware" | "software" | "vehicle")}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300",
                                            category === cat.id
                                                ? "bg-blue-600/10 border-blue-600/30 text-blue-600 dark:text-blue-400 shadow-sm"
                                                : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-transparent text-slate-500 hover:border-slate-300 dark:hover:bg-white/10"
                                        )}
                                    >
                                        <cat.icon size={16} />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Results */}
                <div className="lg:col-span-12 lg:row-start-2 xl:col-span-7 xl:row-start-1 space-y-4">
                    <Card className="relative overflow-hidden bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-500/10 shadow-sm dark:shadow-2xl backdrop-blur-xl transition-all duration-500">
                        <CardContent className="p-8">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-emerald-600/70 dark:text-emerald-400/70">Coût réel après impôts</p>
                                <div className="text-6xl md:text-7xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400">
                                    {Math.round(result.coutReel_cents / 100).toLocaleString()} €
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                                <div className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                    Économie : {Math.round((result.sortieImmediate_cents - result.coutReel_cents) / 100).toLocaleString()} €
                                </div>
                                <p className="text-xs font-medium text-emerald-600/60 dark:text-emerald-400/60">
                                    Soit {Math.round((1 - result.coutReel_cents / (amount * 100)) * 100)}% de réduction fiscale
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            { label: 'TVA RÉCUPÉRÉE', value: result.tvaRecuperee_cents, icon: Receipt, color: 'text-blue-500' },
                            { label: 'ÉCO. IMPÔTS', value: result.economieIR_cents + result.economieIS_cents, icon: Landmark, color: 'text-violet-500' },
                            { label: 'ÉCO. CHARGES', value: result.economieCotisations_cents, icon: Scale, color: 'text-amber-500' },
                        ].map((item, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 flex flex-col gap-1 shadow-sm backdrop-blur-md">
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <item.icon size={12} className="opacity-50" />
                                    <span className="text-[9px] font-bold uppercase tracking-[0.1em]">{item.label}</span>
                                </div>
                                <span className={cn("text-xl font-black tracking-tight", item.color)}>
                                    {Math.round(item.value / 100).toLocaleString()} €
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
