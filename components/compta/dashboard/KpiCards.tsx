import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Totals } from "@/lib/compta/calculations";
import { cn } from "@/lib/utils";
import {
    PiggyBank,
    Wallet,
    Calendar,
    ShieldCheck,
    Calculator,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Briefcase,
    RefreshCw,
    Landmark,
    ChevronDown
} from "lucide-react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { HeroKpiCard } from "./HeroKpiCard";
import { useComptaStore } from "@/store/comptaStore";
import { getQontoBalanceAction } from "@/app/actions/accounting";
import { PaymentTimelineSheet } from "./PaymentTimelineSheet";
import { SimulationSheet } from "./SimulationSheet";

export interface RollingNumberProps {
    value: number;
    className?: string;
    showPositiveColor?: boolean;
    unit?: "€" | "%";
}

export function RollingNumber({ value, className, showPositiveColor = false, unit = "€" }: RollingNumberProps) {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
        const controls = animate(displayValue, value, {
            type: "spring",
            stiffness: 60,
            damping: 15,
            onUpdate: (latest) => setDisplayValue(latest),
        });
        return () => controls.stop();
    }, [value]);

    const formatted = unit === "%"
        ? new Intl.NumberFormat("fr-FR", {
            style: "decimal", minimumFractionDigits: 1, maximumFractionDigits: 1,
        }).format(displayValue / 100) + " %"
        : new Intl.NumberFormat("fr-FR", {
            style: "currency", currency: "EUR",
        }).format(displayValue / 100);

    const isNegative = value < 0;

    return (
        <motion.span className={cn("inline-block tabular-nums", isNegative ? "text-red-500" : (showPositiveColor ? "text-blue-500" : ""), className)}>
            {formatted}
        </motion.span>
    );
}

interface KpiCardsProps {
    totals: Totals;
    period?: string;
}


