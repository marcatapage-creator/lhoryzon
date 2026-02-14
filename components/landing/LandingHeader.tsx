"use client";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const LandingHeader = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-transparent",
                scrolled ? "bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-200/50 dark:border-white/10 py-3" : "bg-transparent py-5"
            )}
        >
            <div className="container mx-auto px-4 md:px-8 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-1 group">
                    <div className="flex items-center text-2xl font-bold tracking-tighter">
                        <span className="text-zinc-900 dark:text-white">LORYZ</span>
                        <span className="text-blue-600 transition-colors group-hover:text-blue-500">ON</span>
                        <span className="text-zinc-900 dark:text-white">.</span>
                    </div>
                </Link>

                {/* Navigation */}
                <div className="flex items-center gap-4">
                    <Link href="/login" className="hidden md:block">
                        <Button variant="ghost" className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                            Se connecter
                        </Button>
                    </Link>
                    <Link href="/onboarding">
                        <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
                            Commencer
                        </Button>
                    </Link>
                </div>
            </div>
        </header>
    );
};
