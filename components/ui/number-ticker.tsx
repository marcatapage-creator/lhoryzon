"use client"

import { useEffect, useState } from "react"
import { useSpring } from "framer-motion"
import { cn, formatDashboardCurrency, formatDashboardAmount } from "@/lib/utils"
import { useLocale } from "next-intl"

interface NumberTickerProps {
    value: number
    currency?: string
    delay?: number
    className?: string
    textClassName?: string
    decimalClassName?: string
    isCurrency?: boolean
}

export function NumberTicker({
    value,
    currency = "eur",
    delay = 0,
    className,
    textClassName,
    decimalClassName,
    isCurrency = true,
}: NumberTickerProps) {
    const locale = useLocale()
    const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 })
    const [displayValue, setDisplayValue] = useState({ integer: "0", decimal: "", full: "0" })

    useEffect(() => {
        // Start animation after delay
        const timeout = setTimeout(() => {
            spring.set(value)
        }, delay * 1000)

        const unsubscribe = spring.on("change", (latest) => {
            // Provide a value that changes
            const val = isCurrency
                ? formatDashboardCurrency(latest, currency, locale)
                : formatDashboardAmount(latest, locale)

            // Try to split integer and decimal
            // Regex to find the last separator (comma or dot) followed by digits
            // We assume formatDashboardCurrency output format roughly
            const match = val.match(/^(.*)([,.]\d{2}.*)$/)

            if (match) {
                setDisplayValue({
                    integer: match[1],
                    decimal: match[2],
                    full: val
                })
            } else {
                setDisplayValue({
                    integer: val,
                    decimal: "",
                    full: val
                })
            }
        })

        return () => {
            clearTimeout(timeout)
            unsubscribe()
        }
    }, [spring, value, delay, currency, locale, isCurrency])

    return (
        <div className={cn("inline-flex items-baseline", className)}>
            {displayValue.decimal ? (
                <>
                    <span className={cn(textClassName)}>{displayValue.integer}</span>
                    <span className={cn(decimalClassName)}>{displayValue.decimal}</span>
                </>
            ) : (
                <span className={cn(textClassName)}>{displayValue.full}</span>
            )}
        </div>
    )
}
