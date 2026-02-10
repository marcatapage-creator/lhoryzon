"use client"

import * as React from "react"
import { WheelPicker } from "./WheelPicker"
import { Month, MONTHS } from "@/lib/compta/types"
import { cn } from "@/lib/utils"

export interface CalendarWheelProps {
    years: { label: string; value: string }[]
    selectedYear: string
    onYearChange: (year: string) => void

    selectedMonth: Month | "all"
    onMonthChange: (month: Month | "all") => void

    disabled?: boolean
}

/**
 * Composition component for Year and Month selection using WheelPickers.
 */
export function CalendarWheel({
    years,
    selectedYear,
    onYearChange,
    selectedMonth,
    onMonthChange,
    disabled = false,
}: CalendarWheelProps) {
    const monthOptions = React.useMemo(() => [
        { label: "Année complète", value: "all" },
        ...MONTHS.map(m => ({ label: m, value: m }))
    ], [])

    // Layout configuration
    const itemHeight = 44
    const visibleCount = 5

    return (
        <div className="flex w-full gap-4 items-start py-4">
            {/* Year Wheel */}
            <div className="flex-1 flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                    Année
                </span>
                <WheelPicker
                    items={years}
                    value={selectedYear}
                    onChange={onYearChange}
                    itemHeight={itemHeight}
                    visibleCount={visibleCount}
                    disabled={disabled}
                    ariaLabel="Sélection de l'année"
                />
            </div>

            {/* Month Wheel */}
            <div className={cn(
                "flex-1 flex flex-col items-center transition-opacity duration-300",
                selectedYear === "all" ? "opacity-20 pointer-events-none" : "opacity-100"
            )}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 bg-slate-100 dark:bg-slate-800/50 px-3 py-1 rounded-full">
                    Période
                </span>
                <WheelPicker
                    items={monthOptions}
                    value={selectedMonth}
                    onChange={(val) => onMonthChange(val as Month | "all")}
                    itemHeight={itemHeight}
                    visibleCount={visibleCount}
                    disabled={disabled || selectedYear === "all"}
                    ariaLabel="Sélection du mois"
                />
            </div>
        </div>
    )
}
