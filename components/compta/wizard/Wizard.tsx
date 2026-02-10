"use client";

import React, { useState, useEffect } from "react";
import { Operation, MONTHS, ProExpenseItem } from "@/lib/compta/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { calculateVAT, calculateHT } from "@/lib/compta/calculations";

interface WizardProps {
    initialData: Partial<Operation>;
    onSave: (data: Operation) => void;
    onCancel: () => void;
    onDraftUpdate: (data: Partial<Operation>) => void;
}

export function ComptaWizard({ initialData, onSave, onCancel, onDraftUpdate }: WizardProps) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<Partial<Operation>>(initialData);

    // Autosave draft when data changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            onDraftUpdate(data);
        }, 500);
        return () => clearTimeout(timer);
    }, [data, onDraftUpdate]);

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(s => s + 1);
        }
    };
    const prevStep = () => setStep(s => s - 1);

    const validateStep = (s: number) => {
        if (s === 1) {
            if (!data.year || data.year < 2000 || data.year > 2100) {
                toast.error("Veuillez sélectionner une année valide.");
                return false;
            }
        }
        // Step 2 and 3 have 0 as default, so they are generally valid unless negative
        return true;
    };

    const updateNested = (path: string, value: unknown) => {
        const keys = path.split(".");
        setData(prev => {
            const newData = { ...prev } as Record<string, unknown>;
            let current = newData;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
                current = current[keys[i]] as Record<string, unknown>;
            }
            current[keys[keys.length - 1]] = value;
            return newData as Partial<Operation>;
        });
    };

    // --- Step 1 JSX ---
    const renderStep1 = () => (
        <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    Commencez par définir l&apos;année fiscale de cette opération. Cela permettra de segreger vos données et de calculer vos bilans annuels.
                </p>
            </div>
            <div className="space-y-3">
                <Label htmlFor="year" className="text-base font-semibold">Année fiscale</Label>
                <Select
                    value={data.year?.toString()}
                    onValueChange={(val) => setData(prev => ({ ...prev, year: parseInt(val) }))}
                >
                    <SelectTrigger id="year" className="h-12 text-lg">
                        <SelectValue placeholder="Choisir une année" />
                    </SelectTrigger>
                    <SelectContent>
                        {Array.from({ length: 11 }, (_, i) => 2024 + i).map(y => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );

    // --- Step 2 JSX ---
    const renderStep2 = () => (
        <div className="space-y-8">
            <div className="space-y-3">
                <Label htmlFor="cash" className="text-base font-semibold">Trésorerie actuelle (€)</Label>
                <Input
                    id="cash"
                    type="number"
                    placeholder="0.00"
                    value={data.cashCurrent || ""}
                    onChange={(e) => setData(prev => ({ ...prev, cashCurrent: parseFloat(e.target.value) || 0 }))}
                    className="h-12 text-lg"
                />
                <p className="text-xs text-slate-500">Montant total disponible sur vos comptes au moment de la saisie.</p>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold border-b pb-2">Salaires mois par mois (TTC)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {MONTHS.map(m => {
                        const ttc = data.income?.salaryTTCByMonth?.[m] || 0;
                        const ht = calculateHT(ttc);
                        const tva = calculateVAT(ttc);
                        return (
                            <div key={m} className="space-y-1.5 p-3 rounded-lg border bg-slate-50/50 dark:bg-slate-900/50">
                                <Label className="text-xs uppercase font-bold text-slate-500">{m}</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={ttc || ""}
                                    onChange={(e) => {
                                        const monthValues = { ...(data.income?.salaryTTCByMonth || {}) };
                                        monthValues[m] = parseFloat(e.target.value) || 0;
                                        updateNested("income.salaryTTCByMonth", monthValues);
                                    }}
                                    className="h-9 font-medium"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>HT: {ht.toFixed(2)}€</span>
                                    <span>TVA: {tva.toFixed(2)}€</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/60 dark:border-white/10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-3">
                        <Label htmlFor="otherIncome" className="text-base font-semibold">Autres rentrées TTC (€)</Label>
                        <Input
                            id="otherIncome"
                            type="number"
                            placeholder="0.00"
                            value={data.income?.otherIncomeTTC || ""}
                            onChange={(e) => updateNested("income.otherIncomeTTC", parseFloat(e.target.value) || 0)}
                            className="h-12 text-lg bg-white dark:bg-slate-900"
                        />
                        <p className="text-xs text-slate-500">Dividendes, remboursements, aides, etc.</p>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="otherVAT" className="text-base font-semibold">Taux TVA (%)</Label>
                        <Select
                            value={String(data.income?.otherIncomeVATRate || 0)}
                            onValueChange={(val) => updateNested("income.otherIncomeVATRate", parseInt(val))}
                        >
                            <SelectTrigger id="otherVAT" className="h-12 bg-white dark:bg-slate-900">
                                <SelectValue placeholder="TVA" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">0% (Sans TVA)</SelectItem>
                                <SelectItem value="20">20% (Standard)</SelectItem>
                                <SelectItem value="10">10%</SelectItem>
                                <SelectItem value="5.5">5.5%</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5">
                    <Label className="text-[10px] uppercase text-slate-400 font-bold mb-3 block">Mois de l&apos;encaissement</Label>
                    <div className="flex flex-wrap gap-1.5">
                        {MONTHS.map(m => {
                            const isSelected = data.income?.otherIncomeSelectedMonths?.includes(m);
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                        const current = data.income?.otherIncomeSelectedMonths || [];
                                        const next = current.includes(m)
                                            ? current.filter(x => x !== m)
                                            : [...current, m];
                                        updateNested("income.otherIncomeSelectedMonths", next);
                                    }}
                                    className={cn(
                                        "w-10 h-10 rounded-lg text-xs font-bold transition-all border",
                                        isSelected
                                            ? "bg-blue-600 border-blue-600 text-white shadow-md scale-105"
                                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 hover:border-blue-400"
                                    )}
                                >
                                    {m}
                                </button>
                            );
                        })}
                        <div className="ml-auto flex items-center bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200/60 dark:border-white/10">
                            <span className="text-[10px] text-slate-400 italic">
                                {(!data.income?.otherIncomeSelectedMonths || data.income?.otherIncomeSelectedMonths.length === 0) ? "Par défaut: étalé sur 12 mois" : `${data.income.otherIncomeSelectedMonths.length} encaissement(s)`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- Step 3 JSX ---
    const renderStep3 = () => {
        const isOverride = (data.expenses?.pro?.totalOverrideTTC || 0) > 0;

        const addProItem = () => {
            const items = [...(data.expenses?.pro?.items || [])];
            items.push({
                id: Math.random().toString(36).substr(2, 9),
                label: "Dépense",
                amountTTC: 0,
                vatRate: 20,
                periodicity: "yearly"
            });
            updateNested("expenses.pro.items", items);
        };

        const removeProItem = (id: string) => {
            const items = (data.expenses?.pro?.items || []).filter(i => i.id !== id);
            updateNested("expenses.pro.items", items);
        };

        const updateProItem = (id: string, field: keyof ProExpenseItem, value: unknown) => {
            const items = (data.expenses?.pro?.items || []).map(i => i.id === id ? { ...i, [field]: value } : i);
            updateNested("expenses.pro.items", items);
        };



        const removePersoItem = (id: string) => {
            const items = (data.expenses?.personal?.items || []).filter(i => i.id !== id);
            updateNested("expenses.personal.items", items);
        };

        const removeOtherItem = (id: string) => {
            const items = (data.expenses?.otherItems || []).filter(i => i.id !== id);
            updateNested("expenses.otherItems", items);
        };

        return (
            <div className="space-y-10">
                <section className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-lg font-bold">Charges professionnelles</h3>
                        {isOverride && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase">
                                <AlertCircle size={14} />
                                Override actif
                            </span>
                        )}
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-3 border">
                        <Label className="font-semibold">Total charges pro (Global Override) - Optionnel</Label>
                        <Input
                            type="number"
                            placeholder="Montant total si vous ne voulez pas détailler"
                            value={data.expenses?.pro?.totalOverrideTTC || ""}
                            onChange={(e) => updateNested("expenses.pro.totalOverrideTTC", parseFloat(e.target.value) || 0)}
                            className="bg-white dark:bg-slate-900"
                        />
                    </div>

                    {!isOverride ? (
                        <div className="space-y-3">
                            {(data.expenses?.pro?.items || []).map(item => (
                                <div key={item.id} className="flex gap-2 items-end group bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Libellé</Label>
                                        <Input value={item.label} onChange={(e) => updateProItem(item.id, "label", e.target.value)} placeholder="ex: Adobe Creative" />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">TTC (€)</Label>
                                        <Input type="number" value={item.amountTTC || ""} onChange={(e) => updateProItem(item.id, "amountTTC", parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="w-20 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">TVA %</Label>
                                        <Input type="number" value={item.vatRate} onChange={(e) => updateProItem(item.id, "vatRate", parseFloat(e.target.value) || 0)} />
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Période</Label>
                                        <Select
                                            value={item.periodicity || "yearly"}
                                            onValueChange={(val) => updateProItem(item.id, "periodicity", val)}
                                        >
                                            <SelectTrigger className="h-10 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yearly">Annuel</SelectItem>
                                                <SelectItem value="quarterly">Trimestriel</SelectItem>
                                                <SelectItem value="monthly">Mensuel</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 flex flex-col items-end pb-1 pr-1">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold">Total Annuel</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {(() => {
                                                const m = item.periodicity === "monthly" ? 12 : item.periodicity === "quarterly" ? 4 : 1;
                                                return (item.amountTTC * m).toFixed(2);
                                            })()}€
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 h-10 w-10 mb-0.5" onClick={() => removeProItem(item.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" className="w-full border-dashed" onClick={addProItem}>
                                <Plus size={16} className="mr-2" /> Ajouter une dépense pro
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-slate-400 italic text-sm border-dashed border-2 rounded-xl">
                            La liste détaillée est masquée car vous avez saisi un montant total.
                        </div>
                    )}
                </section>

                <section className="grid md:grid-cols-3 gap-6">
                    {/* URSSAF */}
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-xl relative group">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold flex items-center gap-2">
                                URSSAF
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded">€</span>
                            </Label>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = data.expenses?.social?.urssafByMonth ? undefined : (MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}));
                                    updateNested("expenses.social.urssafByMonth", next);
                                }}
                                className={cn(
                                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-all",
                                    data.expenses?.social?.urssafByMonth
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-blue-500 hover:text-white"
                                )}
                            >
                                {data.expenses?.social?.urssafByMonth ? "Échéancier" : "Standard"}
                            </button>
                        </div>

                        {!data.expenses?.social?.urssafByMonth ? (
                            <div className="space-y-3">
                                <Input type="number" value={data.expenses?.social?.urssaf || ""} onChange={(e) => updateNested("expenses.social.urssaf", parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                <div className="flex items-center justify-between pt-1">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold">Périodicité</Label>
                                    <Select
                                        value={data.expenses?.social?.urssafPeriodicity || "yearly"}
                                        onValueChange={(val) => updateNested("expenses.social.urssafPeriodicity", val)}
                                    >
                                        <SelectTrigger className="h-7 w-24 text-[10px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yearly">Annuel</SelectItem>
                                            <SelectItem value="quarterly">Trimestriel</SelectItem>
                                            <SelectItem value="monthly">Mensuel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(data.expenses?.social?.urssafPeriodicity && data.expenses?.social?.urssafPeriodicity !== "yearly") && (
                                    <p className="text-[10px] text-emerald-600 font-bold text-right pt-1 opacity-80">
                                        Total: {(data.expenses.social.urssaf * (data.expenses.social.urssafPeriodicity === "monthly" ? 12 : 4)).toFixed(2)}€ / an
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {MONTHS.map(m => (
                                    <div key={m} className="space-y-0.5">
                                        <Label className="text-[8px] uppercase text-slate-400 font-bold center block text-center">{m}</Label>
                                        <Input
                                            type="number"
                                            value={data.expenses?.social?.urssafByMonth?.[m] || ""}
                                            onChange={(e) => {
                                                const record = { ...(data.expenses?.social?.urssafByMonth || {}) };
                                                record[m] = parseFloat(e.target.value) || 0;
                                                updateNested("expenses.social.urssafByMonth", record);
                                            }}
                                            className="h-7 px-1 text-[10px] text-center bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* IRCEC */}
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-xl relative group">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold flex items-center gap-2">
                                IRCEC
                                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-1.5 py-0.5 rounded">€</span>
                            </Label>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = data.expenses?.social?.ircecByMonth ? undefined : (MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}));
                                    updateNested("expenses.social.ircecByMonth", next);
                                }}
                                className={cn(
                                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-all",
                                    data.expenses?.social?.ircecByMonth
                                        ? "bg-purple-600 text-white shadow-sm"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-purple-500 hover:text-white"
                                )}
                            >
                                {data.expenses?.social?.ircecByMonth ? "Échéancier" : "Standard"}
                            </button>
                        </div>

                        {!data.expenses?.social?.ircecByMonth ? (
                            <div className="space-y-3">
                                <Input type="number" value={data.expenses?.social?.ircec || ""} onChange={(e) => updateNested("expenses.social.ircec", parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                <div className="flex items-center justify-between pt-1">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold">Périodicité</Label>
                                    <Select
                                        value={data.expenses?.social?.ircecPeriodicity || "yearly"}
                                        onValueChange={(val) => updateNested("expenses.social.ircecPeriodicity", val)}
                                    >
                                        <SelectTrigger className="h-7 w-24 text-[10px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yearly">Annuel</SelectItem>
                                            <SelectItem value="quarterly">Trimestriel</SelectItem>
                                            <SelectItem value="monthly">Mensuel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(data.expenses?.social?.ircecPeriodicity && data.expenses?.social?.ircecPeriodicity !== "yearly") && (
                                    <p className="text-[10px] text-purple-600 font-bold text-right pt-1 opacity-80">
                                        Total: {(data.expenses.social.ircec * (data.expenses.social.ircecPeriodicity === "monthly" ? 12 : 4)).toFixed(2)}€ / an
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {MONTHS.map(m => (
                                    <div key={m} className="space-y-0.5">
                                        <Label className="text-[8px] uppercase text-slate-400 font-bold center block text-center">{m}</Label>
                                        <Input
                                            type="number"
                                            value={data.expenses?.social?.ircecByMonth?.[m] || ""}
                                            onChange={(e) => {
                                                const record = { ...(data.expenses?.social?.ircecByMonth || {}) };
                                                record[m] = parseFloat(e.target.value) || 0;
                                                updateNested("expenses.social.ircecByMonth", record);
                                            }}
                                            className="h-7 px-1 text-[10px] text-center bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Impôts */}
                    <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-xl relative group">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold flex items-center gap-2">
                                Impôts
                                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-1.5 py-0.5 rounded">€</span>
                            </Label>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = data.expenses?.taxes?.incomeTaxByMonth ? undefined : (MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}));
                                    updateNested("expenses.taxes.incomeTaxByMonth", next);
                                }}
                                className={cn(
                                    "text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-all",
                                    data.expenses?.taxes?.incomeTaxByMonth
                                        ? "bg-orange-600 text-white shadow-sm"
                                        : "bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-orange-500 hover:text-white"
                                )}
                            >
                                {data.expenses?.taxes?.incomeTaxByMonth ? "Échéancier" : "Standard"}
                            </button>
                        </div>

                        {!data.expenses?.taxes?.incomeTaxByMonth ? (
                            <div className="space-y-3">
                                <Input type="number" value={data.expenses?.taxes?.incomeTax || ""} onChange={(e) => updateNested("expenses.taxes.incomeTax", parseFloat(e.target.value) || 0)} placeholder="0.00" />
                                <div className="flex items-center justify-between pt-1">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold">Périodicité</Label>
                                    <Select
                                        value={data.expenses?.taxes?.incomeTaxPeriodicity || "yearly"}
                                        onValueChange={(val) => updateNested("expenses.taxes.incomeTaxPeriodicity", val)}
                                    >
                                        <SelectTrigger className="h-7 w-24 text-[10px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yearly">Annuel</SelectItem>
                                            <SelectItem value="quarterly">Trimestriel</SelectItem>
                                            <SelectItem value="monthly">Mensuel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(data.expenses?.taxes?.incomeTaxPeriodicity && data.expenses?.taxes?.incomeTaxPeriodicity !== "yearly") && (
                                    <p className="text-[10px] text-orange-600 font-bold text-right pt-1 opacity-80">
                                        Total: {(data.expenses.taxes.incomeTax * (data.expenses.taxes.incomeTaxPeriodicity === "monthly" ? 12 : 4)).toFixed(2)}€ / an
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {MONTHS.map(m => (
                                    <div key={m} className="space-y-0.5">
                                        <Label className="text-[8px] uppercase text-slate-400 font-bold center block text-center">{m}</Label>
                                        <Input
                                            type="number"
                                            value={data.expenses?.taxes?.incomeTaxByMonth?.[m] || ""}
                                            onChange={(e) => {
                                                const record = { ...(data.expenses?.taxes?.incomeTaxByMonth || {}) };
                                                record[m] = parseFloat(e.target.value) || 0;
                                                updateNested("expenses.taxes.incomeTaxByMonth", record);
                                            }}
                                            className="h-7 px-1 text-[10px] text-center bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">Charges personnelles</h3>
                    <div className="space-y-3">
                        {(data.expenses?.personal?.items || []).map(item => (
                            <div key={item.id} className="flex gap-2 items-end group bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/60 dark:border-white/10 shadow-sm backdrop-blur-sm">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Libellé</Label>
                                    <Input value={item.label} onChange={(e) => {
                                        const items = (data.expenses?.personal?.items || []).map(i => i.id === item.id ? { ...i, label: e.target.value } : i);
                                        updateNested("expenses.personal.items", items);
                                    }} placeholder="Loyer / EDF..." />
                                </div>
                                <div className="w-28 space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Montant (€)</Label>
                                    <Input type="number" value={item.amount || ""} onChange={(e) => {
                                        const items = (data.expenses?.personal?.items || []).map(i => i.id === item.id ? { ...i, amount: parseFloat(e.target.value) || 0 } : i);
                                        updateNested("expenses.personal.items", items);
                                    }} />
                                </div>
                                <div className="w-28 space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Période</Label>
                                    <Select
                                        value={item.periodicity || "yearly"}
                                        onValueChange={(val) => {
                                            const items = (data.expenses?.personal?.items || []).map(i => i.id === item.id ? { ...i, periodicity: val as "monthly" | "yearly" | "quarterly" } : i);
                                            updateNested("expenses.personal.items", items);
                                        }}
                                    >
                                        <SelectTrigger className="h-10 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yearly">Annuel</SelectItem>
                                            <SelectItem value="quarterly">Trimestriel</SelectItem>
                                            <SelectItem value="monthly">Mensuel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-24 flex flex-col items-end pb-1 pr-1">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold">Total Annuel</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {(() => {
                                            const m = item.periodicity === "monthly" ? 12 : item.periodicity === "quarterly" ? 4 : 1;
                                            return ((item.amount || 0) * m).toFixed(2);
                                        })()}€
                                    </span>
                                </div>
                                <Button variant="ghost" size="icon" className="text-red-500 h-10 w-10 mb-0.5" onClick={() => removePersoItem(item.id)}>
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full border-dashed" onClick={() => {
                            const items = [...(data.expenses?.personal?.items || [])];
                            items.push({ id: Math.random().toString(36).substr(2, 9), label: "Dépense perso", amount: 0, periodicity: "monthly" }); // Default to monthly as it's common for perso
                            updateNested("expenses.personal.items", items);
                        }}>
                            <Plus size={16} className="mr-2" /> Ajouter une dépense perso
                        </Button>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">Autres sorties (étallées ou ponctuelles)</h3>
                    <div className="space-y-3">
                        {(data.expenses?.otherItems || []).map(item => (
                            <React.Fragment key={item.id}>
                                <div className="flex gap-2 items-end group bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/60 dark:border-white/10 shadow-sm backdrop-blur-sm">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Libellé</Label>
                                        <Input value={item.label} onChange={(e) => {
                                            const items = (data.expenses?.otherItems || []).map(i => i.id === item.id ? { ...i, label: e.target.value } : i);
                                            updateNested("expenses.otherItems", items);
                                        }} placeholder="Frais divers..." />
                                    </div>
                                    <div className="w-24 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Montant (€)</Label>
                                        <Input type="number" value={item.amount || ""} onChange={(e) => {
                                            const items = (data.expenses?.otherItems || []).map(i => i.id === item.id ? { ...i, amount: parseFloat(e.target.value) || 0 } : i);
                                            updateNested("expenses.otherItems", items);
                                        }} />
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Période</Label>
                                        <Select
                                            value={item.periodicity || "yearly"}
                                            onValueChange={(val) => {
                                                const items = (data.expenses?.otherItems || []).map(i => i.id === item.id ? { ...i, periodicity: val as "monthly" | "yearly" | "quarterly" } : i);
                                                updateNested("expenses.otherItems", items);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 text-xs text-left px-2">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="yearly">Annuel</SelectItem>
                                                <SelectItem value="quarterly">Trimestriel</SelectItem>
                                                <SelectItem value="monthly">Mensuel</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-24 flex flex-col items-end pb-1 pr-1">
                                        <span className="text-[10px] uppercase text-slate-400 font-bold">Total Annuel</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {(() => {
                                                const isMonthly = item.periodicity === "monthly";
                                                const m = isMonthly
                                                    ? (item.selectedMonths && item.selectedMonths.length > 0 ? item.selectedMonths.length : (item.durationMonths || 1))
                                                    : (item.periodicity === "quarterly" ? 4 : 1);
                                                return ((item.amount || 0) * m).toFixed(2);
                                            })()}€
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 h-10 w-10 mb-0.5" onClick={() => removeOtherItem(item.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                                {item.periodicity === "monthly" && (
                                    <div className="bg-blue-50/30 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100/50 dark:border-blue-900/30 ml-4 -mt-1 mb-2">
                                        <Label className="text-[10px] uppercase text-blue-600 dark:text-blue-400 font-bold ml-1 mb-1 block">Mois de versement</Label>
                                        <div className="flex flex-wrap gap-1">
                                            {MONTHS.map(m => {
                                                const isSelected = item.selectedMonths?.includes(m);
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = item.selectedMonths || [];
                                                            const next = current.includes(m)
                                                                ? current.filter(x => x !== m)
                                                                : [...current, m];
                                                            const items = (data.expenses?.otherItems || []).map(i => i.id === item.id ? { ...i, selectedMonths: next } : i);
                                                            updateNested("expenses.otherItems", items);
                                                        }}
                                                        className={cn(
                                                            "w-8 h-8 rounded-md text-[10px] font-bold transition-all border",
                                                            isSelected
                                                                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-500 hover:border-blue-400"
                                                        )}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                            <div className="ml-auto flex items-center">
                                                <span className="text-[10px] text-slate-400 italic">
                                                    {(!item.selectedMonths || item.selectedMonths.length === 0) && `Par défaut: ${item.durationMonths || 1} premiers mois`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                        <Button variant="outline" className="w-full border-dashed" onClick={() => {
                            const items = [...(data.expenses?.otherItems || [])];
                            items.push({ id: Math.random().toString(36).substr(2, 9), label: "Sorties diverses", amount: 0, periodicity: "yearly", durationMonths: 1, selectedMonths: [] });
                            updateNested("expenses.otherItems", items);
                        }}>
                            <Plus size={16} className="mr-2" /> Ajouter une autre sortie
                        </Button>
                    </div>
                </section>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Stepper Header */}
            <div className="flex items-center justify-center mb-12 w-full max-w-2xl mx-auto px-4">
                {[1, 2, 3].map((s, i) => {
                    const labels = ["Année", "Rentrées", "Sorties"];
                    const isCompleted = step > s;
                    const isActive = step === s;

                    return (
                        <React.Fragment key={s}>
                            <div
                                className={cn(
                                    "flex flex-col items-center relative z-10 transition-all",
                                    s < step ? "cursor-pointer hover:opacity-80" : "cursor-default"
                                )}
                                onClick={() => {
                                    if (s < step) setStep(s);
                                }}
                            >
                                <div className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border-2 transition-all duration-300",
                                    isActive ? "bg-blue-600 border-blue-600 text-white shadow-lg ring-4 ring-blue-50 dark:ring-blue-900/20" :
                                        isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                                            "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400"
                                )}>
                                    {isCompleted ? <Check size={18} strokeWidth={3} /> : s}
                                </div>
                                <span className={cn(
                                    "absolute top-12 text-xs font-bold whitespace-nowrap transition-colors duration-300",
                                    isActive ? "text-blue-600 dark:text-blue-400" :
                                        isCompleted ? "text-emerald-500" : "text-slate-400"
                                )}>
                                    {labels[i]}
                                </span>
                            </div>
                            {s < 3 && (
                                <div className="flex-1 h-0.5 mx-4 bg-slate-200 dark:bg-slate-700 relative rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-0 bg-emerald-500 transition-all duration-500 ease-out"
                                        style={{ width: isCompleted ? "100%" : "0%" }}
                                    />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            <Card className="border-slate-200/60 dark:border-white/10 shadow-lg overflow-hidden bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-white/10 pb-8">
                    <CardTitle className="text-2xl font-bold flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                            <Save size={20} />
                        </div>
                        {step === 1 ? "Étape 1 : Année fiscale" : step === 2 ? "Étape 2 : Vos Rentrées" : "Étape 3 : Vos Sorties"}
                    </CardTitle>
                    <p className="text-slate-500 dark:text-slate-300 mt-1">Saisissez les informations pour générer votre bilan.</p>
                </CardHeader>
                <CardContent className="pt-10 pb-10">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </CardContent>
                <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t p-6 flex justify-between">
                    <Button variant="outline" onClick={step === 1 ? onCancel : prevStep}>
                        {step === 1 ? "Annuler" : <><ChevronLeft size={18} className="mr-2" />Précédent</>}
                    </Button>
                    <div className="flex gap-2">
                        {step < 3 ? (
                            <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-700">
                                Suivant <ChevronRight size={18} className="ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={() => onSave(data as Operation)} className="bg-emerald-600 hover:bg-emerald-700">
                                Enregistrer l&apos;opération
                            </Button>
                        )}
                    </div>
                </CardFooter>
            </Card>
            <div className="text-center">
                <p className="text-xs text-slate-400 italic">Brouillon sauvegardé automatiquement dans votre navigateur.</p>
            </div>
        </div>
    );
}
