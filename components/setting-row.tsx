import React from "react"
import { cn } from "@/lib/utils"

interface SettingRowProps {
    title: string
    description?: string
    children: React.ReactNode
    icon?: React.ReactNode
    className?: string
}

export function SettingRow({
    title,
    description,
    children,
    icon,
    className
}: SettingRowProps) {
    return (
        <div className={cn("flex flex-row items-start justify-between gap-4 py-4 first:pt-0 last:pb-0 border-b last:border-0 border-muted/50", className)}>
            <div className="flex items-start gap-4">
                {icon && (
                    <div className="bg-primary/10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        {icon}
                    </div>
                )}
                <div className="space-y-1">
                    <h4 className="text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {title}
                    </h4>
                    {description && (
                        <p className="text-xs text-muted-foreground font-medium pr-4">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            <div className="flex items-center shrink-0">
                {children}
            </div>
        </div>
    )
}
