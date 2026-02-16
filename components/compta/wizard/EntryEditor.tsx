"use client";

import React, { useState, useEffect } from "react";
import { z } from "zod";
import { AppEntry, AppEntrySchema, Periodicity, MONTHS } from "@/core/fiscal-v2/domain/types";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EntryEditorProps {
    isOpen: boolean;
    onClose: () => void;
    entry?: Partial<AppEntry>;
    onSave: (entries: AppEntry[]) => void;
    year: number;
}

export function EntryEditor({ isOpen, onClose, entry, onSave, year }: EntryEditorProps) {
    const [formData, setFormData] = useState<Partial<AppEntry>>({
        nature: 'INCOME',
        scope: 'pro',
        label: '',
        amount_ttc_cents: 0,
        vatRate_bps: 0,
        date: `${year}-01-15`,
        category: 'OTHER',
        periodicity: 'yearly',
    });

    useEffect(() => {
        if (isOpen && entry) {
            setFormData({
                nature: 'INCOME',
                scope: 'pro',
                label: '',
                amount_ttc_cents: 0,
                vatRate_bps: 0,
                date: `${year}-01-15`,
                category: 'OTHER',
                periodicity: 'yearly',
                ...entry
            });
        }
    }, [isOpen, entry, year]);

    const handleSave = () => {
        try {
            // Validate basic schema
            const validated = AppEntrySchema.parse({
                ...formData,
                id: formData.id || `entry-${Date.now()}`
            });

            const entries: AppEntry[] = [];
            const periodicity = validated.periodicity || 'yearly';

            if (periodicity === 'yearly') {
                entries.push(validated);
            } else {
                // Materialize occurrences
                const iterations = periodicity === 'monthly' ? 12 : 4;
                const [y, m, d] = validated.date.split('-').map(Number);
                // Create UTC date at noon to avoid any edge case shifts
                const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

                const day = baseDate.getUTCDate();
                const month = baseDate.getUTCMonth(); // 0-11

                for (let i = 0; i < iterations; i++) {
                    const occurrenceDate = new Date(baseDate);
                    if (periodicity === 'monthly') {
                        occurrenceDate.setMonth(i);
                    } else {
                        occurrenceDate.setMonth(i * 3);
                    }

                    // Simple ISO string YYYY-MM-DD
                    const dateStr = occurrenceDate.toISOString().split('T')[0];

                    entries.push({
                        ...validated,
                        id: `${validated.id}-${i}`,
                        date: dateStr,
                        periodicity: 'yearly' // Occurrences are one-off
                    });
                }
            }

            onSave(entries);
            onClose();
        } catch (err) {
            if (err instanceof z.ZodError) {
                toast.error("Veuillez vérifier les champs du formulaire.");
                console.error(err.issues);
            } else {
                toast.error("Une erreur est survenue lors de la sauvegarde.");
            }
        }
    };

    return (
        <Drawer open={isOpen} onClose={onClose}>
            <DrawerContent className="max-h-[90vh]">
                <DrawerHeader className="px-6 py-4 border-b">
                    <DrawerTitle>{entry?.id ? "Modifier l'événement" : "Ajouter un événement"}</DrawerTitle>
                </DrawerHeader>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Nature */}
                    <div className="space-y-2">
                        <Label>Nature de l'événement</Label>
                        <Select
                            value={formData.nature}
                            onValueChange={(val: any) => setFormData({ ...formData, nature: val, scope: val === 'EXPENSE_PERSO' ? 'perso' : 'pro' })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INCOME">Revenu (Encaissement)</SelectItem>
                                <SelectItem value="EXPENSE_PRO">Dépense Professionnelle</SelectItem>
                                <SelectItem value="EXPENSE_PERSO">Retrait Personnel (Loyer, Salaire...)</SelectItem>
                                <SelectItem value="TAX_SOCIAL">Cotisations ou Impôts payés</SelectItem>
                                <SelectItem value="TRANSFER">Virement interne / Remboursement</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Label */}
                    <div className="space-y-2">
                        <Label>Libellé</Label>
                        <Input
                            value={formData.label}
                            onChange={e => setFormData({ ...formData, label: e.target.value })}
                            placeholder="ex: Facture Client X, Loyer, URSSAF..."
                        />
                    </div>

                    {/* Amount & Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Montant TTC (€)</Label>
                            <Input
                                type="number"
                                step="any"
                                value={(formData.amount_ttc_cents || 0) / 100 || ""}
                                onChange={e => setFormData({ ...formData, amount_ttc_cents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Date d'effet</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Periodicity (Materialization) */}
                    <div className="space-y-2">
                        <Label>Périodicité</Label>
                        <Select
                            value={formData.periodicity}
                            onValueChange={(val: any) => setFormData({ ...formData, periodicity: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="yearly">Une seule fois (Ponctuel)</SelectItem>
                                <SelectItem value="monthly">Chaque mois (12 occurrences)</SelectItem>
                                <SelectItem value="quarterly">Chaque trimestre (4 occurrences)</SelectItem>
                            </SelectContent>
                        </Select>
                        {formData.periodicity !== 'yearly' && (
                            <p className="text-[10px] text-amber-600 font-medium italic">
                                Note : cela créera {formData.periodicity === 'monthly' ? '12' : '4'} événements distincts dans votre liste.
                            </p>
                        )}
                    </div>

                    {/* VAT (Simple UI Toggle) */}
                    {formData.nature === 'INCOME' || formData.nature === 'EXPENSE_PRO' ? (
                        <div className="space-y-2">
                            <Label>TVA Applicale</Label>
                            <Select
                                value={formData.vatRate_bps?.toString()}
                                onValueChange={(val) => setFormData({ ...formData, vatRate_bps: parseInt(val) })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0% (Sans TVA, Franchise, etc.)</SelectItem>
                                    <SelectItem value="2000">20% (Standard)</SelectItem>
                                    <SelectItem value="1000">10%</SelectItem>
                                    <SelectItem value="550">5.5%</SelectItem>
                                    <SelectItem value="210">2.1%</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}

                    {/* Meta/Category for Tax Social */}
                    {formData.nature === 'TAX_SOCIAL' && (
                        <div className="space-y-2">
                            <Label>Type de paiement</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="URSSAF">Cotisations URSSAF</SelectItem>
                                    <SelectItem value="IRCEC">Cotisations IRCEC (Retraite)</SelectItem>
                                    <SelectItem value="IR">Impôt sur le Revenu (Acomptes)</SelectItem>
                                    <SelectItem value="VAT">Paiement TVA</SelectItem>
                                    <SelectItem value="CFE">CFE / Autres taxes</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-blue-600 font-medium">
                                Important : Ces entrées sont considérées comme des paiements effectifs et seront déduites des provisions calculées.
                            </p>
                        </div>
                    )}
                </div>

                <DrawerFooter className="px-6 py-4 border-t gap-3">
                    <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl">
                        Enregistrer l'événement
                    </Button>
                    <DrawerClose asChild>
                        <Button variant="outline" className="w-full h-12 rounded-xl border-slate-200">Annuler</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
