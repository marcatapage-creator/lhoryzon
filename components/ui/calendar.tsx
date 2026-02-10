"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

import { fr } from "date-fns/locale"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <div className="relative">
            <DayPicker
                locale={fr}
                showOutsideDays={showOutsideDays}
                className={cn("p-3", className)}
                classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4 relative",
                    caption: "flex justify-start pt-1 relative items-center",
                    caption_label: "text-sm font-medium !ml-2",
                    nav: "flex items-center gap-3 absolute right-4 top-[18px] z-10",
                    nav_button: cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-7 w-7 p-0 opacity-40 hover:opacity-100 transition-opacity"
                    ),
                    nav_button_previous: "",
                    nav_button_next: "",
                    month_grid: "w-full border-collapse space-y-1",
                    weekdays: "flex",
                    weekday:
                        "text-muted-foreground rounded-[4px] w-9 font-normal text-[0.8rem]",
                    week: "flex w-full mt-2",
                    day: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day_button: cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-9 w-9 p-0 font-normal aria-selected:opacity-100 !rounded-[4px]"
                    ),
                    range_start: "day-range-start",
                    range_end: "day-range-end",
                    selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground !rounded-[4px]",
                    today: "bg-accent text-accent-foreground",
                    outside:
                        "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                    disabled: "text-muted-foreground opacity-50",
                    range_middle:
                        "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    hidden: "invisible",
                    ...classNames,
                }}
                components={{
                    Chevron: ({ orientation }) => {
                        const Icon = orientation === "left" ? ChevronLeft : ChevronRight
                        return <Icon className="h-4 w-4" />
                    },
                }}
                {...props}
            />
        </div>
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
