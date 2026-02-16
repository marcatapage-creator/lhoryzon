"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion, animate } from "framer-motion";

export interface RollingNumberProps {
    value: number;
    className?: string;
    showPositiveColor?: boolean;
    unit?: "€" | "%";
}

export function RollingNumber({ value, className, showPositiveColor = false, unit = "€" }: RollingNumberProps) {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
        const controls = animate(displayValue, value, {
            type: "spring",
            stiffness: 60,
            damping: 15,
            onUpdate: (latest) => setDisplayValue(latest),
        });
        return () => controls.stop();
    }, [value]);

    const formatted = unit === "%"
        ? new Intl.NumberFormat("fr-FR", {
            style: "decimal", minimumFractionDigits: 1, maximumFractionDigits: 1,
        }).format(displayValue / 100) + " %"
        : new Intl.NumberFormat("fr-FR", {
            style: "currency", currency: "EUR",
        }).format(displayValue / 100);

    const isNegative = value < 0;

    return (
        <motion.span className={cn("inline-block tabular-nums", isNegative ? "text-red-500" : (showPositiveColor ? "text-blue-500" : ""), className)}>
            {formatted}
        </motion.span>
    );
}
