"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { LandingVisualFrame, LandingVisualStep1, LandingVisualStep2, LandingVisualStep3 } from "@/components/landing/LandingVisuals";

export const LandingFeatures = () => {
    return (
        <section id="how-it-works" className="py-24 overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
                        Voir clair dans votre trésorerie,<br />
                        <span className="text-blue-600">en 3 étapes.</span>
                    </h2>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Vous encaissez.
                        Nous isolons ce qui n’est pas à vous.
                        Vous décidez avec le bon chiffre.
                    </p>
                </div>

                {/* Step 1 */}
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-24">
                    <div className="w-full md:w-1/2 order-2 md:order-1">
                        <LandingVisualFrame className="h-auto aspect-[4/3] md:h-[400px]">
                            <LandingVisualStep1 />
                        </LandingVisualFrame>
                    </div>
                    <div className="w-full md:w-1/2 order-1 md:order-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xl mb-6">1</div>
                        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                            Déclarez vos encaissements
                        </h3>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            Vous indiquez vos revenus (factures, honoraires, acomptes).
                        </p>
                        <ul className="space-y-3">
                            {['Compatible BNC', 'Gestion TVA incluse', 'Aucun jargon comptable'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-24">
                    <div className="w-full md:w-1/2 order-1">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xl mb-6">2</div>
                        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                            Les charges sont provisionnées automatiquement
                        </h3>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            TVA, cotisations sociales, impôts :
                            Chaque euro est affecté à sa bonne place.
                        </p>
                        <ul className="space-y-3">
                            {['Estimation URSSAF', 'Provision TVA', 'Simulation impôt'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="w-full md:w-1/2 order-2">
                        <LandingVisualFrame className="h-auto aspect-[4/3] md:h-[400px]">
                            <LandingVisualStep2 />
                        </LandingVisualFrame>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
                    <div className="w-full md:w-1/2 order-2 md:order-1">
                        <LandingVisualFrame className="h-auto aspect-[4/3] md:h-[400px]">
                            <LandingVisualStep3 />
                        </LandingVisualFrame>
                    </div>
                    <div className="w-full md:w-1/2 order-1 md:order-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-6">3</div>
                        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                            Visualisez votre vrai disponible
                        </h3>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            Vous voyez immédiatement :
                        </p>
                        <ul className="space-y-3">
                            {['Ce que vous pouvez vous verser', 'Ce que vous pouvez investir', 'Ce qui doit rester en réserve'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mt-6 leading-relaxed">
                            Décidez sans stress. Sans surprise.
                        </p>

                        <div className="mt-8">
                            <Link href="/onboarding">
                                <Button size="lg" className="rounded-full h-12 !pl-10 !pr-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100">
                                    Créer mon compte
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
