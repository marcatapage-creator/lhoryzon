"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["Anticiper", "Prévoir", "Profiter"];

export const LandingHero = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prevIndex) => (prevIndex + 1) % WORDS.length);
        }, 3000); // Change word every 3 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Prevent browser scroll restoration to avoid "creeping" scroll on reload
        if (typeof window !== 'undefined') {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    return (
        <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-32 md:pt-48">
            {/* Abstract Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl opacity-50 animate-pulse delay-1000 duration-[10000ms]" />
            </div>

            <div className="container mx-auto px-4 flex flex-col items-center text-center gap-8 relative z-10">
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-medium tracking-wide uppercase animate-in fade-in zoom-in-95 duration-700">
                    <TrendingUp className="w-3 h-3" />
                    <span>Pilotez votre trésorerie réelle</span>
                </div>

                {/* Main Headline */}
                <h1 className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white pb-2 flex flex-col items-center justify-center">
                    <span className="relative inline-flex h-[1.3em] md:h-auto overflow-hidden md:overflow-visible items-center justify-center w-full">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={WORDS[index]}
                                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="inline-block text-center"
                            >
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 inline-block">
                                    {WORDS[index]}
                                </span>
                                <span className="text-zinc-900 dark:text-white inline-block">.</span>
                            </motion.span>
                        </AnimatePresence>
                    </span>
                    <span className="text-zinc-900 dark:text-white mt-[-0.2em] md:mt-2">
                        Sereinement.
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="max-w-2xl text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed animate-in fade-in zoom-in-95 duration-1000 delay-200">
                    Sachez exactement ce que vous gagnez. Anticipez la TVA et les charges.{" "}
                    <br className="hidden md:block" />
                    Sans jargon comptable. Sans surprises.
                </p>

                {/* CTAs */}
                <div className="flex flex-col items-center gap-4 mt-4 animate-in fade-in zoom-in-95 duration-1000 delay-300">
                    <Link href="/onboarding">
                        <Button size="lg" className="rounded-full h-14 !pl-10 !pr-8 bg-blue-600 hover:bg-blue-700 text-white text-base shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:scale-105" suppressHydrationWarning>
                            Je commence maintenant
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                    <Link href="/#offers">
                        <Button size="lg" variant="ghost" className="rounded-full h-14 px-8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10">
                            Voir les offres
                        </Button>
                    </Link>
                </div>


            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer">
                <Link href="/#how-it-works">
                    <ChevronDown className="w-6 h-6 text-zinc-400 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors" />
                </Link>
            </div>

        </section>
    );
};
