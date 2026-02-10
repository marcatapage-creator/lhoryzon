"use client";

import { AlertTriangle, TrendingDown, Clock } from "lucide-react";

export const LandingProblem = () => {
    return (
        <section className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-6">
                        Le problème avec votre banque,<br />
                        <span className="text-zinc-400">c'est qu'elle vous ment.</span>
                    </h2>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Votre solde bancaire ne vous dit pas ce que vous pouvez dépenser.
                        Il oublie la TVA à rendre, l'Urssaf qui tombe le 20, et l'impôt sur les sociétés.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Problem 1 - TVA */}
                    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-6 text-orange-600 dark:text-orange-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Le piège de la TVA</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Vous encaissez 1200€ TTC. Vous pensez avoir gagné 1200€.
                            Spoiler : 200€ ne sont pas à vous.
                        </p>
                    </div>

                    {/* Problem 2 - Charges */}
                    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-6 text-red-600 dark:text-red-400">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">L'Urssaf surprise</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Le prélèvement tombe toujours au mauvais moment.
                            Sans anticipation, c'est le découvert assuré.
                        </p>
                    </div>

                    {/* Problem 3 - Visibilité */}
                    <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-3">Pilotage à vue</h3>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Vous attendez le bilan de votre comptable en avril pour savoir si vous avez gagné de l'argent l'année dernière. Trop tard.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
