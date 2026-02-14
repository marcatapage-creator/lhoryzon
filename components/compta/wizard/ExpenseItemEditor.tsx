"use client";

import React, { useState } from "react";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerFooter,
    DrawerClose
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTHS, Periodicity, Month } from "@/lib/compta/types";

interface ExpenseItemEditorProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'pro' | 'personal' | 'other' | 'urssaf' | 'ircec' | 'tax' | 'income';
    item?: unknown;
    onSave: (item: unknown) => void;
}

interface FormData {
    id: string;
    label: string;
    amount: number;
    amountTTC: number;
    vatRate: number;
    periodicity: Periodicity;
    useByMonth: boolean;
    byMonth: Record<string, number>;
    type?: string;
    category: string;
    selectedMonths: Month[];
    durationMonths: number;
}

export function ExpenseItemEditor({ isOpen, onClose, type, item, onSave }: ExpenseItemEditorProps) {
    const [formData, setFormData] = useState<FormData>(() => {
        if (item) {
            const i = item as Record<string, unknown>;
            const isSocialEdit = !!(i.urssaf_cents !== undefined || i.ircec_cents !== undefined || i.incomeTax_cents !== undefined);

            // Extract byMonth and convert to Euros if needed
            const rawByMonth = (i.urssafByMonth || i.ircecByMonth || i.incomeTaxByMonth || {}) as Record<string, number>;
            const byMonthEuros: Record<string, number> = {};
            Object.entries(rawByMonth).forEach(([m, v]) => {
                byMonthEuros[m] = (Number(v) || 0) / 100;
            });

            return {
                id: (i.id as string) || "",
                label: (i.label as string) || "",
                amount: ((i.amount_cents as number) || (i.amount_ttc_cents as number) || (i.urssaf_cents as number) || (i.ircec_cents as number) || (i.incomeTax_cents as number) || 0) / 100,
                amountTTC: ((i.amount_ttc_cents as number) || (i.amount_cents as number) || 0) / 100,
                vatRate: ((i.vatRate_bps as number) || (i.vatRate as number) * 100 || 2000) / 100,
                periodicity: (i.periodicity as Periodicity) || (i.urssafPeriodicity as Periodicity) || (i.ircecPeriodicity as Periodicity) || (i.incomeTaxPeriodicity as Periodicity) || "yearly",
                useByMonth: Object.keys(rawByMonth).length > 0,
                byMonth: byMonthEuros,
                type: (i.type as string),
                category: (i.category as string) || (type === 'pro' ? 'pro' : type === 'personal' ? 'personal' : type === 'other' ? 'other' : type),
                selectedMonths: (i.selectedMonths as Month[]) || [],
                durationMonths: (i.durationMonths as number) || 1
            };
        } else {
            const isSocialNew = type === 'urssaf' || type === 'ircec' || type === 'tax';
            return {
                id: Math.random().toString(36).substr(2, 9),
                label: isSocialNew ? (type === 'urssaf' ? "Cotisations URSSAF" : type === 'ircec' ? "Cotisations IRCEC" : "Impôt sur le Revenu") : "",
                amount: 0,
                amountTTC: 0,
                vatRate: 20,
                periodicity: isSocialNew ? "monthly" : "yearly",
                useByMonth: false,
                byMonth: {},
                category: type === 'pro' ? 'pro' : type === 'personal' ? 'personal' : type === 'other' ? 'other' : type,
                selectedMonths: [],
                durationMonths: 1
            };
        }
    });

    const isSocial = type === 'urssaf' || type === 'ircec' || type === 'tax';

    const handleSave = () => {
        if (isSocial) {
            const amount_cents = Math.round(formData.amount * 100);
            const byMonthCents: Record<string, number> = {};
            if (formData.useByMonth) {
                Object.entries(formData.byMonth).forEach(([m, v]) => {
                    byMonthCents[m] = Math.round(v * 100);
                });
            }

            const result: Record<string, unknown> = {
                urssaf_cents: type === 'urssaf' ? amount_cents : undefined,
                urssafPeriodicity: type === 'urssaf' ? formData.periodicity : undefined,
                urssafByMonth: type === 'urssaf' ? (formData.useByMonth ? byMonthCents : undefined) : undefined,
                ircec_cents: type === 'ircec' ? amount_cents : undefined,
                ircecPeriodicity: type === 'ircec' ? formData.periodicity : undefined,
                ircecByMonth: type === 'ircec' ? (formData.useByMonth ? byMonthCents : undefined) : undefined,
                incomeTax_cents: type === 'tax' ? amount_cents : undefined,
                incomeTaxPeriodicity: type === 'tax' ? formData.periodicity : undefined,
                incomeTaxByMonth: type === 'tax' ? (formData.useByMonth ? byMonthCents : undefined) : undefined,
                category: type
            };
            onSave(result);
        } else {
            // Convert to cents and bps for standard items
            const result = {
                ...formData,
                amount_cents: Math.round(formData.amount * 100),
                amount_ttc_cents: Math.round(formData.amountTTC * 100),
                vatRate_bps: Math.round(formData.vatRate * 100),
            };

            // Cleanup: remove human-readable fields to avoid confusion but schema is lenient for extra props
            onSave(result);
        }
        onClose();
    };

    return (
        <Drawer open={isOpen} onClose={onClose}>
            <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="px-6 py-4 border-b">
                    <DrawerTitle>
                        {item ? "Modifier" : "Ajouter"} {
                            type === 'pro' ? "une dépense pro" :
                                type === 'personal' ? "un retrait perso" :
                                    type === 'income' ? "un revenu" :
                                        type === 'urssaf' ? "URSSAF" :
                                            type === 'ircec' ? "IRCEC" :
                                                type === 'tax' ? "Impôt" : "une autre dépense"
                        }
                    </DrawerTitle>
                </DrawerHeader>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Label */}
                    {!isSocial && (
                        <div className="space-y-2">
                            <Label>Libellé</Label>
                            <Input
                                value={formData.label}
                                onChange={e => setFormData({ ...formData, label: e.target.value })}
                                placeholder="ex: Adobe Creative Cloud"
                            />
                        </div>
                    )}

                    {/* Sub-category for PRO or PERSONAL */}
                    {(type === 'pro' || type === 'personal') && (
                        <div className="space-y-2">
                            <Label>Catégorie</Label>
                            <Select
                                value={formData.category}
                                onValueChange={val => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {type === 'pro' ? (
                                        <>
                                            <SelectItem value="pro">Dépense Standard (PRO)</SelectItem>
                                            <SelectItem value="social">Cotisation Sociale (URSSAF...)</SelectItem>
                                            <SelectItem value="tax">Impôt / Taxe (CFE...)</SelectItem>
                                            <SelectItem value="vat">Flux TVA (Régularisation...)</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="personal">Dépense Perso (Loyer, Courses...)</SelectItem>
                                            <SelectItem value="btc">Investissement crypto (BTC)</SelectItem>
                                            <SelectItem value="per">Épargne Retraite (PER)</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Amount */}
                    {!formData.useByMonth && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{type === 'pro' || type === 'income' ? "Montant TTC" : "Montant"}</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={formData.amount || ""}
                                    onChange={e => {
                                        const val = e.target.value.replace(',', '.');
                                        const num = parseFloat(val) || 0;
                                        setFormData({ ...formData, amount: num, amountTTC: num });
                                    }}
                                    placeholder="0.00"
                                />
                            </div>

                            {(type === 'pro' || type === 'income') && (
                                <div className="space-y-2">
                                    <Label>Taux de TVA (%)</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={formData.vatRate}
                                        onChange={e => {
                                            const val = e.target.value.replace(',', '.');
                                            setFormData({ ...formData, vatRate: parseFloat(val) || 0 });
                                        }}
                                        placeholder="20"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Periodicity (if not using by month) */}
                    {!formData.useByMonth && (
                        <div className="space-y-2">
                            <Label>Périodicité</Label>
                            <Select
                                value={formData.periodicity}
                                onValueChange={val => setFormData({ ...formData, periodicity: val as Periodicity })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="monthly">Mensuel</SelectItem>
                                    <SelectItem value="quarterly">Trimestriel</SelectItem>
                                    <SelectItem value="yearly">Annuel</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Toggle Use By Month for Social */}
                    {isSocial && (
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="useByMonth"
                                checked={formData.useByMonth}
                                onChange={e => setFormData({ ...formData, useByMonth: e.target.checked })}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                            />
                            <Label htmlFor="useByMonth" className="cursor-pointer">Saisir mois par mois (précis)</Label>
                        </div>
                    )}

                    {/* Monthly grid */}
                    {formData.useByMonth && (
                        <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                            {MONTHS.map(m => (
                                <div key={m} className="space-y-1">
                                    <Label className="text-[10px] uppercase text-slate-400">{m}</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        size={1}
                                        value={formData.byMonth[m] !== undefined ? formData.byMonth[m] : ""}
                                        onChange={e => {
                                            const val = e.target.value.replace(',', '.');
                                            setFormData({
                                                ...formData,
                                                byMonth: { ...formData.byMonth, [m]: parseFloat(val) || 0 }
                                            });
                                        }}
                                        className="h-8 text-xs"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Other specific fields (Duration for 'other') */}
                    {type === 'other' && !formData.selectedMonths.length && (
                        <div className="space-y-2">
                            <Label>Durée (mois)</Label>
                            <Input
                                type="number"
                                value={formData.durationMonths}
                                onChange={e => setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 1 })}
                                min={1}
                                max={12}
                            />
                        </div>
                    )}

                    {/* Month selection for 'other' */}
                    {type === 'other' && (
                        <div className="space-y-2">
                            <Label>Mois spécifiques (optionnel)</Label>
                            <div className="flex flex-wrap gap-2">
                                {MONTHS.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            const newMonths = formData.selectedMonths.includes(m)
                                                ? formData.selectedMonths.filter(x => x !== m)
                                                : [...formData.selectedMonths, m];
                                            setFormData({ ...formData, selectedMonths: newMonths });
                                        }}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${formData.selectedMonths.includes(m)
                                            ? "bg-blue-600 border-blue-600 text-white"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                                            }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DrawerFooter className="px-6 py-4 border-t gap-3">
                    <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                        Enregistrer
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full">Annuler</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer >
    );
}
