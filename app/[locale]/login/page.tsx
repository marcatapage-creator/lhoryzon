"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/routing";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            const result = await login(formData);
            if (result) {
                setError(result);
            }
        } catch (e) {
            console.error(e);
            setError("Une erreur est survenue.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AuthCard
            title="Content de vous revoir"
            subtitle="Connectez-vous pour accéder à votre trésorerie."
            footerLink={{
                text: "Créer un compte",
                href: "/onboarding",
                label: "Pas encore de compte ?",
            }}
        >
            <div className="grid gap-6">
                <Button variant="outline" className="h-12 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white relative">
                    {/* Google Icon (SVG) */}
                    <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                    </svg>
                    Continuer avec Google
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">Ou par email</span>
                    </div>
                </div>

                <form action={onSubmit}>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                placeholder="name@example.com"
                                type="email"
                                autoCapitalize="none"
                                autoComplete="email"
                                autoCorrect="off"
                                disabled={isLoading}
                                className="h-11 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Link href="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline">
                                    Oublié ?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                type="password"
                                autoComplete="current-password"
                                disabled={isLoading}
                                className="h-11 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-sm font-medium text-red-500 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <Button className="h-11 bg-blue-600 hover:bg-blue-700 text-white w-full mt-2" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Se connecter
                        </Button>
                    </div>
                </form>
            </div>
        </AuthCard>
    );
}
