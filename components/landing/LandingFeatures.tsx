"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export const LandingFeatures = () => {
    return (
        <section className="py-24 overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
                        La clarté financière,<br />
                        <span className="text-blue-600">en 3 étapes simples.</span>
                    </h2>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400">
                        Pas besoin de diplôme en comptabilité. Connectez, catégorisez, décidez.
                    </p>
                </div>

                {/* Step 1 */}
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 mb-24">
                    <div className="w-full md:w-1/2 order-2 md:order-1">
                        <div className="aspect-[4/3] rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 shadow-lg flex items-center justify-center relative overflow-hidden group">
                            {/* Placeholder visual */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
                            <div className="text-zinc-400 font-mono text-sm">Visualisation Connexion Bancaire</div>
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 order-1 md:order-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xl mb-6">1</div>
                        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                            Connectez votre banque
                        </h3>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            Nous récupérons automatiquement vos transactions de manière sécurisée.
                            Compatible avec toutes les banques françaises et néo-banques (Qonto, Shine, Revolut...).
                        </p>
                        <ul className="space-y-3">
                            {['Connexion sécurisée (DSP2)', 'Synchronisation quotidienne', 'Aucune saisie manuelle'].map((item, i) => (
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
                            L'IA catégorise pour vous
                        </h3>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            FLUX reconnaît vos dépenses récurrentes, détecte la TVA et calcule vos cotisations sociales automatiquement.
                        </p>
                        <ul className="space-y-3">
                            {['Auto-détection URSSAF & TVA', 'Apprentissage intelligent', 'Mapping comptable invisible'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="w-full md:w-1/2 order-2">
                        <div className="aspect-[4/3] rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 shadow-lg flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/5 to-transparent" />
                            <div className="text-zinc-400 font-mono text-sm">Animation Catégorisation IA</div>
                        </div>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
                    <div className="w-full md:w-1/2 order-2 md:order-1">
                        <div className="aspect-[4/3] rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 shadow-lg flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-transparent" />
                            <div className="text-zinc-400 font-mono text-sm">Dashboard Trésorerie Nette</div>
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 order-1 md:order-2">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-6">3</div>
                        <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-4">
                            Décidez sereinement
                        </h3>
                        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            Visualisez votre "reste à vivre" réel. Investissez, payez-vous ou épargnez en sachant exactement ce qui est disponible.
                        </p>
                        <ul className="space-y-3">
                            {['Projection de trésorerie', 'Alertes intelligentes', 'Sérénité absolue'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8">
                            <Link href="/onboarding">
                                <Button size="lg" className="rounded-full h-12 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100">
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
