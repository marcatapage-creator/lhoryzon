"use client";
// Force reload

import React from "react";
import { ComptaLayout } from "@/components/compta/compta-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useComptaStore } from "@/store/comptaStore";
import { useTheme } from "next-themes";
import {
    User,
    Settings2,
    Bell,
    Moon,
    Sun,
    Laptop,
    Lock,
    Trash2,
    ShieldAlert,
    LayoutDashboard,
    Mail,
    AlertTriangle,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { dashboardSettings, setDashboardSettings, notificationSettings, setNotificationSettings } = useComptaStore();
    const [activeTab, setActiveTab] = React.useState("preferences");
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const kpiList = [
        { id: "Trésorerie Qonto", label: "Trésorerie Qonto", category: "Trésorerie" },
        { id: "Trésorerie / Mois", label: "Trésorerie / Mois (ou An/Totale)", category: "Trésorerie" },
        { id: "Trésorerie Finale", label: "Trésorerie Finale", category: "Trésorerie" },
        { id: "Sorties Réelles", label: "Sorties Réelles", category: "Trésorerie" },
        { id: "Surplus Réel (HT)", label: "Surplus Réel (HT)", category: "Performance" },
        { id: "Estimation TVA", label: "Estimation TVA", category: "Performance" },
        { id: "Engagé BTC", label: "Engagé BTC", category: "Patrimoine" },
        { id: "Engagé PER", label: "Engagé PER", category: "Patrimoine" },
    ];

    const toggleKpi = (id: string) => {
        const isVisible = dashboardSettings.visibleKpis.includes(id);
        const nextKpis = isVisible
            ? dashboardSettings.visibleKpis.filter(k => k !== id)
            : [...dashboardSettings.visibleKpis, id];

        setDashboardSettings({ visibleKpis: nextKpis });
        toast.success(isVisible ? `${id} masqué` : `${id} visible`);
    };

    const updateNotification = (key: keyof typeof notificationSettings, value: boolean) => {
        setNotificationSettings({ ...notificationSettings, [key]: value });
        toast.success("Préférence mise à jour");
    };

    return (
        <ComptaLayout>
            <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
                <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-4 sm:mb-8 pt-8 pb-4 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-transparent transition-all duration-200 -mx-4 px-4 sm:-mx-6 sm:px-6">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Paramètres</h1>
                    <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Personnalisez votre expérience FLUX.</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 h-10 sm:h-12 p-1 bg-slate-200/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-200/60 dark:border-white/10 overflow-hidden">
                        <TabsTrigger value="account" className="flex items-center gap-2 text-xs sm:text-sm font-semibold h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                            <User size={14} className="sm:w-4 sm:h-4" />
                            <span>Compte</span>
                        </TabsTrigger>
                        <TabsTrigger value="preferences" className="flex items-center gap-2 text-xs sm:text-sm font-semibold h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                            <Settings2 size={14} className="sm:w-4 sm:h-4" />
                            <span>Pref.</span>
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="flex items-center gap-2 text-xs sm:text-sm font-semibold h-full data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm">
                            <Bell size={14} className="sm:w-4 sm:h-4" />
                            <span>Notifs</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="account" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <Lock size={18} className="text-blue-600" />
                                    Sécurité
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Modifiez votre mot de passe pour sécuriser votre compte.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="current" className="text-xs sm:text-sm">Mot de passe actuel</Label>
                                    <Input id="current" type="password" placeholder="••••••••" className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 h-10 sm:h-11 text-sm" />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="new" className="text-xs sm:text-sm">Nouveau mot de passe</Label>
                                    <Input id="new" type="password" placeholder="••••••••" className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 h-10 sm:h-11 text-sm" />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="confirm" className="text-xs sm:text-sm">Confirmer le nouveau mot de passe</Label>
                                    <Input id="confirm" type="password" placeholder="••••••••" className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 h-10 sm:h-11 text-sm" />
                                </div>
                            </CardContent>
                            <CardFooter className="border-t border-slate-200/60 dark:border-white/5 pt-4 sm:pt-6 bg-slate-50/30 dark:bg-slate-900/20">
                                <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">Mettre à jour le mot de passe</Button>
                            </CardFooter>
                        </Card>

                        <Card className="border-red-200/60 dark:border-red-900/20 shadow-sm bg-red-50/30 dark:bg-red-950/10 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 text-lg sm:text-xl">
                                    <ShieldAlert size={18} />
                                    Zone de Danger
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm text-red-600/70 dark:text-red-400/70">Actions irréversibles concernant votre compte.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6">
                                    La suppression de votre compte entraînera la perte définitive de toutes vos données financières et configurations.
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="flex items-center gap-2 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                                            <Trash2 size={16} />
                                            Supprimer définitivement mon compte
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Cette action est irréversible. Elle supprimera définitivement votre compte FLUX. et toutes les données associées de nos serveurs.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction className="bg-red-600 hover:bg-red-700">Supprimer</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="preferences" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <Moon size={18} className="text-blue-600" />
                                    Apparence
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Choisissez le mode d&apos;affichage de l&apos;application.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                    {[
                                        { id: "light", label: "Clair", icon: Sun },
                                        { id: "dark", label: "Sombre", icon: Moon },
                                        { id: "system", label: "Système", icon: Laptop },
                                    ].map((m) => {
                                        const Icon = m.icon;
                                        const isActive = mounted && theme === m.id;
                                        return (
                                            <button
                                                key={m.id}
                                                onClick={() => setTheme(m.id)}
                                                className={cn(
                                                    "flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all group",
                                                    isActive
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20"
                                                        : "bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500/50"
                                                )}
                                            >
                                                <Icon size={20} className={cn("sm:w-6 sm:h-6", isActive ? "text-white" : "text-slate-400 group-hover:text-blue-500")} />
                                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{m.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <LayoutDashboard size={18} className="text-blue-600" />
                                    Dashboard
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Indicateurs (KPIs) à afficher sur votre tableau de bord.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {["Trésorerie", "Performance", "Patrimoine"].map((cat) => (
                                    <div key={cat} className="space-y-3">
                                        <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">{cat}</h4>
                                        <div className="space-y-2">
                                            {kpiList.filter(k => k.category === cat).map((kpi) => (
                                                <div key={kpi.id} className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/60 dark:border-white/5 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-900/30">
                                                    <Label htmlFor={kpi.id} className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pr-4">{kpi.label}</Label>
                                                    <Switch
                                                        id={kpi.id}
                                                        checked={mounted && dashboardSettings.visibleKpis.includes(kpi.id)}
                                                        onCheckedChange={() => toggleKpi(kpi.id)}
                                                        className="data-[state=checked]:bg-blue-600 scale-90 sm:scale-100"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="notifications" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <Mail size={18} className="text-blue-600" />
                                    Notifications par email
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">Gérez la façon dont vous recevez les alertes de FLUX.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm sm:text-base font-bold">Activer les emails</Label>
                                        <p className="text-[10px] sm:text-xs text-blue-100 font-medium opacity-80 pr-2">Recevez des mises à jour et alertes.</p>
                                    </div>
                                    <Switch
                                        className="bg-white/20 data-[state=checked]:bg-white [&>span]:data-[state=checked]:bg-blue-600 scale-90 sm:scale-100"
                                        checked={mounted && notificationSettings.emailEnabled}
                                        onCheckedChange={(val) => updateNotification("emailEnabled", val)}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Types de notifications</h4>
                                    {[
                                        { id: "negativeProjection", label: "Projection mensuelle négative", desc: "Alerte si vos dépenses dépassent vos revenus.", icon: AlertTriangle, iconColor: "text-amber-500" },
                                        { id: "entryReminders", label: "Rappels de saisie", desc: "Si vous n'avez pas mis à jour vos données récemment.", icon: Check, iconColor: "text-emerald-500" },
                                        { id: "news", label: "Nouveautés FLUX.", desc: "Restez informé des améliorations.", icon: LayoutDashboard, iconColor: "text-blue-500" },
                                    ].map((n) => {
                                        const Icon = n.icon;
                                        return (
                                            <div key={n.id} className="flex items-start justify-between p-3 sm:p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/60 dark:border-white/5 transition-colors">
                                                <div className="flex gap-3 sm:gap-4 overflow-hidden">
                                                    <div className={cn("hidden sm:block mt-1 p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-white/5 shrink-0", n.iconColor)}>
                                                        <Icon size={16} />
                                                    </div>
                                                    <div className="space-y-0.5 sm:space-y-1">
                                                        <Label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">{n.label}</Label>
                                                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{n.desc}</p>
                                                    </div>
                                                </div>
                                                <Switch
                                                    className="data-[state=checked]:bg-blue-600 mt-1 scale-90 sm:scale-100 shrink-0"
                                                    checked={mounted && notificationSettings[n.id as keyof typeof notificationSettings]}
                                                    onCheckedChange={(val) => updateNotification(n.id as keyof typeof notificationSettings, val)}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </ComptaLayout>
    );
}
