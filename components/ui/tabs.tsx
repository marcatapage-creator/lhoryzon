"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

import { motion } from "framer-motion"

const TabsContext = React.createContext<{
  activeValue: string;
  setActiveValue: (v: string) => void;
  layoutId: string;
  variant?: "pill" | "line";
}>({
  activeValue: "",
  setActiveValue: () => { },
  layoutId: "active-tab",
  variant: "pill",
})

function Tabs({
  className,
  value,
  onValueChange,
  defaultValue,
  layoutId,
  variant = "pill",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & {
  layoutId?: string;
  variant?: "pill" | "line";
}) {
  const [activeValue, setActiveValue] = React.useState(value || defaultValue || "")
  const generatedId = React.useId()
  const finalLayoutId = layoutId || `tabs-indicator-${generatedId}`

  React.useEffect(() => {
    if (value !== undefined) {
      setActiveValue(value)
    }
  }, [value])

  const handleValueChange = (v: string) => {
    setActiveValue(v)
    onValueChange?.(v)
  }

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue, layoutId: finalLayoutId, variant }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        value={activeValue}
        onValueChange={handleValueChange}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const { variant } = React.useContext(TabsContext)

  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        variant === "pill"
          ? "bg-muted dark:bg-muted/50 text-muted-foreground inline-flex w-full items-center justify-start rounded-lg p-1 relative border border-black/5 dark:border-white/10 overflow-x-auto no-scrollbar"
          : "inline-flex w-full items-center justify-start relative border-b border-border/50 gap-6 overflow-x-auto no-scrollbar pb-0",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  children,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { activeValue, layoutId, variant } = React.useContext(TabsContext)
  const isActive = activeValue === value

  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // We remove the automatic scrollIntoView on mount/activation as it causes unwanted page jumping
  // and interferes with the user's focus, especially on the dashboard.
  /*
  React.useEffect(() => {
    if (isActive && triggerRef.current) {
      triggerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      })
    }
  }, [isActive])
  */

  return (
    <TabsPrimitive.Trigger
      ref={triggerRef}
      data-slot="tabs-trigger"
      value={value}
      className={cn(
        "relative focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring whitespace-nowrap transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 z-0 isolate flex-shrink-0",
        variant === "pill"
          ? "text-foreground dark:text-muted-foreground inline-flex items-center justify-center gap-1.5 rounded-md border border-transparent px-3 py-2 text-sm font-medium"
          : "pb-3 text-sm font-bold uppercase tracking-wide transition-colors text-muted-foreground hover:text-foreground",
        isActive && (variant === "pill" ? "dark:text-foreground" : "text-primary"),
        className
      )}
      {...props}
    >
      <div className="relative z-10 flex items-center gap-1.5">
        {children}
      </div>
      {isActive && (
        <motion.div
          layoutId={layoutId}
          className={cn(
            variant === "pill"
              ? "absolute inset-0 bg-background dark:bg-black rounded-lg shadow-sm border dark:border-white/10"
              : "absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
          )}
          initial={false}
          transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
          style={{ zIndex: 0 }}
        />
      )}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none data-[state=inactive]:hidden", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
