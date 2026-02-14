"use client"

import * as React from "react"
import { Operation, Month, MONTHS } from "@/lib/compta/types"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronRight } from "lucide-react"
import { CalendarWheel } from "./CalendarWheel"

interface MobileDashboardSelectorProps {
    operations: Operation[]
    selectedOperationId: string | null
    onOperationChange: (id: string) => void
    monthFilter: Month | "all"
    onMonthChange: (month: Month | "all") => void
}

export function MobileDashboardSelector({
    operations,
    selectedOperationId,
    onOperationChange,
    monthFilter,
    onMonthChange,
}: MobileDashboardSelectorProps) {
    const [open, setOpen] = React.useState(false)

    // Current effective ID (handling null as first op or "all")
    const effectiveOpId = selectedOperationId || (operations[0]?.id || "all")

    // Arrays for wheels
    const opOptions = React.useMemo(() => [
        { label: "Toutes les années", value: "all" },
        ...[...operations].sort((a, b) => b.year - a.year).map(op => ({
            label: op.year.toString(),
            value: op.id
        }))
    ], [operations])

    const monthOptions = React.useMemo(() => [
        { label: "Année complète", value: "all" },
        ...MONTHS.map(m => ({ label: m, value: m }))
    ], [])

    // Display labels for the trigger
    const selectedOpLabel = opOptions.find(o => o.value === effectiveOpId)?.label || "Sélectionner"
    const selectedMonthLabel = monthOptions.find(m => m.value === monthFilter)?.label || "Période"

    return (
        <div className="md:hidden w-full">
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full h-14 justify-between px-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm rounded-xl mb-2"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                                <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Période active</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {selectedOpLabel} {effectiveOpId !== "all" && `• ${selectedMonthLabel}`}
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Button>
                </DrawerTrigger>
                <DrawerContent className="h-[450px]">
                    <DrawerHeader>
                        <DrawerTitle className="text-center text-slate-500 uppercase text-xs tracking-widest pt-2">Sélection de la période</DrawerTitle>
                    </DrawerHeader>

                    <div className="flex-1 flex px-4 mt-4 overflow-hidden">
                        <CalendarWheel
                            years={opOptions}
                            selectedYear={effectiveOpId}
                            onYearChange={onOperationChange}
                            selectedMonth={monthFilter}
                            onMonthChange={onMonthChange}
                        />
                    </div>

                    <DrawerFooter className="pb-8">
                        <DrawerClose asChild>
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-white font-bold rounded-xl shadow-lg touch-manipulation"
                                onPointerDown={(e) => e.stopPropagation()}
                                data-vaul-no-drag
                            >
                                Valider la sélection
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    )
}
