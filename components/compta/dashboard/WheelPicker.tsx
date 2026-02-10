"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface WheelPickerProps {
    items: { label: string; value: string }[]
    value: string
    onChange: (value: string) => void
    itemHeight?: number
    visibleCount?: number
    disabled?: boolean
    ariaLabel?: string
}

/**
 * A robust, high-performance vertical wheel picker inspired by iOS.
 * Features strict axis locking to prevent horizontal jitter on trackpads/touch.
 */
export function WheelPicker({
    items,
    value,
    onChange,
    itemHeight = 44,
    visibleCount = 5,
    disabled = false,
    ariaLabel,
}: WheelPickerProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [selectedIndex, setSelectedIndex] = React.useState(() =>
        items.findIndex(item => item.value === value)
    )

    // Internal sync: scroll to selection on mount or value change
    React.useEffect(() => {
        if (items.length === 0) return
        const targetIndex = items.findIndex(item => item.value === value)

        // Sync internal state if needed
        if (targetIndex !== -1 && targetIndex !== selectedIndex) {
            setSelectedIndex(targetIndex)
        }

        // Always enforce scroll position on value change or mount
        // This ensures the wheel is visually localized even if state was already correct
        if (scrollRef.current && targetIndex !== -1) {
            const scrollToPosition = targetIndex * itemHeight

            // Immediate scroll
            scrollRef.current.scrollTo({ top: scrollToPosition, behavior: "auto" })

            // Delayed scroll to handle Drawer/Modal open animations
            const timer = setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTo({ top: scrollToPosition, behavior: "auto" })
                }
            }, 100)

            return () => clearTimeout(timer)
        }
    }, [value, items, itemHeight, selectedIndex])

    // Strict Scroll Handler with rAF for performance
    const isScrolling = React.useRef(false)
    const handleScroll = () => {
        if (!scrollRef.current || isScrolling.current) return

        isScrolling.current = true
        requestAnimationFrame(() => {
            if (!scrollRef.current) {
                isScrolling.current = false
                return
            }

            const scrollTop = scrollRef.current.scrollTop
            const index = Math.round(scrollTop / itemHeight)
            const safeIndex = Math.max(0, Math.min(index, items.length - 1))

            if (safeIndex !== selectedIndex) {
                setSelectedIndex(safeIndex)
                onChange(items[safeIndex].value)
            }
            isScrolling.current = false
        })
    }

    // Direction Lock Logic
    const touchStart = React.useRef({ x: 0, y: 0 })
    const isLocked = React.useRef<"none" | "vertical" | "horizontal">("none")

    const handlePointerDown = (e: React.PointerEvent) => {
        if (disabled) return
        touchStart.current = { x: e.clientX, y: e.clientY }
        isLocked.current = "none"
        // Stop bubbling to prevent Drawer/Sheet drag-down behaviors
        e.stopPropagation()
            ; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (disabled || isLocked.current === "horizontal") return

        const dx = Math.abs(e.clientX - touchStart.current.x)
        const dy = Math.abs(e.clientY - touchStart.current.y)

        // Lock direction if movement is significant enough
        if (isLocked.current === "none") {
            if (dy > dx + 4) {
                isLocked.current = "vertical"
            } else if (dx > dy + 4) {
                isLocked.current = "horizontal"
                return
            }
        }

        // If explicitly locked vertical, we block horizontal drift at JS level
        // though CSS touch-action: pan-y handles most of this.
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (disabled) return
        try {
            // Explicitly release capture to avoid sticking state
            ; (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        } catch {
            // Ignore if already released
        }

        // Tap Detection
        const dx = Math.abs(e.clientX - touchStart.current.x)
        const dy = Math.abs(e.clientY - touchStart.current.y)
        const dist = Math.sqrt(dx * dx + dy * dy)

        // Threshold for tap (10px) to allow minor finger wiggle
        if (dist < 10 && scrollRef.current) {
            const rect = scrollRef.current.getBoundingClientRect()

            // Ensure tap is within the scroll area
            if (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            ) {
                const relativeY = e.clientY - rect.top + scrollRef.current.scrollTop - paddingHeight
                const clickedIndex = Math.floor(relativeY / itemHeight)

                if (clickedIndex >= 0 && clickedIndex < items.length) {
                    handleItemClick(clickedIndex)
                }
            }
        }

        isLocked.current = "none"
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return
        if (e.key === "ArrowUp") {
            e.preventDefault()
            const nextIndex = Math.max(0, selectedIndex - 1)
            onChange(items[nextIndex].value)
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            const nextIndex = Math.min(items.length - 1, selectedIndex + 1)
            onChange(items[nextIndex].value)
        }
    }

    const handleItemClick = (index: number) => {
        if (disabled) return
        if (index === selectedIndex) return

        setSelectedIndex(index)
        onChange(items[index].value)

        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: index * itemHeight,
                behavior: "smooth"
            })
        }
    }

    // Safety check for empty items after hooks
    if (items.length === 0) return null

    const containerHeight = itemHeight * visibleCount
    const paddingHeight = (containerHeight - itemHeight) / 2

    return (
        <div
            className={cn(
                "relative flex-1 flex flex-col items-center group touch-none select-none",
                disabled && "opacity-50 pointer-events-none"
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`wheel-option-${selectedIndex}`}
        >
            {/* Main Wheel Container */}
            <div
                className="relative w-full overflow-hidden rounded-2xl bg-slate-50/5 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5"
                style={{ height: containerHeight }}
            >
                {/* Visual Selection Indicator */}
                <div
                    className="absolute left-0 right-0 pointer-events-none z-10 border-y border-blue-600/20 dark:border-blue-400/20 bg-blue-600/5 dark:bg-blue-400/5"
                    style={{
                        top: paddingHeight,
                        height: itemHeight,
                        // Premium glow
                        boxShadow: "0 0 15px rgba(37,99,235,0.05)"
                    }}
                >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-400 rounded-full my-1 ml-0.5 opacity-40" />
                </div>

                {/* Gradient Masks (Strictly Top/Bottom) */}
                <div
                    className="absolute top-0 left-0 right-0 pointer-events-none z-20 bg-gradient-to-b from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-transparent"
                    style={{ height: paddingHeight }}
                />
                <div
                    className="absolute bottom-0 left-0 right-0 pointer-events-none z-20 bg-gradient-to-t from-white dark:from-slate-900 via-white/80 dark:via-slate-900/80 to-transparent"
                    style={{ height: paddingHeight }}
                />

                {/* Scroller */}
                <div
                    ref={scrollRef}
                    className="h-full overflow-y-auto no-scrollbar snap-y snap-mandatory overscroll-contain transition-[scroll-snap-type]"
                    onScroll={handleScroll}
                    style={{
                        // Lock horizontal scroll at CSS level
                        overflowX: "hidden",
                        paddingTop: paddingHeight,
                        paddingBottom: paddingHeight,
                        // Ensure we don't have subpixel issues
                        contain: "layout paint",
                        WebkitOverflowScrolling: "touch"
                    }}
                >
                    {items.map((item, i) => {
                        const active = i === selectedIndex
                        // Basic 3D effect calculation
                        const distance = Math.abs(i - selectedIndex)
                        const opacity = Math.max(0.3, 1 - (distance * 0.25))
                        const scale = active ? 1.05 : 0.9
                        const rotateX = (i - selectedIndex) * -15 // Degrees

                        return (
                            <div
                                key={`${item.value}-${i}`}
                                id={`wheel-option-${i}`}
                                role="option"
                                aria-selected={active}
                                className={cn(
                                    "flex items-center justify-center snap-center px-4 transition-all duration-200 outline-none cursor-pointer",
                                    active ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-400 dark:text-slate-500 font-medium"
                                )}
                                style={{
                                    height: itemHeight,
                                    opacity,
                                    transform: `perspective(500px) rotateX(${rotateX}deg) scale(${scale})`,
                                    // Optimization
                                    willChange: "transform, opacity"
                                }}
                            >
                                <span className="truncate text-base tracking-tight">{item.label}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
