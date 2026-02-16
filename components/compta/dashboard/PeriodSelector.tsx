
"use client";

import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useComptaStore, PeriodType } from "@/store/comptaStore";
import { MONTHS, Month } from "@/lib/compta/types";

export function PeriodSelector() {
    const { viewState, setViewState } = useComptaStore();

    const handleTypeChange = (type: string) => {
        const newType = type as PeriodType;
        let newPeriod = viewState.selectedPeriod;

        // Reset period when type changes if needed
        if (newType === 'year') newPeriod = '2024'; // Or current year
        if (newType === 'quarter') newPeriod = 'Q1';
        if (newType === 'month') newPeriod = 'Jan';

        setViewState({ periodType: newType, selectedPeriod: newPeriod });
    };

    return (
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
            <Tabs value={viewState.periodType} onValueChange={handleTypeChange} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3 sm:w-auto h-9">
                    <TabsTrigger value="month" className="text-xs">Mois</TabsTrigger>
                    <TabsTrigger value="quarter" className="text-xs">Trimestre</TabsTrigger>
                    <TabsTrigger value="year" className="text-xs">Année</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="w-full sm:w-auto min-w-[140px]">
                {viewState.periodType === 'month' && (
                    <Select value={viewState.selectedPeriod} onValueChange={(val) => setViewState({ selectedPeriod: val })}>
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                )}

                {viewState.periodType === 'quarter' && (
                    <Select value={viewState.selectedPeriod} onValueChange={(val) => setViewState({ selectedPeriod: val })}>
                        <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Q1">Q1 (Jan-Mar)</SelectItem>
                            <SelectItem value="Q2">Q2 (Avr-Jun)</SelectItem>
                            <SelectItem value="Q3">Q3 (Jul-Sep)</SelectItem>
                            <SelectItem value="Q4">Q4 (Oct-Dec)</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {viewState.periodType === 'year' && (
                    <div className="px-3 py-1.5 text-xs font-bold text-center bg-slate-100 dark:bg-slate-800 rounded-md opacity-70 cursor-not-allowed">
                        Année complète
                    </div>
                )}
            </div>
        </div>
    );
}
