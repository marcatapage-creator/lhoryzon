"use client";

import { Link } from "@/i18n/routing";

export const LandingFooter = () => {
    return (
        <footer className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-white/10 py-12">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                    <div className="flex items-center text-xl font-bold tracking-tighter">
                        <span className="text-zinc-900 dark:text-white">LORYZ</span>
                        <span className="text-blue-600">ON</span>
                        <span className="text-zinc-900 dark:text-white">.</span>
                    </div>
                    <span className="text-sm text-zinc-500 ml-4">
                        © {new Date().getFullYear()} Loryzon. Tous droits réservés.
                    </span>
                </div>

                <div className="flex items-center gap-6">
                    <Link href="/legal/terms" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        CGU
                    </Link>
                    <Link href="/legal/privacy" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        Politique de confidentialité
                    </Link>
                    <Link href="/legal/mentions" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        Mentions légales
                    </Link>
                </div>
            </div>
        </footer>
    );
};
