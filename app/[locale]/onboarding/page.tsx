"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/routing";
import { Briefcase, Building2, User, Users, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComptaStore } from "@/store/comptaStore";
import { register } from "@/app/actions/register";

interface StatusOption {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    config: {
        isPro: boolean;
        vat: boolean;
        status: 'micro' | 'ei' | 'url_ir' | 'sas_is';
    };
}

const STATUS_OPTIONS: StatusOption[] = [
    {
        id: "micro",
        title: "Micro-Entrepreneur",
        description: "Simplicité maximale. Charges forfaitaires.",
        icon: User as React.ElementType,
        config: { isPro: true, vat: false, status: 'micro' }
    },
    {
        id: "ei",
        title: "Entreprise Individuelle",
        description: "Charges réelles. Patrimoine séparé.",
        icon: Briefcase as React.ElementType,
        config: { isPro: true, vat: true, status: 'ei' }
    },
    {
        id: "url_ir",
        title: "Société à l'IR (EURL/SARL)",
        description: "Transparence fiscale. Impôt sur le revenu.",
        icon: Users as React.ElementType,
        config: { isPro: true, vat: true, status: 'url_ir' }
    },
    {
        id: "sas_is",
        title: "Société à l'IS (SASU/SAS)",
        description: "Impôt sur les sociétés. Dividendes possibles.",
        icon: Building2 as React.ElementType,
        config: { isPro: true, vat: true, status: 'sas_is' }
    }
];

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState<'register' | 'status'>('register');
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { setFiscalProfile } = useComptaStore();

    // Registration Handler
    async function onRegister(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            const result = await register(undefined, formData);
            if (result) {
                setError(result);
            } else {
                // Success: User created and logged in. Move to status selection.
                setStep('status');
            }
        } catch (e) {
            console.error(e);
            setError("Une erreur est survenue.");
        } finally {
            setIsLoading(false);
        }
    }

    // Status Selection Handler
    const handleSelect = (option: StatusOption) => {
        setSelectedStatus(option.id);
        setIsLoading(true);

        setTimeout(() => {
            setFiscalProfile({
                status: option.config.status,
                vatEnabled: option.config.vat,
                isPro: option.config.isPro
            });
            console.log("Fiscal Profile Saved:", option.config);
            router.push("/dashboard");
        }, 1000);
    };

    if (step === 'register') {
        return (
            <AuthCard
                title="Bienvenue"
                subtitle="Créez votre compte pour commencer."
                footerLink={{
                    text: "Se connecter",
                    href: "/login",
                    label: "Déjà un compte ?",
                }}
            >
                <form action={onRegister} method="POST" className="grid gap-4">
                    <div className="grid gap-2 text-left">
                        <Label htmlFor="name">Nom complet</Label>
                        <Input id="name" name="name" placeholder="Jean Dupont" disabled={isLoading} required />
                    </div>
                    <div className="grid gap-2 text-left">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" placeholder="jean@exemple.com" disabled={isLoading} required />
                    </div>
                    <div className="grid gap-2 text-left">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Input id="password" name="password" type="password" placeholder="••••••••" disabled={isLoading} required minLength={6} />
                    </div>

                    {error && (
                        <div className="text-sm font-medium text-red-500 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Commencer l&apos;aventure
                    </Button>
                </form>
            </AuthCard>
        );
    }

    return (
        <AuthCard
            title="Quel est votre statut ?"
            subtitle="Nous configurerons automatiquement votre fiscalité."
            className="w-full max-w-4xl"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {STATUS_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = selectedStatus === option.id;

                    return (
                        <div
                            key={option.id}
                            onClick={() => !isLoading && handleSelect(option)}
                            className={cn(
                                "flex flex-col items-start p-6 rounded-2xl border text-left transition-all duration-200 group relative overflow-hidden cursor-pointer",
                                isSelected
                                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:-translate-y-0.5",
                                isLoading && !isSelected && "opacity-50 pointer-events-none"
                            )}
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                isSelected ? "bg-blue-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            )}>
                                <Icon className="w-5 h-5" />
                            </div>

                            <h3 className={cn(
                                "font-bold text-lg mb-1 transition-colors",
                                isSelected ? "text-blue-700 dark:text-blue-300" : "text-zinc-900 dark:text-white"
                            )}>
                                {option.title}
                            </h3>
                            <p className={cn(
                                "text-sm",
                                isSelected ? "text-blue-600/80 dark:text-blue-300/70" : "text-zinc-500 dark:text-zinc-400"
                            )}>
                                {option.description}
                            </p>

                            {isSelected && isLoading && (
                                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Configuration...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-zinc-400">
                    Vous pourrez modifier ce choix plus tard dans les paramètres.
                </p>
            </div>
        </AuthCard>
    );
}
