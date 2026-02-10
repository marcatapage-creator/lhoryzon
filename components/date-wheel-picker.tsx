"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { useLocale } from "next-intl"

interface WheelDatePickerProps {
    value?: Date
    onChange: (date: Date) => void
    minYear?: number
    maxYear?: number
}

// Internal helper to generate Day range
function getDaysInMonth(year: number, monthIndex: number) {
    // monthIndex is 0-11. The 0th day of the NEXT month is the last day of THIS month.
    return new Date(year, monthIndex + 1, 0).getDate()
}

export function WheelDatePicker({
    value = new Date(),
    onChange,
    minYear = 2010, // still needed for lower bound
    maxYear, // Optional, can be overridden by logic relative to maxDate
    maxDate, // New prop
}: WheelDatePickerProps & { maxDate?: Date }) {
    const locale = useLocale()

    // Determine effective max limits based on maxDate
    const currentYear = React.useMemo(() => new Date().getFullYear(), [])
    const effectiveMaxYear = maxDate
        ? maxDate.getFullYear()
        : Math.max(minYear, (maxYear || currentYear + 5))

    // Memoize static arrays
    const months = React.useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, { month: "short" })
        return Array.from({ length: 12 }, (_, i) => {
            const date = new Date(2000, i, 1)
            return {
                value: i,
                label: formatter.format(date),
            }
        })
    }, [locale])

    const years = React.useMemo(() => {
        return Array.from({ length: effectiveMaxYear - minYear + 1 }, (_, i) => minYear + i)
    }, [minYear, effectiveMaxYear])

    // Internal state tracking
    const [selectedDay, setSelectedDay] = React.useState(value.getDate())
    const [selectedMonth, setSelectedMonth] = React.useState(value.getMonth())
    const [selectedYear, setSelectedYear] = React.useState(value.getFullYear())

    // Refs for scrolling
    const dayRef = React.useRef<HTMLDivElement>(null)
    const monthRef = React.useRef<HTMLDivElement>(null)
    const yearRef = React.useRef<HTMLDivElement>(null)

    // Helper to scroll to selected item
    const scrollToSelected = React.useCallback((
        container: HTMLDivElement | null,
        index: number,
        smooth = true
    ) => {
        if (!container) return
        const itemHeight = 40
        container.scrollTo({
            top: index * itemHeight,
            behavior: smooth ? "smooth" : "auto"
        })
    }, [])

    // CLAMPING LOGIC: validation against Month length AND maxDate
    React.useEffect(() => {
        let newDay = selectedDay
        let newMonth = selectedMonth
        let newYear = selectedYear

        // 1. Clamp to maxDate if provided
        if (maxDate) {
            const currentConstructed = new Date(selectedYear, selectedMonth, selectedDay)
            if (currentConstructed > maxDate) {
                // If year is past max, clamp year
                if (selectedYear > maxDate.getFullYear()) {
                    newYear = maxDate.getFullYear()
                }
                // If year is on edge, clamp month
                if (newYear === maxDate.getFullYear() && selectedMonth > maxDate.getMonth()) {
                    newMonth = maxDate.getMonth()
                }
                // If year/month on edge, clamp day
                if (newYear === maxDate.getFullYear() && newMonth === maxDate.getMonth() && selectedDay > maxDate.getDate()) {
                    newDay = maxDate.getDate()
                }
            }
        }

        // 2. Clamp day to valid days in month (standard logic)
        const daysInCurrentMonth = getDaysInMonth(newYear, newMonth)
        if (newDay > daysInCurrentMonth) {
            newDay = daysInCurrentMonth
        }

        // Apply if changed
        if (newDay !== selectedDay || newMonth !== selectedMonth || newYear !== selectedYear) {
            setSelectedDay(newDay)
            setSelectedMonth(newMonth)
            setSelectedYear(newYear)
        }
    }, [selectedYear, selectedMonth, selectedDay, maxDate])


    // Update parent onChange only when effectively changed
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const safeDays = getDaysInMonth(selectedYear, selectedMonth)
            const safeDay = Math.min(selectedDay, safeDays)
            const newDate = new Date(selectedYear, selectedMonth, safeDay)

            if (
                newDate.getDate() !== value.getDate() ||
                newDate.getMonth() !== value.getMonth() ||
                newDate.getFullYear() !== value.getFullYear()
            ) {
                onChange(newDate)
            }
        }, 0)
        return () => clearTimeout(timer)
    }, [selectedDay, selectedMonth, selectedYear, onChange, value])

    // Sync from props (if external change)
    React.useEffect(() => {
        if (
            value.getDate() !== selectedDay ||
            value.getMonth() !== selectedMonth ||
            value.getFullYear() !== selectedYear
        ) {
            setSelectedDay(value.getDate())
            setSelectedMonth(value.getMonth())
            setSelectedYear(value.getFullYear())
        }
    }, [value, selectedDay, selectedMonth, selectedYear])

    // Initial scroll position
    React.useEffect(() => {
        const timer = setTimeout(() => {
            scrollToSelected(dayRef.current, selectedDay - 1, false)
            scrollToSelected(monthRef.current, selectedMonth, false)
            scrollToSelected(yearRef.current, years.indexOf(selectedYear), false)
        }, 10)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Calculate dynamic days array
    const days = React.useMemo(() => {
        const limit = getDaysInMonth(selectedYear, selectedMonth)
        return Array.from({ length: limit }, (_, i) => i + 1)
    }, [selectedYear, selectedMonth])

    // Re-scroll day if days array size changes
    React.useLayoutEffect(() => {
        scrollToSelected(dayRef.current, selectedDay - 1, true)
    }, [days.length, selectedDay, scrollToSelected])


    const handleScroll = (
        e: React.UIEvent<HTMLDivElement>,
        setFunction: React.Dispatch<React.SetStateAction<number>>,
        currentValue: number,
        items: (number | { value: number; label: string })[],
    ) => {
        const container = e.currentTarget
        const itemHeight = 40
        const scrollTop = container.scrollTop
        const index = Math.max(0, Math.min(Math.round(scrollTop / itemHeight), items.length - 1))

        if (index >= 0 && index < items.length) {
            const item = items[index]
            const val = typeof item === 'object' ? item.value : item
            if (val !== currentValue) {
                setFunction(val)
            }
        }
    }

    const columnClass = "flex-1 h-full overflow-y-auto overflow-x-hidden no-scrollbar snap-y snap-mandatory touch-pan-y overscroll-contain relative z-10"
    const itemClass = (isSelected: boolean, isDisabled: boolean) => cn(
        "h-10 w-full flex items-center justify-center text-lg whitespace-nowrap snap-center transition-all cursor-pointer select-none",
        isSelected ? "font-semibold text-foreground opacity-100 scale-110" : "text-muted-foreground/60 opacity-40 scale-90",
        isDisabled && "opacity-20 pointer-events-none grayscale"
    )

    // Check disable status
    const isYearDisabled = (y: number) => maxDate ? y > maxDate.getFullYear() : false
    const isMonthDisabled = (m: number) => {
        if (!maxDate) return false
        if (selectedYear > maxDate.getFullYear()) return true
        if (selectedYear === maxDate.getFullYear() && m > maxDate.getMonth()) return true
        return false
    }
    const isDayDisabled = (d: number) => {
        if (!maxDate) return false
        if (selectedYear > maxDate.getFullYear()) return true
        if (selectedYear === maxDate.getFullYear() && selectedMonth > maxDate.getMonth()) return true
        if (selectedYear === maxDate.getFullYear() && selectedMonth === maxDate.getMonth() && d > maxDate.getDate()) return true
        return false
    }

    // SPACER for top/bottom to ensure first/last items center
    const Spacer = () => <div className="h-[80px] w-full flex-shrink-0" />

    return (
        <div className="relative h-[200px] w-full flex overflow-hidden select-none bg-background font-sans">
            {/* Highlight Bar - pointer-events-none CRITICAL */}
            <div className="absolute top-1/2 left-0 right-0 h-10 -mt-5 bg-muted/20 pointer-events-none border-y border-muted/30 z-0 rounded-sm" />

            {/* Day Column */}
            <div
                ref={dayRef}
                className={columnClass}
                onScroll={(e) => handleScroll(e, setSelectedDay, selectedDay, days)}
            >
                <Spacer />
                {days.map((d) => (
                    <div
                        key={d}
                        className={itemClass(d === selectedDay, isDayDisabled(d))}
                        onClick={() => {
                            if (!isDayDisabled(d)) {
                                setSelectedDay(d)
                                scrollToSelected(dayRef.current, d - 1)
                            }
                        }}
                    >
                        {d}
                    </div>
                ))}
                <Spacer />
            </div>

            {/* Separator */}
            <div className="w-px bg-muted/10 my-6 z-0 pointer-events-none" />

            {/* Month Column */}
            <div
                ref={monthRef}
                className={columnClass}
                onScroll={(e) => handleScroll(e, setSelectedMonth, selectedMonth, months)}
            >
                <Spacer />
                {months.map((m) => (
                    <div
                        key={m.value}
                        className={itemClass(m.value === selectedMonth, isMonthDisabled(m.value))}
                        onClick={() => {
                            if (!isMonthDisabled(m.value)) {
                                setSelectedMonth(m.value)
                                scrollToSelected(monthRef.current, m.value)
                            }
                        }}
                    >
                        {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                    </div>
                ))}
                <Spacer />
            </div>

            {/* Separator */}
            <div className="w-px bg-muted/10 my-6 z-0 pointer-events-none" />

            {/* Year Column */}
            <div
                ref={yearRef}
                className={columnClass}
                onScroll={(e) => handleScroll(e, setSelectedYear, selectedYear, years)}
            >
                <Spacer />
                {years.map((y, idx) => (
                    <div
                        key={y}
                        className={itemClass(y === selectedYear, isYearDisabled(y))}
                        onClick={() => {
                            if (!isYearDisabled(y)) {
                                setSelectedYear(y)
                                scrollToSelected(yearRef.current, idx)
                            }
                        }}
                    >
                        {y}
                    </div>
                ))}
                <Spacer />
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
