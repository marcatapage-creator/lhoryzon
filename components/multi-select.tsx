"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export interface MultiSelectProps {
    options: string[]
    value?: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    max?: number
    className?: string
    getLabel?: (value: string) => string
    searchable?: boolean
}

export function MultiSelect({
    options,
    value = [],
    onChange,
    placeholder = "Select options...",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    max,
    className,
    getLabel = (v) => v,
    searchable = false,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const handleSelect = (optionValue: string) => {
        if (value.includes(optionValue)) {
            onChange(value.filter((v) => v !== optionValue))
        } else {
            if (max && value.length >= max) return
            onChange([...value, optionValue])
        }
    }

    const handleRemove = (optionValue: string) => {
        onChange(value.filter((v) => v !== optionValue))
    }

    return (
        <div className={cn("space-y-3", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal"
                    >
                        <span className="text-muted-foreground">
                            {placeholder}
                            {max && ` (Max ${max})`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                    <Command>
                        {searchable && <CommandInput placeholder={searchPlaceholder} />}
                        <CommandList>
                            <CommandEmpty>{emptyMessage}</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => {
                                    const isSelected = value.includes(option)
                                    const isDisabled = max ? value.length >= max && !isSelected : false
                                    return (
                                        <CommandItem
                                            key={option}
                                            value={option}
                                            onSelect={() => handleSelect(option)}
                                            disabled={isDisabled}
                                            className="cursor-pointer"
                                        >
                                            <div className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "opacity-50 [&_svg]:invisible"
                                            )}>
                                                <Check className={cn("h-4 w-4")} />
                                            </div>
                                            {getLabel(option)}
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Selected Chips Display - Below the selector */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {value.map((val) => {
                        // Deterministic color generation based on string value
                        const colors = [
                            "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25",
                            "bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25",
                            "bg-purple-500/15 text-purple-700 dark:text-purple-300 hover:bg-purple-500/25",
                            "bg-orange-500/15 text-orange-700 dark:text-orange-300 hover:bg-orange-500/25",
                            "bg-pink-500/15 text-pink-700 dark:text-pink-300 hover:bg-pink-500/25",
                            "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25",
                            "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/25",
                            "bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25",
                            "bg-teal-500/15 text-teal-700 dark:text-teal-300 hover:bg-teal-500/25",
                            "bg-violet-500/15 text-violet-700 dark:text-violet-300 hover:bg-violet-500/25",
                        ]

                        let hash = 0
                        for (let i = 0; i < val.length; i++) {
                            hash = val.charCodeAt(i) + ((hash << 5) - hash)
                        }

                        const colorIndex = Math.abs(hash) % colors.length
                        const colorClass = colors[colorIndex]

                        return (
                            <Badge
                                key={val}
                                variant="secondary"
                                className={cn(
                                    "px-2 py-1 gap-1 text-sm font-normal border-0 transition-colors",
                                    colorClass
                                )}
                            >
                                <span className="pl-[2px]">{getLabel(val)}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 ml-1 hover:bg-black/10 dark:hover:bg-white/20 text-current transition-colors rounded-full"
                                    onClick={() => handleRemove(val)}
                                >
                                    <X className="h-3 w-3" />
                                    <span className="sr-only">Remove {getLabel(val)}</span>
                                </Button>
                            </Badge>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
