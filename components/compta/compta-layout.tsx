"use client";

import React from "react";
import { Link as I18nLink, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useComptaStore } from "@/store/comptaStore";
import { LayoutDashboard, Receipt, Settings, Menu, PlusCircle, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export function ComptaLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { fetchOperations } = useComptaStore();

    React.useEffect(() => {
        fetchOperations();
    }, [fetchOperations]);

    const navItems = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/operations", label: "Opérations", icon: Receipt },
        { href: "/settings", label: "Paramètres", icon: Settings },
    ];

    const isWizard = pathname?.includes("/operations/new") || pathname?.includes("/edit");

    const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
        <nav className={cn("flex flex-col gap-2", mobile ? "p-4" : "")}>
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <I18nLink key={item.href} href={item.href as any}>
                        <Button
                            variant={isActive ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start gap-3 h-11 text-base transition-all",
                                isActive
                                    ? "bg-blue-600/10 text-blue-600 font-semibold hover:bg-blue-600/15"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                            )}
                        >
                            <Icon size={20} />
                            {item.label}
                        </Button>
                    </I18nLink>
                );
            })}
        </nav>
    );

    const ProfileSection = ({ mobile = false }: { mobile?: boolean }) => (
        <div className={cn("flex items-center gap-3", mobile ? "p-6 border-t dark:border-white/10" : "px-3 py-4")}>
            <Avatar className="h-9 w-9 border-2 border-white dark:border-slate-800 shadow-sm">
                <AvatarImage src="/avatar-free.png" alt="Profile" />
                <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden text-left">
                <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">Marco Gori</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Administrateur</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 border-r bg-white dark:bg-slate-900 z-50">
                <div className="p-6">
                    <I18nLink href="/dashboard" className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            FL<span className="text-blue-600">UX</span>.
                        </span>
                    </I18nLink>
                </div>

                <div className="flex-1 px-4 py-2">
                    <NavContent />
                </div>

                <div className="p-4 flex flex-col gap-4">
                    <Separator className="dark:bg-white/10" />
                    <ProfileSection />
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-40 w-full border-b bg-white dark:bg-slate-900">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-400">
                                    <Menu size={24} />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] bg-white dark:bg-slate-900 border-r dark:border-white/10 p-0 flex flex-col">
                                <SheetHeader className="p-6 border-b dark:border-white/10">
                                    <SheetTitle className="text-left flex items-center gap-2">
                                        <span className="text-xl font-bold text-slate-900 dark:text-white">FL<span className="text-blue-600">UX</span>.</span>
                                    </SheetTitle>
                                </SheetHeader>
                                <div className="flex-1">
                                    <NavContent mobile />
                                </div>
                                <ProfileSection mobile />
                            </SheetContent>
                        </Sheet>
                        <I18nLink href="/dashboard" className="flex items-center">
                            <span className="text-xl font-bold text-slate-900 dark:text-white">FL<span className="text-blue-600">UX</span>.</span>
                        </I18nLink>
                    </div>
                </div>
            </header>

            <main id="compta-main-content" className="flex-1 md:pl-64 relative min-h-screen">
                <div className="container mx-auto px-4 py-4 sm:px-8">
                    {children}
                </div>
            </main>

            {/* Mobile Floating Action Button - Liquid Glass Style */}
            <I18nLink href={isWizard ? "/operations" : "/operations/new"} className="md:hidden fixed bottom-6 right-6 z-50">
                <button className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-xl border shadow-lg transition-all active:scale-90",
                    isWizard
                        ? "bg-slate-900/10 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-900 dark:text-white"
                        : "bg-blue-600/20 border-blue-400/30 text-blue-600 shadow-blue-600/20 hover:bg-blue-600/30"
                )}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isWizard ? "close" : "add"}
                            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                            {isWizard ? <X size={24} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
                        </motion.div>
                    </AnimatePresence>
                </button>
            </I18nLink>
        </div>
    );
}
