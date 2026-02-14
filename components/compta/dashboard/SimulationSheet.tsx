"use client";

import React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { SimulationView } from "@/components/simulation/SimulationView";
import { FlaskConical } from "lucide-react";

interface SimulationSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SimulationSheet = ({ isOpen, onOpenChange }: SimulationSheetProps) => {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-white/10 p-0 overflow-hidden flex flex-col"
            >
                <SheetHeader className="p-6 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-600 dark:text-blue-400">
                            <FlaskConical className="w-5 h-5" />
                        </div>
                        <SheetTitle className="text-xl font-bold bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                            Simulateur d&apos;Achat Fiscal
                        </SheetTitle>
                    </div>
                    <SheetDescription className="text-slate-500 dark:text-slate-400">
                        Estimez l&apos;impact réel d&apos;une dépense sur votre trésorerie et vos impôts.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto scrollbar-hide">
                    {/* Embed the view. We might need to adjust SimulationView slightly if it has too much internal padding */}
                    <div className="py-6 px-2 sm:px-4">
                        <SimulationView />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98]"
                    >
                        Terminer la simulation
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
};
