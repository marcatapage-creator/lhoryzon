import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Totals } from "@/lib/compta/calculations";
import { cn } from "@/lib/utils";
import { TrendingUp, PiggyBank, Receipt, ShoppingCart, Calculator } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, animate } from "framer-motion";

const QontoLogo = ({ className }: { className?: string }) => (
    <div
        className={cn("bg-current", className)}
        style={{
            maskImage: "url('/qonto-logo.png?v=2')",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
            maskMode: "luminance",
            WebkitMaskImage: "url('/qonto-logo.png?v=2')",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            WebkitMaskMode: "luminance",
        }}
    />
);

export interface RollingNumberProps {
    value: number;
    className?: string;
    showPositiveColor?: boolean;
}

export function RollingNumber({ value, className, showPositiveColor = false }: RollingNumberProps) {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
        const controls = animate(displayValue, value, {
            type: "spring",
            stiffness: 60,
            damping: 15,
            onUpdate: (latest) => setDisplayValue(latest),
        });
        return () => controls.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]); // Only trigger when the TARGET value changes

    const formatted = new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
    }).format(displayValue);

    const isNegative = value < 0;

    return (
        <motion.span
            className={cn(
                "inline-block tabular-nums",
                isNegative ? "text-red-500" : (showPositiveColor ? "text-emerald-500" : ""),
                className
            )}
        >
            {formatted}
        </motion.span>
    );
}

interface KpiCardsProps {
    totals: Totals;
    period?: string; // "multi", "all" (for one year), or month name
}

import { getQontoBalanceAction } from "@/app/actions/accounting";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useComptaStore } from "@/store/comptaStore";