export function KpiCards({ totals, period }: KpiCardsProps) {
    const { dashboardSettings } = useComptaStore();
    const [hasMounted, setHasMounted] = useState(false);
    const [qontoBalance, setQontoBalance] = useState<number | null>(null);
    const [isQontoLoading, setIsQontoLoading] = useState(false);
    const [isTimelineOpen, setIsTimelineOpen] = useState(false);
    const [isSimulationOpen, setIsSimulationOpen] = useState(false);
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    const fetchQonto = async () => {
        setIsQontoLoading(true);
        try {
            const result = await getQontoBalanceAction();
            if (result.success && result.balance !== undefined) setQontoBalance(result.balance * 100); // Scale to cents
        } catch (e) { console.error(e); } finally { setIsQontoLoading(false); }
    };

    useEffect(() => {
        setHasMounted(true);
        fetchQonto();
    }, []);

    if (!hasMounted) return null;

    const isAnnual = period === "all" || period === "multi";

    // Level 2 & 3 Data
    const totalProvision_cents = totals.vatNet_cents + totals.socialTotal_cents + totals.taxTotal_cents;

    const isVisible = (id: string) => dashboardSettings.visibleKpis.includes(id);

    // Filter Level 2 cards
    const level2Cards = [
        { id: "qontoBalance", title: "Solde Qonto", value: qontoBalance ?? 0, description: "Argent réel sur votre compte", icon: RefreshCw, isLoading: isQontoLoading, onRefresh: fetchQonto, color: "text-blue-400" },
        { id: "projectedTreasury", title: "Trésorerie Finale", value: totals.projectedTreasury_cents, description: isAnnual ? "Solde final estimé" : "Solde estimé fin de mois", icon: Landmark, color: totals.projectedTreasury_cents >= 0 ? "text-blue-500" : "text-red-500" },
        { id: "totalProvision", title: "Provision Totale", value: totalProvision_cents, description: "Argent sanctuarisé (TVA + Social + Impôts)", icon: ShieldCheck, color: "text-amber-500" },
    ].filter(card => isVisible(card.id));

    // Filter Level 3 cards
    const level3Cards = [
        { id: "incomeTTC", title: "Revenus", value: totals.incomeTTC_cents, icon: ArrowUpRight },
        { id: "realTreasuryOutflow", title: "Sorties", value: totals.realTreasuryOutflow_cents, icon: ArrowDownRight },
        { id: "btcTotal", title: "Invest. BTC", value: totals.btcTotal_cents, icon: TrendingUp, variant: "invest" },
        { id: "perTotal", title: "Invest. PER", value: totals.perTotal_cents, icon: PiggyBank, variant: "invest" },
        { id: "breakEvenPoint", title: "Rentabilité", value: totals.breakEvenPoint_cents, icon: Calculator },
        { id: "savingsRate", title: "Épargne", value: totals.savingsRate_bps, unit: "%", icon: Briefcase }
    ].filter(kpi => isVisible(kpi.id));

    return (
        <div className="space-y-4">
            {/* NIVEAU 1 : STRATÉGIQUE */}
            {(isVisible("netPocket") || isVisible("nextDeadline")) && (
                <section className="grid gap-4 md:grid-cols-3 items-start">
                    {isVisible("netPocket") && (
                        <div className={cn("flex flex-col gap-3", isVisible("nextDeadline") ? "md:col-span-2" : "md:col-span-3")}>
                            <HeroKpiCard
                                title="Disponible Réel (Net)"
                                value={totals.netPocket_cents}
                                description="Ce qu'il vous reste dans la poche"
                                icon={Wallet}
                                variant="success"
                                className="w-full"
                                isBold={true}
                            />
                            <button
                                onClick={() => setIsSimulationOpen(true)}
                                className={cn(
                                    "flex items-center justify-between px-6 py-4 rounded-xl border backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.2em] transition-all w-full",
                                    totals.netPocket_cents > 0
                                        ? "border-blue-200/50 dark:border-blue-500/10 bg-blue-50/20 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100/30 dark:hover:bg-blue-900/20"
                                        : "border-slate-200/50 dark:border-white/10 bg-slate-50/5 dark:bg-white/5 text-slate-400 dark:text-slate-500 hover:bg-slate-100/20 dark:hover:bg-white/10 opacity-80"
                                )}
                            >
                                <span>Faire une simulation d&apos;achat</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                    {isVisible("nextDeadline") && (
                        <div className={cn("flex flex-col gap-3", !isVisible("netPocket") && "md:col-span-3")}>
                            <HeroKpiCard
                                title="Prochaine Échéance"
                                value={totals.vatNet_cents > 0 ? totals.vatNet_cents : (totalProvision_cents > 0 ? totalProvision_cents : 0)}
                                description="Estimation TVA / Charges à venir."
                                icon={Calendar}
                                variant="warning"
                                className="flex-1"
                            />
                            <button
                                onClick={() => setIsTimelineOpen(true)}
                                className="flex items-center justify-between px-6 py-4 rounded-xl border border-amber-200/50 dark:border-amber-500/10 bg-amber-50/20 dark:bg-amber-900/10 backdrop-blur-sm text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-all"
                            >
                                <span>Détails de l&apos;échéancier</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </section>
            )}

            <PaymentTimelineSheet
                isOpen={isTimelineOpen}
                onOpenChange={setIsTimelineOpen}
            />

            <SimulationSheet
                isOpen={isSimulationOpen}
                onOpenChange={setIsSimulationOpen}
            />

            {/* NIVEAU 2 : PILOTAGE TACTIQUE */}
            {level2Cards.length > 0 && (
                <div className={cn(
                    "grid gap-4",
                    level2Cards.length === 1 ? "grid-cols-1" :
                        level2Cards.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"
                )}>
                    {level2Cards.map(card => (
                        <StandardKpiCard key={card.id} title={card.title} value={card.value} description={card.description} icon={card.icon} color={card.color} isLoading={card.isLoading} onRefresh={card.onRefresh} />
                    ))}
                </div>
            )}

            {/* NIVEAU 3 : ANALYSE OPÉRATIONNELLE */}
            {level3Cards.length > 0 && (
                <div className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/20 shadow-sm dark:shadow-none backdrop-blur-sm rounded-xl overflow-hidden px-6 border">
                    <button
                        onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                        className="w-full flex items-center justify-between py-4 group"
                    >
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 whitespace-nowrap">Indicateurs Secondaires</h3>
                        <ChevronDown
                            className={cn(
                                "text-muted-foreground size-4 transition-transform duration-500",
                                isAccordionOpen && "rotate-180"
                            )}
                        />
                    </button>

                    <AnimatePresence initial={false}>
                        {isAccordionOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{
                                    height: "auto",
                                    opacity: 1,
                                    transition: {
                                        height: { type: "spring", stiffness: 100, damping: 20 },
                                        opacity: { duration: 0.2 }
                                    }
                                }}
                                exit={{
                                    height: 0,
                                    opacity: 0,
                                    transition: {
                                        height: { type: "spring", stiffness: 100, damping: 20 },
                                        opacity: { duration: 0.1 }
                                    }
                                }}
                                className="overflow-hidden"
                            >
                                <motion.div
                                    initial="hidden"
                                    animate="visible"
                                    variants={{
                                        visible: {
                                            transition: {
                                                staggerChildren: 0.05,
                                                delayChildren: 0.1
                                            }
                                        }
                                    }}
                                    className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 pb-6"
                                >
                                    {level3Cards.map((kpi) => (
                                        <motion.div
                                            key={kpi.id}
                                            variants={{
                                                hidden: { opacity: 0, y: 10 },
                                                visible: {
                                                    opacity: 1,
                                                    y: 0,
                                                    transition: {
                                                        type: "spring",
                                                        stiffness: 100,
                                                        damping: 15
                                                    }
                                                }
                                            }}
                                        >
                                            <CompactKpiCard title={kpi.title} value={kpi.value} icon={kpi.icon} unit={kpi.unit as "€" | "%" | undefined} variant={kpi.variant as "invest" | undefined} />
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function StandardKpiCard({ title, value, description, icon: Icon, color, isLoading, onRefresh }: {
    title: string, value: number, description: string, icon: React.ElementType, color: string, isLoading?: boolean, onRefresh?: () => void
}) {
    return (
        <Card className="border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/20 shadow-sm dark:shadow-none backdrop-blur-sm overflow-hidden group">
            <CardContent className="px-6 py-3 flex items-center gap-3">
                <div className={cn("p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 transition-colors group-hover:bg-slate-200 dark:group-hover:bg-white/10 shrink-0", color)}>
                    {onRefresh ? (
                        <button onClick={onRefresh} disabled={isLoading} className="flex items-center justify-center active:rotate-180 transition-transform duration-500">
                            <Icon className={cn("h-5 w-5", isLoading && "animate-spin")} />
                        </button>
                    ) : (
                        <Icon className="h-5 w-5" />
                    )}
                </div>
                <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate">{title}</p>
                    <div className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white line-clamp-1">
                        <RollingNumber value={value} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold truncate opacity-60">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function CompactKpiCard({ title, value, unit, icon: Icon, variant }: { title: string, value: number, unit?: "€" | "%", icon: React.ElementType, variant?: "invest" }) {
    return (
        <Card className="border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/10 hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-colors shadow-none">
            <CardContent className="px-3 py-1.5 flex flex-col gap-0.5">
                <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500 truncate mr-2">{title}</p>
                    <Icon className={cn("h-3 w-3", variant === "invest" ? "text-violet-500" : "text-slate-400 dark:text-slate-600")} />
                </div>
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-200">
                    <RollingNumber value={value} unit={unit} className="text-xl" />
                </div>
            </CardContent>
        </Card>
    );
}
