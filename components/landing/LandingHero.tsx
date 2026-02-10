"use client";

import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";

export const LandingHero = () => {
    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-20">
            {/* Abstract Background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-3xl opacity-50 animate-pulse delay-1000 duration-[10000ms]" />
            </div>

            <div className="container mx-auto px-4 flex flex-col items-center text-center gap-8 relative z-10">
                {/* Pill Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-medium tracking-wide uppercase animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <TrendingUp className="w-3 h-3" />
                    <span>Pilotez votre trésorerie réelle</span>
                </div>

                {/* Main Headline */}
                <h1 className="max-w-4xl text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
                    Ne subissez plus <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        votre argent.
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="max-w-2xl text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    Sachez exactement ce que vous gagnez. Anticipez la TVA et les charges.
                    <br className="hidden md:block" />
                    Sans jargon comptable. Sans surprises.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    <Link href="/onboarding">
                        <Button size="lg" className="rounded-full h-14 px-8 bg-blue-600 hover:bg-blue-700 text-white text-base shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 transition-all hover:scale-105">
                            Je commence maintenant
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </Link>
                    <Link href="/pricing">
                        <Button size="lg" variant="ghost" className="rounded-full h-14 px-8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10">
                            Voir les offres
                        </Button>
                    </Link>
                </div>

                {/* Abstract Visual / Dashboard Preview Placeholder */}
                <div className="mt-16 relative w-full max-w-5xl aspect-[16/9] rounded-2xl border border-zinc-200/60 dark:border-white/10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-2xl shadow-blue-900/5 overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500 group">
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-400 font-medium">
                        {/* Placeholder for actual dashboard screenshot */}
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 opacity-20" />
                            <span>Interface de pilotage</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
