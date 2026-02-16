"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RollingNumber } from "./RollingNumber";
import { LucideIcon, ArrowRight } from "lucide-react";

interface UnifiedKpiCardProps {
    title: string;
    value: number;
    description: string;
    icon?: LucideIcon;
    variant?: "default" | "warning" | "success" | "invest" | "brand";
    className?: string;
    onClick?: () => void;
    unit?: "€" | "%";
    trend?: number; // Optional trend percentage
}

export function UnifiedKpiCard({
    title,
    value,
    description,
    icon: Icon,
    variant = "default",
    className,
    onClick,
    unit = "€",
    trend
}: UnifiedKpiCardProps) {
    const variants = {
        default: "bg-white/80 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10",
        success: "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200/50 dark:border-blue-500/10 hover:border-blue-300/50 dark:hover:border-blue-500/20",
        warning: "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-500/10 hover:border-amber-300/50 dark:hover:border-amber-500/20",
        invest: "bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-500/10 hover:border-violet-300/50 dark:hover:border-violet-500/20",
        brand: "bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-white dark:to-slate-200 dark:text-slate-900 border-transparent shadow-xl"
    };

    const textColors = {
        default: "text-slate-900 dark:text-white",
        success: "text-blue-600 dark:text-blue-400",
        warning: "text-amber-600 dark:text-amber-400",
        invest: "text-violet-600 dark:text-violet-400",
        brand: "text-white dark:text-slate-900"
    };

    const descriptionColors = {
        default: "text-slate-500/80 dark:text-slate-400/80",
        brand: "text-slate-300 dark:text-slate-600",
        success: "text-blue-600/60 dark:text-blue-400/60",
        warning: "text-amber-600/60 dark:text-amber-400/60",
        invest: "text-violet-600/60 dark:text-violet-400/60",
    }

    return (
        <Card
            onClick={onClick}
            className={cn(
                "relative overflow-hidden border shadow-sm dark:shadow-none backdrop-blur-xl transition-all duration-300",
                "group cursor-pointer hover:-translate-y-1 hover:shadow-lg",
                variants[variant],
                className
            )}
        >
            <CardContent className="p-6 flex flex-col h-full justify-between gap-4">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <p className={cn(
                        "text-[10px] uppercase font-bold tracking-[0.2em]",
                        variant === 'brand' ? "opacity-90" : "text-slate-500 dark:text-slate-400"
                    )}>
                        {title}
                    </p>
                    {Icon && (
                        <div className={cn(
                            "p-2 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-sm",
                            variant === 'brand' ? "text-white dark:text-slate-900" : textColors[variant]
                        )}>
                            <Icon size={14} />
                        </div>
                    )}
                </div>

                {/* Value */}
                <div>
                    <div className={cn(
                        "text-3xl md:text-4xl font-bold tracking-tight",
                        variant === 'brand' ? "text-white dark:text-slate-900" : textColors[variant]
                    )}>
                        <RollingNumber value={value} unit={unit} className={variant === 'brand' ? "text-white dark:text-slate-900" : ""} />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-end justify-between mt-auto">
                    <p className={cn(
                        "text-[11px] font-medium leading-relaxed max-w-[85%]",
                        descriptionColors[variant] || descriptionColors.default
                    )}>
                        {description}
                    </p>

                    <div className={cn(
                        "opacity-0 transform translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0",
                        variant === 'brand' ? "text-white dark:text-slate-900" : "text-slate-400"
                    )}>
                        <ArrowRight size={16} />
                    </div>
                </div>

            </CardContent>

            {/* Background Glow for specific variants */}
            {variant !== 'default' && variant !== 'brand' && (
                <div className={cn(
                    "absolute -bottom-10 -right-10 w-32 h-32 blur-[60px] opacity-10 rounded-full pointer-events-none",
                    variant === 'success' ? "bg-blue-400" :
                        variant === 'warning' ? "bg-amber-400" :
                            "bg-violet-400"
                )} />
            )}
        </Card>
    );
}
