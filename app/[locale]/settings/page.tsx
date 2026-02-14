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
import { Badge } from "@/components/ui/badge";
import { Wallet, Landmark, Briefcase, FileText } from "lucide-react";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const {
        dashboardSettings,
        setDashboardSettings,
        notificationSettings,
        setNotificationSettings,
        fiscalProfile
    } = useComptaStore();
    const [activeTab, setActiveTab] = React.useState("account");
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const kpiList = [
        // Trésorerie
        { id: "netPocket", label: "Disponible Réel (Net)", category: "Trésorerie" },
        { id: "qontoBalance", label: "Solde Qonto", category: "Trésorerie" },
        { id: "projectedTreasury", label: "Trésorerie Finale", category: "Trésorerie" },
        { id: "realTreasuryOutflow", label: "Sorties Réelles", category: "Trésorerie" },

        // Performance
        { id: "nextDeadline", label: "Prochaine Échéance", category: "Performance" },
        { id: "totalProvision", label: "Provision Totale (TVA/Charges)", category: "Performance" },
        { id: "breakEvenPoint", label: "Seuil de Rentabilité", category: "Performance" },
        { id: "savingsRate", label: "Taux d'Épargne", category: "Performance" },

        // Patrimoine
        { id: "btcTotal", label: "Invest. BTC", category: "Patrimoine" },
        { id: "perTotal", label: "Invest. PER", category: "Patrimoine" },
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
                <Tabs value={activeTab} onValueChange={setActiveTab} variant="line" className="space-y-0">
                    <div className="sticky top-16 md:top-0 z-30 -mt-8 mb-8 pt-8 pb-0 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 -mx-4 px-4 sm:-mx-6 sm:px-6">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Paramètres</h1>
                            <p className="hidden sm:block text-sm sm:text-base text-slate-500 dark:text-slate-400">Personnalisez votre expérience LORYZON.</p>
                        </div>
                        <TabsList className="bg-transparent border-none w-full justify-start px-0 gap-8 h-auto pb-0">
                            <TabsTrigger value="account" className="data-[state=active]:text-blue-600">
                                Compte
                            </TabsTrigger>
                            <TabsTrigger value="preferences" className="data-[state=active]:text-blue-600">
                                Préférences
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="data-[state=active]:text-blue-600">
                                Notifications
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="pt-8 px-1"> {/* Real content start */}

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

                            <Card className="border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                        <Briefcase size={18} className="text-blue-600" />
                                        Profil Fiscal
                                    </CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">Informations sur votre régime fiscal actuel.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-600/10 text-blue-600">
                                                <Landmark size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Régime Actuel</span>
                                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {fiscalProfile?.status === 'micro' ? 'Micro-BNC / Micro-Entreprise' :
                                                        fiscalProfile?.status === 'ei' ? 'Entreprise Individuelle (BNC)' :
                                                            fiscalProfile?.status === 'url_ir' ? 'EURL / SARL à l\'IR' :
                                                                fiscalProfile?.status === 'sas_is' ? 'SASU / SAS à l\'IS' : 'Non défini'}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="bg-blue-600/10 text-blue-600 border-none px-3">Actif</Badge>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/20">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <FileText size={14} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Assujetti TVA</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{fiscalProfile?.vatEnabled ? 'Oui' : 'Non'}</span>
                                        </div>
                                        <div className="p-3 rounded-xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/20">
                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                <Briefcase size={14} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">Activté Pro</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{fiscalProfile?.isPro ? 'Artiste-Auteur / Libéral' : 'Autre'}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="border-t border-slate-200/60 dark:border-white/5 pt-4 bg-blue-50/10 dark:bg-blue-900/10">
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        Le régime fiscal influence les calculs de cotisations et d'impôts sur votre dashboard.
                                    </p>
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
                                                    Cette action est irréversible. Elle supprimera définitivement votre compte LORYZON. et toutes les données associées de nos serveurs.
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
                                    <CardDescription className="text-xs sm:text-sm">Gérez la façon dont vous recevez les alertes de LORYZON.</CardDescription>
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
                                            { id: "news", label: "Nouveautés LORYZON.", desc: "Restez informé des améliorations.", icon: LayoutDashboard, iconColor: "text-blue-500" },
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
                    </div>
                </Tabs>
            </div>
        </ComptaLayout>
    );
}
