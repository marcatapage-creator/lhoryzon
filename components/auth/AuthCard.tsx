"use client";

import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";

interface AuthCardProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    footerLink?: {
        text: string;
        href: string;
        label: string;
    };
    className?: string;
}

export const AuthCard = ({ children, title, subtitle, footerLink, className }: AuthCardProps) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
            {/* Abstract Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl opacity-50 animate-pulse delay-1000 duration-[10000ms]" />
            </div>

            <div className={cn(
                "w-full max-w-md bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-8 md:p-10 animate-in fade-in zoom-in-95 duration-500",
                className
            )}>
                <div className="flex flex-col items-center text-center mb-8">
                    <Link href="/" className="flex items-center gap-1 group mb-6">
                        <span className="text-2xl font-bold tracking-tighter text-zinc-900 dark:text-white">
                            FL<span className="text-blue-600 transition-colors group-hover:text-blue-500">UX</span>.
                        </span>
                    </Link>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{title}</h1>
                    {subtitle && <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm">{subtitle}</p>}
                </div>

                {children}

                {footerLink && (
                    <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        {footerLink.label}{" "}
                        <Link href={footerLink.href} className="text-blue-600 hover:text-blue-500 font-medium hover:underline transition-all">
                            {footerLink.text}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};
