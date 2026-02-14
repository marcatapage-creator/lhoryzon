"use client";

import React, { useState, useEffect } from "react";
import { Operation, MONTHS, ProExpenseItem } from "@/lib/compta/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, AlertCircle, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { calculateVAT, calculateHT } from "@/lib/compta/calculations";
import { ExpenseItemEditor } from "./ExpenseItemEditor";
import { WheelPicker } from "../dashboard/WheelPicker";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";

interface WizardProps {
    initialData: Partial<Operation>;
    onSave: (data: Operation) => void;
    onCancel: () => void;
    onDraftUpdate: (data: Partial<Operation>) => void;
}

export function ComptaWizard({ initialData, onSave, onCancel, onDraftUpdate }: WizardProps) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<Partial<Operation>>(initialData);

    // Mobile Drawer State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingType, setEditingType] = useState<'pro' | 'personal' | 'other' | 'urssaf' | 'ircec' | 'tax' | 'income'>('pro');
    const [editingItem, setEditingItem] = useState<unknown>(null);
    const [yearDrawerOpen, setYearDrawerOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    const openDrawer = (type: 'pro' | 'personal' | 'other' | 'urssaf' | 'ircec' | 'tax' | 'income', item?: unknown) => {
        setEditingType(type);
        setEditingItem(item || null);
        setEditorOpen(true);
    };

    const handleDrawerSave = (item: unknown) => {
        let path = "";

        if (editingType === 'pro') path = "expenses.pro.items";
        else if (editingType === 'personal') path = "expenses.personal.items";
        else if (editingType === 'other') path = "expenses.otherItems";
        else if (editingType === 'income') path = "income.items";
        else if (editingType === 'urssaf') {
            updateNested("expenses.social.urssaf_cents", (item as { urssaf_cents: number }).urssaf_cents);
            updateNested("expenses.social.urssafPeriodicity", (item as { urssafPeriodicity: string }).urssafPeriodicity);
            updateNested("expenses.social.urssafByMonth", (item as { urssafByMonth: Record<string, number> }).urssafByMonth);
            return;
        } else if (editingType === 'ircec') {
            updateNested("expenses.social.ircec_cents", (item as { ircec_cents: number }).ircec_cents);
            updateNested("expenses.social.ircecPeriodicity", (item as { ircecPeriodicity: string }).ircecPeriodicity);
            updateNested("expenses.social.ircecByMonth", (item as { ircecByMonth: Record<string, number> }).ircecByMonth);
            return;
        } else if (editingType === 'tax') {
            updateNested("expenses.taxes.incomeTax_cents", (item as { incomeTax_cents: number }).incomeTax_cents);
            updateNested("expenses.taxes.incomeTaxPeriodicity", (item as { incomeTaxPeriodicity: string }).incomeTaxPeriodicity);
            updateNested("expenses.taxes.incomeTaxByMonth", (item as { incomeTaxByMonth: Record<string, number> }).incomeTaxByMonth);
            return;
        }

        const currentItems = (editingType === 'pro' ? data.expenses?.pro?.items :
            editingType === 'personal' ? data.expenses?.personal?.items :
                editingType === 'income' ? data.income?.items :
                    data.expenses?.otherItems) || [];

        const exists = currentItems.some((i: { id: string }) => i.id === (item as { id: string }).id);
        const nextItems = exists
            ? currentItems.map((i: { id: string }) => i.id === (item as { id: string }).id ? item : i)
            : [...currentItems, item];

        updateNested(path, nextItems);
    };

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
    const renderStep1 = () => {
        const years = Array.from({ length: 11 }, (_, i) => 2024 + i);
        const yearItems = years.map(y => ({ label: y.toString(), value: y.toString() }));

        return (
            <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                        Commencez par définir l&apos;année fiscale de cette opération. Cela permettra de segreger vos données et de calculer vos bilans annuels.
                    </p>
                </div>
                <div className="space-y-3">
                    <Label htmlFor="year" className="text-base font-semibold">Année fiscale</Label>

                    {isMobile ? (
                        <div
                            className="flex items-center justify-between w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer active:scale-[0.98] transition-all"
                            onClick={() => setYearDrawerOpen(true)}
                        >
                            <span className="text-lg font-medium text-slate-900 dark:text-white">
                                {data.year || "Choisir une année"}
                            </span>
                            <ChevronRight size={20} className="text-slate-400" />
                        </div>
                    ) : (
                        <Select
                            value={data.year?.toString()}
                            onValueChange={(val) => setData(prev => ({ ...prev, year: parseInt(val) }))}
                        >
                            <SelectTrigger id="year" className="h-12 text-lg">
                                <SelectValue placeholder="Choisir une année" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Mobile Year Picker Drawer */}
                <Drawer open={yearDrawerOpen} onOpenChange={setYearDrawerOpen}>
                    <DrawerContent className="px-4 pb-8 h-[400px]">
                        <DrawerHeader>
                            <DrawerTitle>Choisir l&apos;année fiscale</DrawerTitle>
                        </DrawerHeader>
                        <div className="flex-1 flex items-center justify-center py-4">
                            <WheelPicker
                                items={yearItems}
                                value={data.year?.toString() || "2024"}
                                onChange={(val) => setData(prev => ({ ...prev, year: parseInt(val) }))}
                            />
                        </div>
                        <DrawerFooter className="px-0">
                            <Button onClick={() => setYearDrawerOpen(false)} className="h-12 bg-blue-600 hover:bg-blue-700 text-base">
                                Valider
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            </div>
        );
    };

    // --- Step 2 JSX ---
    const renderStep2 = () => (
        <div className="space-y-8">
            <div className="space-y-3">
                <Label htmlFor="cash" className="text-base font-semibold">Trésorerie actuelle (€)</Label>
                <Input
                    id="cash"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={(data.cashCurrent_cents || 0) / 100 || ""}
                    onChange={(e) => {
                        const val = e.target.value.replace(',', '.');
                        setData(prev => ({ ...prev, cashCurrent_cents: Math.round(parseFloat(val) * 100) || 0 }));
                    }}
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
                                    step="any"
                                    placeholder="0.00"
                                    value={(ttc / 100) || ""}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(',', '.');
                                        const monthValues = { ...(data.income?.salaryTTCByMonth || {}) };
                                        monthValues[m] = Math.round(parseFloat(val) * 100) || 0;
                                        updateNested("income.salaryTTCByMonth", monthValues);
                                    }}
                                    className="h-9 font-medium"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400">
                                    <span>HT: {(calculateHT(ttc / 100) || 0).toFixed(2)}€</span>
                                    <span>TVA: {(calculateVAT(ttc / 100) || 0).toFixed(2)}€</span>
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
                            step="any"
                            placeholder="0.00"
                            value={(data.income?.otherIncomeTTC_cents || 0) / 100 || ""}
                            onChange={(e) => {
                                const val = e.target.value.replace(',', '.');
                                updateNested("income.otherIncomeTTC_cents", Math.round(parseFloat(val) * 100) || 0);
                            }}
                            className="h-12 text-lg bg-white dark:bg-slate-900"
                        />
                        <p className="text-xs text-slate-500">Dividendes, remboursements, aides, etc.</p>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="otherVAT" className="text-base font-semibold">Taux TVA (%)</Label>
                        <Select
                            value={String((data.income?.otherIncomeVATRate_bps || 0) / 100)}
                            onValueChange={(val) => updateNested("income.otherIncomeVATRate_bps", Math.round(parseFloat(val) * 100))}
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

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Rentrées régulières / Récurrentes</h3>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openDrawer('income')}
                        className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                    >
                        <Plus size={16} className="mr-1" />
                        Ajouter un revenu
                    </Button>
                </div>
                {(!data.income?.items || data.income.items.length === 0) ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-2xl border-slate-200 dark:border-white/5 opacity-60">
                        <p className="text-sm text-slate-500">Aucun revenu complémentaire configuré.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {data.income.items.map((item: any) => (
                            <div key={item.id} className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 flex items-center justify-between group">
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">{item.label}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-2">
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {((item.amount_ttc_cents || 0) / 100).toLocaleString()}€ TTC
                                        </span>
                                        <span className="opacity-50">•</span>
                                        <span className="capitalize">{item.periodicity === 'monthly' ? 'Mensuel' : item.periodicity === 'quarterly' ? 'Trimestriel' : 'Annuel'}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDrawer('income', item)}>
                                        <Pencil size={14} className="text-slate-400" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            const next = data.income?.items?.filter((i: { id: string }) => i.id !== item.id);
                                            updateNested("income.items", next);
                                        }}
                                    >
                                        <Trash2 size={14} className="text-red-400" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // --- Step 3 JSX ---
    const renderStep3 = () => {
        const isOverride = (data.expenses?.pro?.totalOverrideTTC_cents || 0) > 0;

        const addProItem = () => {
            const items = [...(data.expenses?.pro?.items || [])];
            items.push({
                id: Math.random().toString(36).substr(2, 9),
                label: "Dépense",
                amount_ttc_cents: 0,
                vatRate_bps: 2000,
                periodicity: "yearly",
                category: "pro"
            } as any);
            updateNested("expenses.pro.items", items);
        };

        const removeProItem = (id: string) => {
            const items = (data.expenses?.pro?.items || []).filter(i => i.id !== id);
            updateNested("expenses.pro.items", items);
        };

        const updateProItem = (id: string, field: string, value: unknown) => {
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
                            value={(data.expenses?.pro?.totalOverrideTTC_cents || 0) / 100 || ""}
                            onChange={(e) => updateNested("expenses.pro.totalOverrideTTC_cents", Math.round(parseFloat(e.target.value) * 100) || 0)}
                            className="bg-white dark:bg-slate-900"
                        />
                    </div>

                    {!isOverride ? (
                        <div className="space-y-3">
                            {/* Desktop View */}
                            <div className="hidden md:block space-y-3">
                                {(data.expenses?.pro?.items || []).map(item => (
                                    <div key={item.id} className="flex gap-2 items-end group bg-white dark:bg-slate-900 p-3 rounded-lg border shadow-sm">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Libellé</Label>
                                            <Input value={item.label} onChange={(e) => updateProItem(item.id, "label", e.target.value)} placeholder="ex: Adobe Creative" />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">TTC (€)</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                value={(item.amount_ttc_cents || 0) / 100 || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(',', '.');
                                                    updateProItem(item.id, "amount_ttc_cents", Math.round(parseFloat(val) * 100) || 0);
                                                }}
                                            />
                                        </div>
                                        <div className="w-20 space-y-1">
                                            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">TVA %</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                value={item.vatRate_bps / 100}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(',', '.');
                                                    updateProItem(item.id, "vatRate_bps", Math.round(parseFloat(val) * 100) || 0);
                                                }}
                                            />
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
                                                    return ((item.amount_ttc_cents / 100) * m).toFixed(2);
                                                })()}€
                                            </span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 h-10 w-10 mb-0.5" onClick={() => removeProItem(item.id)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Mobile View */}
                            <div className="md:hidden space-y-3">
                                {(data.expenses?.pro?.items || []).map(item => (
                                    <div
                                        key={item.id}
                                        className="bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
                                        onClick={() => openDrawer('pro', item)}
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{item.label}</h4>
                                                <Pencil size={10} className="text-slate-400" />
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{(item.amount_ttc_cents || 0) / 100}€ TTC</span>
                                                <span className="text-slate-300">•</span>
                                                <span className="capitalize">{item.periodicity === 'yearly' ? 'annuel' : item.periodicity === 'monthly' ? 'mensuel' : 'trimestriel'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase text-slate-400 font-bold">Annuel</div>
                                                <div className="font-bold text-blue-600">
                                                    {(() => {
                                                        const m = item.periodicity === "monthly" ? 12 : item.periodicity === "quarterly" ? 4 : 1;
                                                        return ((item.amount_ttc_cents / 100) * m).toFixed(0);
                                                    })()}€
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-400 hover:text-red-600"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeProItem(item.id);
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button
                                variant="outline"
                                className="w-full border-dashed h-12 md:h-10"
                                onClick={() => isMobile ? openDrawer('pro') : addProItem()}
                            >
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
                    <div
                        className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-xl relative group active:scale-[0.98] md:active:scale-[1] transition-all cursor-pointer md:cursor-default"
                        onClick={() => {
                            if (isMobile) {
                                openDrawer('urssaf', {
                                    urssaf_cents: data.expenses?.social?.urssaf_cents || 0,
                                    urssafPeriodicity: data.expenses?.social?.urssafPeriodicity || 'monthly',
                                    urssafByMonth: data.expenses?.social?.urssafByMonth
                                });
                            }
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold flex items-center gap-2">
                                URSSAF
                                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded">€</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                {isMobile && <Pencil size={10} className="text-slate-400 mr-1" />}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        if (isMobile) return; // Managed in drawer
                                        e.stopPropagation();
                                        const next = data.expenses?.social?.urssafByMonth ? undefined : (MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}));
                                        updateNested("expenses.social.urssafByMonth", next);
                                    }}
                                    className={cn(
                                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-all",
                                        data.expenses?.social?.urssafByMonth
                                            ? "bg-blue-600 text-white shadow-sm"
                                            : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                    )}
                                >
                                    {data.expenses?.social?.urssafByMonth ? "Échéancier" : "Standard"}
                                </button>
                            </div>
                        </div>

                        {!isMobile && !data.expenses?.social?.urssafByMonth ? (
                            <div className="space-y-3">
                                <Input
                                    type="number"
                                    step="any"
                                    value={(data.expenses?.social?.urssaf_cents || 0) / 100 || ""}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(',', '.');
                                        updateNested("expenses.social.urssaf_cents", Math.round(parseFloat(val) * 100) || 0);
                                    }}
                                    placeholder="0.00"
                                />
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
                                        Total: {((data.expenses.social.urssaf_cents / 100) * (data.expenses.social.urssafPeriodicity === "monthly" ? 12 : 4)).toFixed(2)}€ / an
                                    </p>
                                )}
                            </div>
                        ) : !isMobile ? (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {MONTHS.map(m => (
                                    <div key={m} className="space-y-0.5">
                                        <Label className="text-[8px] uppercase text-slate-400 font-bold center block text-center">{m}</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={(data.expenses?.social?.urssafByMonth?.[m] || 0) / 100 || ""}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(',', '.');
                                                const record = { ...(data.expenses?.social?.urssafByMonth || {}) };
                                                record[m] = Math.round(parseFloat(val) * 100) || 0;
                                                updateNested("expenses.social.urssafByMonth", record);
                                            }}
                                            className="h-7 px-1 text-[10px] text-center bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pt-2">
                                <div className="text-xl font-bold text-slate-900 dark:text-white">
                                    {data.expenses?.social?.urssafByMonth && Object.keys(data.expenses.social.urssafByMonth).length > 0
                                        ? (Object.values(data.expenses.social.urssafByMonth).reduce((a: number, b: number) => a + (Number(b) || 0), 0) / 100).toFixed(2)
                                        : ((data.expenses?.social?.urssaf_cents || 0) / 100 * (data.expenses?.social?.urssafPeriodicity === 'monthly' ? 12 : data.expenses?.social?.urssafPeriodicity === 'quarterly' ? 4 : 1)).toFixed(2)}€
                                    <span className="text-[10px] text-slate-400 font-normal ml-2 uppercase">Total par an</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold flex items-center gap-2">
                                    {data.expenses?.social?.urssafByMonth ? "Saisie par mois" : `${data.expenses?.social?.urssafPeriodicity === 'yearly' ? 'Annuel' : data.expenses?.social?.urssafPeriodicity === 'monthly' ? 'Mensuel' : 'Trimestriel'}`}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* IRCEC */}
                    <div
                        className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-xl relative group active:scale-[0.98] md:active:scale-[1] transition-all cursor-pointer md:cursor-default"
                        onClick={() => {
                            if (isMobile) {
                                openDrawer('ircec', {
                                    ircec_cents: data.expenses?.social?.ircec_cents || 0,
                                    ircecPeriodicity: data.expenses?.social?.ircecPeriodicity || 'monthly',
                                    ircecByMonth: data.expenses?.social?.ircecByMonth
                                });
                            }
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold flex items-center gap-2">
                                IRCEC
                                <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 px-1.5 py-0.5 rounded">€</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                {isMobile && <Pencil size={10} className="text-slate-400 mr-1" />}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        if (isMobile) return;
                                        e.stopPropagation();
                                        const next = data.expenses?.social?.ircecByMonth ? undefined : (MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}));
                                        updateNested("expenses.social.ircecByMonth", next);
                                    }}
                                    className={cn(
                                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-all",
                                        data.expenses?.social?.ircecByMonth
                                            ? "bg-purple-600 text-white shadow-sm"
                                            : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                    )}
                                >
                                    {data.expenses?.social?.ircecByMonth ? "Échéancier" : "Standard"}
                                </button>
                            </div>
                        </div>

                        {!isMobile && !data.expenses?.social?.ircecByMonth ? (
                            <div className="space-y-3">
                                <Input
                                    type="number"
                                    step="any"
                                    value={(data.expenses?.social?.ircec_cents || 0) / 100 || ""}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(',', '.');
                                        updateNested("expenses.social.ircec_cents", Math.round(parseFloat(val) * 100) || 0);
                                    }}
                                    placeholder="0.00"
                                />
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
                                        Total: {((data.expenses.social.ircec_cents / 100) * (data.expenses.social.ircecPeriodicity === "monthly" ? 12 : 4)).toFixed(2)}€ / an
                                    </p>
                                )}
                            </div>
                        ) : !isMobile ? (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {MONTHS.map(m => (
                                    <div key={m} className="space-y-0.5">
                                        <Label className="text-[8px] uppercase text-slate-400 font-bold center block text-center">{m}</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={(data.expenses?.social?.ircecByMonth?.[m] || 0) / 100 || ""}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(',', '.');
                                                const record = { ...(data.expenses?.social?.ircecByMonth || {}) };
                                                record[m] = Math.round(parseFloat(val) * 100) || 0;
                                                updateNested("expenses.social.ircecByMonth", record);
                                            }}
                                            className="h-7 px-1 text-[10px] text-center bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pt-2">
                                <div className="text-xl font-bold text-slate-900 dark:text-white">
                                    {data.expenses?.social?.ircecByMonth && Object.keys(data.expenses.social.ircecByMonth).length > 0
                                        ? (Object.values(data.expenses.social.ircecByMonth).reduce((a: number, b: number) => a + (Number(b) || 0), 0) / 100).toFixed(2)
                                        : ((data.expenses?.social?.ircec_cents || 0) / 100 * (data.expenses?.social?.ircecPeriodicity === 'monthly' ? 12 : data.expenses?.social?.ircecPeriodicity === 'quarterly' ? 4 : 1)).toFixed(2)}€
                                    <span className="text-[10px] text-slate-400 font-normal ml-2 uppercase">Total par an</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold flex items-center gap-2">
                                    {data.expenses?.social?.ircecByMonth ? "Saisie par mois" : `${data.expenses?.social?.ircecPeriodicity === 'yearly' ? 'Annuel' : data.expenses?.social?.ircecPeriodicity === 'monthly' ? 'Mensuel' : 'Trimestriel'}`}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Impôts */}
                    <div
                        className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 border rounded-xl relative group active:scale-[0.98] md:active:scale-[1] transition-all cursor-pointer md:cursor-default"
                        onClick={() => {
                            if (isMobile) {
                                openDrawer('tax', {
                                    incomeTax_cents: data.expenses?.taxes?.incomeTax_cents || 0,
                                    incomeTaxPeriodicity: data.expenses?.taxes?.incomeTaxPeriodicity || 'monthly',
                                    incomeTaxByMonth: data.expenses?.taxes?.incomeTaxByMonth
                                });
                            }
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold flex items-center gap-2">
                                Impôts
                                <span className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-600 px-1.5 py-0.5 rounded">€</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                {isMobile && <Pencil size={10} className="text-slate-400 mr-1" />}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        if (isMobile) return;
                                        e.stopPropagation();
                                        const next = data.expenses?.taxes?.incomeTaxByMonth ? undefined : (MONTHS.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}));
                                        updateNested("expenses.taxes.incomeTaxByMonth", next);
                                    }}
                                    className={cn(
                                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded transition-all",
                                        data.expenses?.taxes?.incomeTaxByMonth
                                            ? "bg-orange-600 text-white shadow-sm"
                                            : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                                    )}
                                >
                                    {data.expenses?.taxes?.incomeTaxByMonth ? "Échéancier" : "Standard"}
                                </button>
                            </div>
                        </div>

                        {!isMobile && !data.expenses?.taxes?.incomeTaxByMonth ? (
                            <div className="space-y-3">
                                <Input
                                    type="number"
                                    step="any"
                                    value={(data.expenses?.taxes?.incomeTax_cents || 0) / 100 || ""}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(',', '.');
                                        updateNested("expenses.taxes.incomeTax_cents", Math.round(parseFloat(val) * 100) || 0);
                                    }}
                                    placeholder="0.00"
                                />
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
                                        Total: {((data.expenses.taxes.incomeTax_cents / 100) * (data.expenses.taxes.incomeTaxPeriodicity === "monthly" ? 12 : 4)).toFixed(2)}€ / an
                                    </p>
                                )}
                            </div>
                        ) : !isMobile ? (
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                                {MONTHS.map(m => (
                                    <div key={m} className="space-y-0.5">
                                        <Label className="text-[8px] uppercase text-slate-400 font-bold center block text-center">{m}</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={(data.expenses?.taxes?.incomeTaxByMonth?.[m] || 0) / 100 || ""}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(',', '.');
                                                const record = { ...(data.expenses?.taxes?.incomeTaxByMonth || {}) };
                                                record[m] = Math.round(parseFloat(val) * 100) || 0;
                                                updateNested("expenses.taxes.incomeTaxByMonth", record);
                                            }}
                                            className="h-7 px-1 text-[10px] text-center bg-white dark:bg-slate-900 border-slate-200"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="pt-2">
                                <div className="text-xl font-bold text-slate-900 dark:text-white">
                                    {data.expenses?.taxes?.incomeTaxByMonth && Object.keys(data.expenses.taxes.incomeTaxByMonth).length > 0
                                        ? (Object.values(data.expenses.taxes.incomeTaxByMonth).reduce((a: number, b: number) => a + (Number(b) || 0), 0) / 100).toFixed(2)
                                        : ((data.expenses?.taxes?.incomeTax_cents || 0) / 100 * (data.expenses?.taxes?.incomeTaxPeriodicity === 'monthly' ? 12 : data.expenses?.taxes?.incomeTaxPeriodicity === 'quarterly' ? 4 : 1)).toFixed(2)}€
                                    <span className="text-[10px] text-slate-400 font-normal ml-2 uppercase">Total par an</span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1 uppercase font-bold flex items-center gap-2">
                                    {data.expenses?.taxes?.incomeTaxByMonth ? "Saisie par mois" : `${data.expenses?.taxes?.incomeTaxPeriodicity === 'yearly' ? 'Annuel' : data.expenses?.taxes?.incomeTaxPeriodicity === 'monthly' ? 'Mensuel' : 'Trimestriel'}`}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">Charges personnelles</h3>
                    <div className="space-y-3">
                        {/* Desktop */}
                        <div className="hidden md:block space-y-3">
                            {(data.expenses?.personal?.items || []).map(item => (
                                <div key={item.id} className="flex gap-2 items-end group bg-white dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200/60 dark:border-white/10 shadow-sm backdrop-blur-sm">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Libellé</Label>
                                            {item.category === 'btc' && <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full uppercase">Bitcoin</span>}
                                            {item.category === 'per' && <span className="text-[9px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase">PER</span>}
                                        </div>
                                        <Input value={item.label} onChange={(e) => {
                                            const items = (data.expenses?.personal?.items || []).map(i => i.id === item.id ? { ...i, label: e.target.value } : i);
                                            updateNested("expenses.personal.items", items);
                                        }} placeholder="Loyer / EDF..." />
                                    </div>
                                    <div className="w-28 space-y-1">
                                        <Label className="text-[10px] uppercase text-slate-400 font-bold ml-1">Montant (€)</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={(item.amount_cents || 0) / 100 || ""}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(',', '.');
                                                const items = (data.expenses?.personal?.items || []).map(i => i.id === item.id ? { ...i, amount_cents: Math.round(parseFloat(val) * 100) || 0 } : i);
                                                updateNested("expenses.personal.items", items);
                                            }}
                                        />
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
                                                return (((item.amount_cents || 0) / 100) * m).toFixed(2);
                                            })()}€
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 h-10 w-10 mb-0.5" onClick={() => removePersoItem(item.id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden space-y-3">
                            {(data.expenses?.personal?.items || []).map(item => (
                                <div
                                    key={item.id}
                                    className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all"
                                    onClick={() => openDrawer('personal', item)}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{item.label}</h4>
                                            {item.category === 'btc' && <span className="text-[8px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full uppercase">BTC</span>}
                                            {item.category === 'per' && <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full uppercase">PER</span>}
                                            <Pencil size={10} className="text-slate-400" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>{(item.amount_cents || 0) / 100}€</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="capitalize">{item.periodicity === 'yearly' ? 'annuel' : item.periodicity === 'monthly' ? 'mensuel' : 'trimestriel'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase text-slate-400 font-bold">Annuel</div>
                                            <div className="font-bold text-purple-600">
                                                {(() => {
                                                    const m = item.periodicity === "monthly" ? 12 : item.periodicity === "quarterly" ? 4 : 1;
                                                    return (((item.amount_cents || 0) / 100) * m).toFixed(0);
                                                })()}€
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removePersoItem(item.id);
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            className="w-full border-dashed h-12 md:h-10"
                            onClick={() => {
                                if (isMobile) {
                                    openDrawer('personal');
                                } else {
                                    const items = [...(data.expenses?.personal?.items || [])];
                                    items.push({ id: Math.random().toString(36).substr(2, 9), label: "Dépense perso", amount_cents: 0, periodicity: "monthly", category: "personal" } as any);
                                    updateNested("expenses.personal.items", items);
                                }
                            }}
                        >
                            <Plus size={16} className="mr-2" /> Ajouter une dépense perso
                        </Button>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-bold border-b pb-2">Autres sorties (étallées ou ponctuelles)</h3>
                    <div className="space-y-3">
                        {/* Desktop */}
                        <div className="hidden md:block space-y-3">
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
                                            <Input
                                                type="number"
                                                step="any"
                                                value={(item.amount_cents || 0) / 100 || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(',', '.');
                                                    const items = (data.expenses?.otherItems || []).map(i => i.id === item.id ? { ...i, amount_cents: Math.round(parseFloat(val) * 100) || 0 } : i);
                                                    updateNested("expenses.otherItems", items);
                                                }}
                                            />
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
                                                    return (((item.amount_cents || 0) / 100) * m).toFixed(2);
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
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden space-y-3">
                            {(data.expenses?.otherItems || []).map(item => (
                                <div
                                    key={item.id}
                                    className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all"
                                    onClick={() => openDrawer('other', item)}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{item.label}</h4>
                                            <Pencil size={10} className="text-slate-400" />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span>{(item.amount_cents || 0) / 100}€</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="capitalize">{item.periodicity === 'yearly' ? 'annuel' : item.periodicity === 'monthly' ? 'mensuel' : 'trimestriel'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-[10px] uppercase text-slate-400 font-bold">Annuel</div>
                                            <div className="font-bold text-blue-500">
                                                {(() => {
                                                    const m = item.periodicity === "monthly" ? (item.selectedMonths?.length || item.durationMonths || 1) : (item.periodicity === "quarterly" ? 4 : 1);
                                                    return (((item.amount_cents || 0) / 100) * m).toFixed(0);
                                                })()}€
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOtherItem(item.id);
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            className="w-full border-dashed h-12 md:h-10"
                            onClick={() => {
                                if (isMobile) {
                                    openDrawer('other');
                                } else {
                                    const items = [...(data.expenses?.otherItems || [])];
                                    items.push({ id: Math.random().toString(36).substr(2, 9), label: "Sorties diverses", amount_cents: 0, periodicity: "yearly", durationMonths: 1, selectedMonths: [], category: "other" } as any);
                                    updateNested("expenses.otherItems", items);
                                }
                            }}
                        >
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

            {editorOpen && (
                <ExpenseItemEditor
                    isOpen={editorOpen}
                    onClose={() => {
                        setEditorOpen(false);
                        setEditingItem(null);
                    }}
                    type={editingType}
                    item={editingItem}
                    onSave={handleDrawerSave}
                />
            )}
        </div>
    );
}
