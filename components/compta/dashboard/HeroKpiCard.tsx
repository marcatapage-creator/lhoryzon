"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RollingNumber } from "./KpiCards";
import { LucideIcon } from "lucide-react";

interface HeroKpiCardProps {
    title: string;
    value: number;
    description: string;
    icon?: LucideIcon;
    variant?: "default" | "warning" | "success" | "invest";
    className?: string;
    colSpan?: number;
    footer?: React.ReactNode;
    isBold?: boolean;
}

export function HeroKpiCard({
    title,
    value,
    description,
    icon: Icon,
    variant = "default",
    className,
    colSpan = 1,
    footer,
    isBold = false
}: HeroKpiCardProps) {
    const variants = {
        default: "bg-white/80 dark:bg-slate-900/40 border-slate-200 dark:border-white/5",
        success: "bg-blue-50/50 dark:bg-blue-900/20 border-blue-200/50 dark:border-blue-500/10",
        warning: "bg-amber-50/50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-500/10",
        invest: "bg-violet-50/50 dark:bg-violet-900/20 border-violet-200/50 dark:border-violet-500/10",
    };

    const textColors = {
        default: "text-slate-900 dark:text-white",
        success: "text-blue-600 dark:text-blue-400",
        warning: "text-amber-600 dark:text-amber-400",
        invest: "text-violet-600 dark:text-violet-400",
    };

    return (
        <Card className={cn(
            "relative overflow-hidden border shadow-sm dark:shadow-2xl backdrop-blur-xl transition-all duration-500 hover:shadow-md dark:hover:shadow-blue-500/5",
            variants[variant],
            colSpan === 2 ? "md:col-span-2" : "md:col-span-1",
            className
        )}>
            <CardContent className="px-6 py-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon size={12} className={cn("opacity-40", textColors[variant])} />}
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            {title}
                        </p>
                    </div>
                    <div className={cn(
                        "text-4xl md:text-5xl tracking-tight",
                        isBold ? "font-bold" : "font-semibold",
                        textColors[variant]
                    )}>
                        <RollingNumber value={value} />
                    </div>
                </div>

                <div className="mt-1">
                    <p className="text-[11px] font-medium text-slate-500/80 dark:text-slate-400/80 leading-relaxed">
                        {description}
                    </p>
                </div>

                {footer && (
                    <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-white/5">
                        {footer}
                    </div>
                )}
            </CardContent>

            {/* Subtle glow effect */}
            <div className={cn(
                "absolute -bottom-16 -left-16 w-32 h-32 blur-[60px] opacity-10 dark:opacity-20 rounded-full",
                variant === "success" ? "bg-blue-500" : variant === "warning" ? "bg-amber-500" : "bg-blue-500"
            )} />
        </Card>
    );
}
