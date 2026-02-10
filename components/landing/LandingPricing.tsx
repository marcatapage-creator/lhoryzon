"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export const LandingPricing = () => {
    return (
        <section className="py-24 bg-zinc-50 dark:bg-zinc-900/50">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6">
                        Combien coûte la <span className="text-blue-600">tranquillité</span> ?
                    </h2>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Des outils pensés pour votre stade de développement.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Solo Plan */}
                    <div className="p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-lg transition-shadow relative">
                        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Solo</h3>
                        <p className="text-zinc-500 mb-6">Pour démarrer sereinement.</p>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-zinc-900 dark:text-white">Gratuit</span>
                            <span className="text-zinc-500 ml-2">/ mois</span>
                        </div>
                        <Link href="/onboarding?plan=solo">
                            <Button className="w-full rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 h-12 text-base">
                                Commencer
                            </Button>
                        </Link>
                        <ul className="mt-8 space-y-4">
                            <li className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" />
                                Connexion 1 compte bancaire
                            </li>
                            <li className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" />
                                Catégorisation automatique
                            </li>
                            <li className="flex items-center gap-3 text-zinc-600 dark:text-zinc-300">
                                <Check className="w-5 h-5 text-zinc-900 dark:text-white shrink-0" />
                                Dashboard Trésorerie simple
                            </li>
                            <li className="flex items-center gap-3 text-zinc-400">
                                <X className="w-5 h-5 shrink-0" />
                                Pas de gestion TVA
                            </li>
                        </ul>
                    </div>

                    {/* Pro Plan */}
                    <div className="p-8 rounded-3xl bg-zinc-900 dark:bg-white border border-transparent shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                            Populaire
                        </div>
                        <h3 className="text-2xl font-bold text-white dark:text-zinc-900 mb-2">Pro</h3>
                        <p className="text-zinc-400 dark:text-zinc-600 mb-6">Pour piloter votre croissance.</p>
                        <div className="mb-6">
                            <span className="text-4xl font-bold text-white dark:text-zinc-900">19€</span>
                            <span className="text-zinc-500 dark:text-zinc-400 ml-2">/ mois</span>
                        </div>
                        <Link href="/onboarding?plan=pro">
                            <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-500 text-white h-12 text-base shadow-lg shadow-blue-900/20">
                                Choisir Pro
                            </Button>
                        </Link>
                        <ul className="mt-8 space-y-4">
                            <li className="flex items-center gap-3 text-zinc-300 dark:text-zinc-700">
                                <Check className="w-5 h-5 text-blue-400 dark:text-blue-600 shrink-0" />
                                Comptes bancaires illimités
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300 dark:text-zinc-700">
                                <Check className="w-5 h-5 text-blue-400 dark:text-blue-600 shrink-0" />
                                <strong>Calcul automatique TVA</strong> & Charges
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300 dark:text-zinc-700">
                                <Check className="w-5 h-5 text-blue-400 dark:text-blue-600 shrink-0" />
                                Projection de trésorerie
                            </li>
                            <li className="flex items-center gap-3 text-zinc-300 dark:text-zinc-700">
                                <Check className="w-5 h-5 text-blue-400 dark:text-blue-600 shrink-0" />
                                Export Comptable
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};
