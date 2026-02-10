import { cn } from "@/lib/utils"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-shimmer rounded-md bg-black/[0.05] dark:bg-white/[0.05] backdrop-blur-[2px]", className)}
            {...props}
        />

    )
}

export { Skeleton }
