"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Operation, AppEntry, MONTHS } from "@/core/fiscal-v2/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, Pencil, Copy, Calendar, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useComptaStore } from "@/store/comptaStore";
import { EntryEditor } from "./EntryEditor";

interface WizardProps {
    initialData: Partial<Operation>;
    onSave: (data: Operation) => void;
    onCancel: () => void;
    onDraftUpdate: (data: Partial<Operation>) => void;
}

export function ComptaWizard({ initialData, onSave, onCancel, onDraftUpdate }: WizardProps) {
    const [data, setData] = useState<Partial<Operation>>(initialData);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Partial<AppEntry> | undefined>(undefined);

    const refreshSnapshot = useComptaStore(state => state.refreshSnapshot);

    // Sync with store on every change
    useEffect(() => {
        onDraftUpdate(data);
    }, [data, onDraftUpdate]);

    const handleAddEntries = (newEntries: AppEntry[]) => {
        setData(prev => {
            const next = {
                ...prev,
                entries: [...(prev.entries || []), ...newEntries]
            };
            return next;
        });
        // Trigger recompute
        setTimeout(() => refreshSnapshot(), 0);
    };

    const handleUpdateEntry = (updatedEntries: AppEntry[]) => {
        setData(prev => {
            const currentEntries = prev.entries || [];
            // If it was a materialized edit, we might replace multiple? 
            // For now, simple replacement by ID
            const newEntry = updatedEntries[0];
            const next = {
                ...prev,
                entries: currentEntries.map(e => e.id === newEntry.id ? newEntry : e)
            };
            return next;
        });
        setTimeout(() => refreshSnapshot(), 0);
    };

    const removeEntry = (id: string) => {
        setData(prev => ({
            ...prev,
            entries: (prev.entries || []).filter(e => e.id !== id)
        }));
        setTimeout(() => refreshSnapshot(), 0);
    };

    const duplicateEntry = (entry: AppEntry) => {
        const newEntry = { ...entry, id: `entry-${Date.now()}` };
        setData(prev => ({
            ...prev,
            entries: [...(prev.entries || []), newEntry]
        }));
        setTimeout(() => refreshSnapshot(), 0);
    };

    const sortedEntries = useMemo(() => {
        return [...(data.entries || [])].sort((a, b) => a.date.localeCompare(b.date));
    }, [data.entries]);

    const handleFinalSave = () => {
        if (!data.year) return toast.error("Année manquante");
        onSave(data as Operation);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            {/* Header / Year Selection */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold font-heading">
                        Saisie de l'année {data.year}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <Label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Trésorerie Initiale</Label>
                            <div className="flex items-center gap-2">
                                <Euro size={14} className="text-slate-400" />
                                <Input
                                    type="number"
                                    className="h-8 w-24 text-right font-bold"
                                    value={(data.cashCurrent_cents || 0) / 100}
                                    onChange={(e) => setData(prev => ({ ...prev, cashCurrent_cents: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Entry List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Événements économiques ({data.entries?.length || 0})</h3>
                    <Button
                        onClick={() => { setEditingEntry(undefined); setEditorOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={18} className="mr-2" />
                        Ajouter un événement
                    </Button>
                </div>

                {sortedEntries.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed rounded-3xl border-slate-200 dark:border-white/5 opacity-60 bg-slate-50/50 dark:bg-slate-900/20">
                        <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-500 font-medium">Aucun événement saisi pour le moment.<br />Commencez par ajouter vos revenus ou vos charges.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {sortedEntries.map((entry) => (
                            <div
                                key={entry.id}
                                className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-2xl hover:border-blue-500/50 transition-all shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs",
                                        entry.nature === 'INCOME' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30" :
                                            entry.nature === 'EXPENSE_PRO' ? "bg-blue-100 text-blue-600 dark:bg-blue-950/30" :
                                                entry.nature === 'EXPENSE_PERSO' ? "bg-purple-100 text-purple-600 dark:bg-purple-950/30" :
                                                    "bg-slate-100 text-slate-600 dark:bg-slate-800"
                                    )}>
                                        {entry.nature === 'INCOME' ? 'INC' : 'EXP'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{entry.label}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            <span>{new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                            <span className="opacity-30">•</span>
                                            <span className="capitalize">{entry.scope}</span>
                                            {entry.vatRate_bps > 0 && (
                                                <>
                                                    <span className="opacity-30">•</span>
                                                    <span>TVA {entry.vatRate_bps / 100}%</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className={cn(
                                            "font-bold text-sm",
                                            entry.nature === 'INCOME' ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                        )}>
                                            {entry.nature === 'INCOME' ? '+' : '-'}{(entry.amount_ttc_cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                                        </div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">TTC</div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-500" onClick={() => { setEditingEntry(entry); setEditorOpen(true); }}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-500" onClick={() => duplicateEntry(entry)}>
                                            <Copy size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => removeEntry(entry.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="fixed bottom-6 left-0 right-0 px-6 max-w-4xl mx-auto flex items-center gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl bg-white dark:bg-slate-900 font-bold" onClick={onCancel}>
                    Annuler
                </Button>
                <Button className="flex-[2] h-12 rounded-xl bg-black dark:bg-white dark:text-black text-white font-bold shadow-xl shadow-black/10 dark:shadow-white/5" onClick={handleFinalSave}>
                    Enregistrer l'Année {data.year}
                </Button>
            </div>

            <EntryEditor
                isOpen={editorOpen}
                onClose={() => setEditorOpen(false)}
                entry={editingEntry}
                onSave={editingEntry ? handleUpdateEntry : handleAddEntries}
                year={data.year || 2026}
            />
        </div>
    );
}