export function KpiCards({ totals, period }: KpiCardsProps) {
    const isAnnual = period === "all";
    const isMulti = period === "multi";
    const { dashboardSettings } = useComptaStore();

    const [qontoBalance, setQontoBalance] = useState<number | null>(null);
    const [isQontoLoading, setIsQontoLoading] = useState(false);
    const [qontoError, setQontoError] = useState<string | null>(null);

    const fetchQonto = async () => {
        setIsQontoLoading(true);
        setQontoError(null);
        try {
            const result = await getQontoBalanceAction();
            if (result.success && result.balance !== undefined) {
                setQontoBalance(result.balance);
            }
        } catch {
            setQontoError("Erreur de connexion");
        } finally {
            setIsQontoLoading(false);
        }
    };

    useEffect(() => {
        fetchQonto();
    }, []);

    let cashFlowTitle = "Trésorerie / Mois";
    let cashFlowDesc = "Encaissement - Sorties réelles";

    if (isAnnual) {
        cashFlowTitle = "Trésorerie / An";
        cashFlowDesc = "Encaissements - Sorties (Annuel)";
    } else if (isMulti) {
        cashFlowTitle = "Trésorerie Totale";
        cashFlowDesc = "Cumul sur toutes les années";
    }

    const allCards = [
        {
            id: "Trésorerie Qonto",
            title: "Trésorerie Qonto",
            rawValue: qontoBalance ?? 0,
            description: "Solde réel en temps réel",
            icon: QontoLogo,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30",
            isMain: true,
            isQonto: true,
        },
        {
            id: "Trésorerie / Mois",
            title: cashFlowTitle,
            rawValue: totals.incomeTTC - totals.realTreasuryOutflow,
            description: cashFlowDesc,
            icon: PiggyBank,
            color: (totals.incomeTTC - totals.realTreasuryOutflow) >= 0 ? "text-blue-600" : "text-red-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
            isMain: true,
        },
        {
            id: "Trésorerie Finale",
            title: "Trésorerie Finale",
            rawValue: totals.projectedTreasury,
            description: "Solde projeté (Initial + Résultat)",
            icon: Calculator,
            color: totals.projectedTreasury >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
            bg: "bg-blue-100 dark:bg-blue-900/40",
            isMain: true,
        },
        {
            id: "Surplus Réel (HT)",
            title: "Surplus Réel (HT)",
            rawValue: totals.profitHT,
            description: "Ce qu'il vous reste réellement",
            icon: TrendingUp,
            color: totals.profitHT >= 0 ? "text-emerald-600" : "text-red-600",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            isMain: false,
        },
        {
            id: "Estimation TVA",
            title: "Estimation TVA",
            rawValue: totals.vatNet,
            description: "À reverser à l'État",
            icon: Receipt,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            isMain: false,
        },
        {
            id: "Engagé BTC",
            title: "Engagé BTC",
            rawValue: totals.btcTotal,
            description: "Total investi en Bitcoin",
            icon: TrendingUp,
            color: "text-orange-500",
            bg: "bg-orange-50 dark:bg-orange-950/20",
            isMain: false,
        },
        {
            id: "Engagé PER",
            title: "Engagé PER",
            rawValue: totals.perTotal,
            description: "Total épargne retraite",
            icon: TrendingUp,
            color: "text-violet-500",
            bg: "bg-violet-50 dark:bg-violet-950/20",
            isMain: false,
        },
        {
            id: "Sorties Réelles",
            title: "Sorties Réelles",
            rawValue: totals.realTreasuryOutflow,
            description: "Charges + TVA + Impôts",
            icon: ShoppingCart,
            color: "text-slate-900 dark:text-slate-100",
            bg: "bg-slate-100 dark:bg-slate-800",
            isMain: false,
        },
    ].filter(card => dashboardSettings.visibleKpis.includes(card.id));

    const mainCards = allCards.filter(c => c.isMain);
    const secondaryCards = allCards.filter(c => !c.isMain);

    return (
        <div className="space-y-4">
            <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {allCards.map((card, index) => {
                    const Icon = card.icon;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const qontoCard = (card as any).isQonto;

                    return (
                        <Card key={index} className="overflow-hidden border-slate-200/60 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm p-0 flex flex-col">
                            <CardHeader className={cn("flex flex-row items-center justify-between space-y-0 pt-6 pb-4", card.bg)}>
                                <div className="flex items-center gap-2.5">
                                    {qontoCard && <QontoLogo className="h-5 w-5 rounded-lg shadow-sm animate-in fade-in zoom-in duration-700" />}
                                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {card.title}
                                    </CardTitle>
                                </div>
                                {qontoCard ? (
                                    <button
                                        onClick={fetchQonto}
                                        disabled={isQontoLoading}
                                        className="hover:bg-black/5 dark:hover:bg-white/5 p-1.5 rounded-full transition-all active:scale-95 disabled:opacity-50"
                                        title="Rafraîchir le solde Qonto"
                                    >
                                        <RefreshCw className={cn("h-3.5 w-3.5 text-blue-500", isQontoLoading && "animate-spin")} />
                                    </button>
                                ) : (
                                    <Icon className={cn("h-5 w-5", card.color)} />
                                )}
                            </CardHeader>
                            <CardContent className="pt-4 pb-6 flex-1 flex flex-col justify-center">
                                {qontoCard && qontoError ? (
                                    <div className="flex items-center gap-2 text-red-500">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-xs font-medium">{qontoError}</span>
                                    </div>
                                ) : qontoCard && isQontoLoading && qontoBalance === null ? (
                                    <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
                                ) : (
                                    <div className="text-2xl font-bold">
                                        <RollingNumber value={card.rawValue} />
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    {card.description}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="md:hidden space-y-4">
                <div className="grid gap-3">
                    {mainCards.map((card, index) => {
                        const Icon = card.icon;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const qontoCard = (card as any).isQonto;

                        return (
                            <Card key={index} className="overflow-hidden border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm p-0">
                                <div className="flex items-center p-4">
                                    <div className={cn("rounded-lg mr-3 shadow-sm flex items-center justify-center overflow-hidden", card.bg, qontoCard ? "p-0" : "p-1.5")}>
                                        <Icon className={cn(qontoCard ? "h-8 w-8" : "h-5 w-5", card.color)} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">
                                            {card.title}
                                        </p>
                                        {qontoCard && qontoError ? (
                                            <div className="text-red-500 text-xs font-medium truncate">{qontoError}</div>
                                        ) : qontoCard && isQontoLoading && qontoBalance === null ? (
                                            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded mt-1" />
                                        ) : (
                                            <div className="text-lg font-bold">
                                                <RollingNumber value={card.rawValue} />
                                            </div>
                                        )}
                                    </div>
                                    {qontoCard && (
                                        <button
                                            onClick={fetchQonto}
                                            disabled={isQontoLoading}
                                            className="p-2 ml-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-all active:scale-90"
                                        >
                                            <RefreshCw className={cn("h-4 w-4 text-blue-500", isQontoLoading && "animate-spin")} />
                                        </button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="details" className="border-none">
                        <AccordionTrigger className="flex-none w-fit mx-auto gap-2 py-2 px-6 bg-slate-200/50 dark:bg-slate-800/50 rounded-full text-slate-600 dark:text-slate-400 hover:no-underline text-[10px] font-bold uppercase tracking-widest transition-all items-center justify-center h-9 [&>svg]:translate-y-0 [&>svg]:size-3.5">
                            Voir plus de détails
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 space-y-3 px-0">
                            <div className="grid gap-3">
                                {secondaryCards.map((card, index) => {
                                    const Icon = card.icon;
                                    return (
                                        <Card key={index} className="overflow-hidden border-slate-200/60 dark:border-white/10 shadow-sm bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm p-0">
                                            <div className="flex items-center p-4">
                                                <div className={cn("p-2 rounded-lg mr-3", card.bg)}>
                                                    <Icon className={cn("h-5 w-5", card.color)} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1">
                                                        {card.title}
                                                    </p>
                                                    <div className="text-lg font-bold">
                                                        <RollingNumber value={card.rawValue} />
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}
