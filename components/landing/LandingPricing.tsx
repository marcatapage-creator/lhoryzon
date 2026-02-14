"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export const LandingPricing = () => {
    return (
        <section id="offers" className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
                        Investissez dans votre <span className="text-blue-600">tranquillité</span>.
                    </h2>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 font-medium">
                        Moins cher qu&apos;un agio. Plus rentable qu&apos;un mauvais choix.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {/* ESSENTIEL */}
                    <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow relative flex flex-col">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wide">Essentiel</h3>
                            <p className="text-zinc-500 h-10">Pour ceux qui veulent juste y voir clair.</p>
                        </div>
                        <div className="mb-8">
                            <span className="text-4xl font-bold text-zinc-900 dark:text-white">0€</span>
                            <span className="text-zinc-500 ml-2">/ mois</span>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                <span>Centralisation des revenus</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                <span>Catégorisation automatique</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                <span>Vision &quot;Brut&quot; temps réel</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-400">
                                <X className="w-5 h-5 shrink-0 mt-0.5" />
                                <span>Pas de calcul du Net</span>
                            </li>
                        </ul>

                        <Link href="/onboarding?plan=essentiel" className="mt-auto">
                            <Button variant="outline" className="w-full rounded-full h-12 text-base border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                Démarrer gratuitement
                            </Button>
                        </Link>
                    </div>

                    {/* LUCIDITÉ (Populaire) */}
                    <div className="p-8 rounded-3xl bg-zinc-900 dark:bg-zinc-800 border border-transparent shadow-xl relative overflow-hidden flex flex-col transform md:-translate-y-4">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                            Recommandé
                        </div>
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Lucidité</h3>
                            <p className="text-zinc-400 h-10">Pour ceux qui ne veulent plus dépenser l&apos;argent de l&apos;État.</p>
                        </div>
                        <div className="mb-8">
                            <span className="text-4xl font-bold text-white">12€</span>
                            <span className="text-zinc-500 ml-2">/ mois</span>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start gap-3 text-white font-medium">
                                <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <span>Calcul du &quot;Vrai Disponible&quot;</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-300">
                                <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <span>Provision auto. TVA & URSSAF</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-300">
                                <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <span>Détection anomalies trésorerie</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-300">
                                <Check className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <span>Alertes de seuils (TVA)</span>
                            </li>
                        </ul>

                        <Link href="/onboarding?plan=lucidite" className="mt-auto">
                            <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-base shadow-lg shadow-blue-900/20">
                                Je veux ma sérénité
                            </Button>
                        </Link>
                    </div>

                    {/* VISION */}
                    <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow relative flex flex-col">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 uppercase tracking-wide">Vision</h3>
                            <p className="text-zinc-500 h-10">Pour ceux qui préparent déjà l&apos;année prochaine.</p>
                        </div>
                        <div className="mb-8">
                            <span className="text-4xl font-bold text-zinc-900 dark:text-white">29€</span>
                            <span className="text-zinc-500 ml-2">/ mois</span>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                <span>Tout Lucidité +</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                <span>Projection trésorerie 12 mois</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                <span>Simulateur investissement</span>
                            </li>
                            <li className="flex items-start gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0 mt-0.5" />
                                <span>Scénarios &quot;Optimiste / Pessimiste&quot;</span>
                            </li>
                        </ul>

                        <Link href="/onboarding?plan=vision" className="mt-auto">
                            <Button variant="outline" className="w-full rounded-full h-12 text-base border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                Je pilote mon avenir
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};
