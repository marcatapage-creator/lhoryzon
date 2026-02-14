import { Operation, FiscalProfile, Month, MONTHS, PaymentEvent, MoneyCents, RateBps, Totals } from "./types";
export type { Operation, FiscalProfile, Month, PaymentEvent, MoneyCents, RateBps, Totals };
export { MONTHS };
import { money, mulRate, splitVat, calculateParamsHash } from "./money";
import { getBusinessParams } from "./tax_params/registry";
import { getRegimeCapabilities } from "./tax_params/capabilities";

// --- Helpers ---
export const isVatCategory = (item: { category?: string }) => item.category === 'vat';
export const isSpecialCategory = (item: { category?: string }) => ['vat', 'social', 'tax'].includes(item.category || '');
export const isBtcCategory = (item: { category?: string }) => item.category === 'btc';
export const isPerCategory = (item: { category?: string }) => item.category === 'per';
export const calculateHT = (ttc: number): number => ttc / 1.2;
export const calculateVAT = (ttc: number): number => ttc - (ttc / 1.2);

// --- Net Pocket Logic ---

export const calculateNetCashFlow = (
    incomeTTC_cents: MoneyCents,
    proExpensesTTC_cents: MoneyCents,
    otherExpenses_cents: MoneyCents,
    profile: FiscalProfile | null,
    year: number = 2024
): {
    vatCollected_cents: MoneyCents;
    socialCharges_cents: MoneyCents;
    taxes_cents: MoneyCents;
    netPocket_cents: MoneyCents;
} => {
    if (!profile) {
        return {
            vatCollected_cents: 0,
            socialCharges_cents: 0,
            taxes_cents: 0,
            netPocket_cents: incomeTTC_cents - proExpensesTTC_cents - otherExpenses_cents
        };
    }

    let vatCollected_cents = 0;

    // 2. VAT Calculation
    if (profile.vatEnabled) {
        vatCollected_cents = splitVat(incomeTTC_cents, 2000).vat_cents;
    }

    // 4. Social & Taxes logic based on Profile
    let socialCharges_cents = 0;
    let taxes_cents = 0;
    let netPocket_cents = 0;

    const params = getBusinessParams(year, profile.status);
    const incomeHT_cents = incomeTTC_cents - vatCollected_cents;

    if (profile.status === 'micro') {
        socialCharges_cents = mulRate(incomeTTC_cents, params.socialRate_bps);
        taxes_cents = mulRate(incomeTTC_cents, params.incomeTaxRate_bps);
        netPocket_cents = incomeTTC_cents - proExpensesTTC_cents - otherExpenses_cents - socialCharges_cents - taxes_cents;

    } else if (profile.status === 'ei' || profile.status === 'url_ir') {
        const expensesHT_cents = profile.vatEnabled ? splitVat(proExpensesTTC_cents, 2000).net_cents : proExpensesTTC_cents;
        const taxableBase_cents = incomeHT_cents - expensesHT_cents;

        socialCharges_cents = Math.max(0, mulRate(taxableBase_cents, params.socialRate_bps));
        taxes_cents = Math.max(0, mulRate(taxableBase_cents, params.incomeTaxRate_bps));

        netPocket_cents = incomeHT_cents - proExpensesTTC_cents - otherExpenses_cents - socialCharges_cents - taxes_cents;

    } else if (profile.status === 'sas_is') {
        const expensesHT_cents = splitVat(proExpensesTTC_cents, 2000).net_cents;
        const result_cents = incomeHT_cents - expensesHT_cents;

        if (result_cents > 0) {
            const isTax_cents = mulRate(result_cents, params.isReducedRate_bps); // Simplified: assuming reduced rate for simulation
            taxes_cents = isTax_cents;
            const distributable_cents = result_cents - isTax_cents;
            const flatTax_cents = mulRate(distributable_cents, params.flatTaxRate_bps);
            netPocket_cents = distributable_cents - flatTax_cents - otherExpenses_cents;
        } else {
            taxes_cents = 0;
            netPocket_cents = -otherExpenses_cents;
        }
    }

    return {
        vatCollected_cents,
        socialCharges_cents,
        taxes_cents,
        netPocket_cents: Math.max(0, netPocket_cents)
    };
};


/**
 * Distributes a total amount of cents into N parts, 
 * ensuring that the sum of parts exactly equals the total.
 * Residual cents are injected into the last part.
 */
export const distributeCents = (total_cents: MoneyCents, count: number): MoneyCents[] => {
    if (count <= 0) return [];
    const base = Math.floor(total_cents / count);
    const parts = new Array(count).fill(base);
    const currentSum = base * count;
    const residual = total_cents - currentSum;

    // Distribute residual one by one to avoid large spikes in the last month
    // although for small amounts math.floor + sum is fine, this is more "fintech"
    for (let i = 0; i < Math.abs(residual); i++) {
        const idx = i % count;
        parts[idx] += residual > 0 ? 1 : -1;
    }

    return parts;
};


// --- Core Aggregation ---

export const computeFilteredTotals = (
    op: Operation,
    monthFilter: Month | "all",
    profile: FiscalProfile | null = null,
    strictMode: boolean = false
): Totals => {
    const status = profile?.status || 'bnc';
    const params = getBusinessParams(op.year, status);
    const caps = getRegimeCapabilities(status);
    const engineVersion = "2.2.0";

    // Stable Fingerprint including context
    const fingerPrintContext = {
        year: op.year,
        regime: status,
        engineVersion,
        params
    };
    const fiscalHash = calculateParamsHash(fingerPrintContext);

    const traceLines: string[] = [
        `Audit Log: ${monthFilter}, Year ${op.year}`,
        `Regime: ${status}`,
        `Fiscal Hash: ${fiscalHash}`
    ];

    let incomeTTC_cents = 0;
    let social_cents = 0;
    let tax_cents = 0;
    let pro_cents = 0;
    let personal_cents = 0;
    let other_cents = 0;
    let btc_cents = 0;
    let per_cents = 0;
    let vat_net_cents = 0;

    // 1. Income Calculation
    if (monthFilter === "all") {
        incomeTTC_cents = money.add(
            ...Object.values(op.income.salaryTTCByMonth),
            op.income.otherIncomeTTC_cents
        );

        (op.income.items || []).forEach(i => {
            const m = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
            incomeTTC_cents += (i.amount_ttc_cents * m);
        });
    } else {
        incomeTTC_cents += (op.income.salaryTTCByMonth[monthFilter] || 0);

        if (op.income.otherIncomeSelectedMonths.includes(monthFilter)) {
            const count = op.income.otherIncomeSelectedMonths.length || 1;
            const idx = op.income.otherIncomeSelectedMonths.indexOf(monthFilter);
            if (strictMode) {
                const val = op.income.otherIncomeTTC_cents;
                const isFirstMonth = op.income.otherIncomeSelectedMonths[0] === monthFilter;
                if (isFirstMonth) {
                    incomeTTC_cents += val;
                    traceLines.push(`StrictCash: Other income full payment in ${monthFilter}`);
                }
            } else {
                const distributed = distributeCents(op.income.otherIncomeTTC_cents, count);
                incomeTTC_cents += distributed[idx];
            }
        }

        (op.income.items || []).forEach(i => {
            const isDueMonth = i.periodicity === 'monthly' ||
                (i.periodicity === 'quarterly' && ["Jan", "Apr", "Jul", "Oct"].includes(monthFilter)) ||
                (i.periodicity === 'yearly' && monthFilter === "Jan");

            if (strictMode) {
                if (isDueMonth) {
                    incomeTTC_cents += i.amount_ttc_cents;
                    traceLines.push(`StrictCash: ${i.label} payment due in ${monthFilter}`);
                }
            } else {
                const count = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
                const distributed = distributeCents(i.amount_ttc_cents * count, 12);
                incomeTTC_cents += distributed[MONTHS.indexOf(monthFilter)];
            }
        });
    }

    // 2. Pro Expenses Calculation
    if (monthFilter === "all") {
        const proItems = op.expenses.pro.items || [];
        const proItems_total = proItems.reduce((acc, i) => {
            const count = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
            return acc + (i.amount_ttc_cents * count);
        }, 0);
        pro_cents = op.expenses.pro.totalOverrideTTC_cents ? Number(op.expenses.pro.totalOverrideTTC_cents) : proItems_total;
    } else {
        (op.expenses.pro.items || []).forEach(i => {
            const isDueMonth = i.periodicity === 'monthly' ||
                (i.periodicity === 'quarterly' && ["Jan", "Apr", "Jul", "Oct"].includes(monthFilter)) ||
                (i.periodicity === 'yearly' && monthFilter === "Jan");

            if (strictMode) {
                if (isDueMonth) pro_cents += i.amount_ttc_cents;
            } else {
                const count = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
                const distributed = distributeCents(i.amount_ttc_cents * count, 12);
                pro_cents += distributed[MONTHS.indexOf(monthFilter)];
            }
        });

        if (op.expenses.pro.totalOverrideTTC_cents && !strictMode) {
            const distributed = distributeCents(Number(op.expenses.pro.totalOverrideTTC_cents), 12);
            pro_cents = distributed[MONTHS.indexOf(monthFilter)];
        }
    }

    // 3. Personal & Other Expenses Calculation
    if (monthFilter === "all") {
        // Personal
        (op.expenses.personal.items || []).forEach(i => {
            const count = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
            const val = i.amount_cents * count;

            if (i.category === 'btc') btc_cents += val;
            else if (i.category === 'per') per_cents += val;
            else personal_cents += val;
        });

        // Other (Split into Other, BTC, PER - Legacy support or specific other items)
        (op.expenses.otherItems || []).forEach(i => {
            let val = 0;
            if (i.selectedMonths && i.selectedMonths.length > 0) {
                val = (i.amount_cents * i.selectedMonths.length);
            } else {
                const count = i.periodicity === 'monthly' ? (i.durationMonths || 12) : i.periodicity === 'quarterly' ? 4 : 1;
                val = (i.amount_cents * count);
            }

            if (i.category === 'btc') btc_cents += val;
            else if (i.category === 'per') per_cents += val;
            else other_cents += val;
        });
    } else {
        // Monthly Personal
        (op.expenses.personal.items || []).forEach(i => {
            const isDueMonth = i.periodicity === 'monthly' ||
                (i.periodicity === 'quarterly' && ["Jan", "Apr", "Jul", "Oct"].includes(monthFilter)) ||
                (i.periodicity === 'yearly' && monthFilter === "Jan");

            let val = 0;
            if (strictMode) {
                if (isDueMonth) val = i.amount_cents;
            } else {
                const count = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
                const distributed = distributeCents(i.amount_cents * count, 12);
                val = distributed[MONTHS.indexOf(monthFilter)];
            }

            if (i.category === 'btc') btc_cents += val;
            else if (i.category === 'per') per_cents += val;
            else personal_cents += val;
        });

        // Monthly Other
        (op.expenses.otherItems || []).forEach(i => {
            let val = 0;
            if (i.selectedMonths && i.selectedMonths.length > 0) {
                if (i.selectedMonths.includes(monthFilter)) {
                    // Strict: full amount if selected? Or distributed?
                    // Assuming per-month input means "amount per selected month" usually, 
                    // OR total amount spread? 
                    // The schema says `amount_cents` is the *value*. 
                    // If selectedMonths is present, usually `amount_cents` is the recurrence value?
                    // Re-reading usage: "Manual items" logic usually treats amount as "per occurrence".
                    val = Math.round(i.amount_cents);
                }
            } else {
                const isDueMonth = i.periodicity === 'monthly' ||
                    (i.periodicity === 'quarterly' && ["Jan", "Apr", "Jul", "Oct"].includes(monthFilter)) ||
                    (i.periodicity === 'yearly' && monthFilter === "Jan");

                // Duration check
                let active = true;
                if (i.periodicity === 'monthly' && i.durationMonths) {
                    const monthIdx = MONTHS.indexOf(monthFilter);
                    if (monthIdx >= i.durationMonths) active = false;
                }

                if (active) {
                    if (strictMode) {
                        if (isDueMonth) val = i.amount_cents;
                    } else {
                        const effectiveDuration = (i.periodicity === 'monthly' && i.durationMonths) ? i.durationMonths : 12;
                        const annualVal = i.amount_cents * (i.periodicity === 'monthly' ? effectiveDuration : i.periodicity === 'quarterly' ? 4 : 1);
                        const distributed = distributeCents(annualVal, 12);
                        val = distributed[MONTHS.indexOf(monthFilter)];
                    }
                }
            }

            if (i.category === 'btc') btc_cents += val;
            else if (i.category === 'per') per_cents += val;
            else other_cents += val;
        });
    }

    // 4. Social & Taxes Calculation
    if (monthFilter === "all") {
        if (caps.hasSocial) {
            if (op.expenses.social.urssafByMonth && Object.keys(op.expenses.social.urssafByMonth).length > 0) {
                social_cents += Object.values(op.expenses.social.urssafByMonth).reduce((acc, val) => acc + val, 0);
            } else {
                const m = op.expenses.social.urssafPeriodicity === 'monthly' ? 12 : op.expenses.social.urssafPeriodicity === 'quarterly' ? 4 : 1;
                social_cents += op.expenses.social.urssaf_cents * m;
            }
            if (op.expenses.social.ircecByMonth && Object.keys(op.expenses.social.ircecByMonth).length > 0) {
                social_cents += Object.values(op.expenses.social.ircecByMonth).reduce((acc, val) => acc + val, 0);
            } else {
                const m = op.expenses.social.ircecPeriodicity === 'monthly' ? 12 : op.expenses.social.ircecPeriodicity === 'quarterly' ? 4 : 1;
                social_cents += op.expenses.social.ircec_cents * m;
            }
        }
        if (caps.hasIncomeTax) {
            if (op.expenses.taxes.incomeTaxByMonth && Object.keys(op.expenses.taxes.incomeTaxByMonth).length > 0) {
                tax_cents += Object.values(op.expenses.taxes.incomeTaxByMonth).reduce((acc, val) => acc + val, 0);
            } else {
                const m = op.expenses.taxes.incomeTaxPeriodicity === 'monthly' ? 12 : op.expenses.taxes.incomeTaxPeriodicity === 'quarterly' ? 4 : 1;
                tax_cents += op.expenses.taxes.incomeTax_cents * m;
            }
        }
        if (caps.hasIs) {
            const isVal = mulRate(incomeTTC_cents, params.isReducedRate_bps);
            tax_cents += isVal;
            traceLines.push(`CapabilityIS: IS estimated at ${isVal} cents`);
        }
    } else {
        if (caps.hasSocial) {
            social_cents += (op.expenses.social.urssafByMonth?.[monthFilter] ?? (op.expenses.social.urssafPeriodicity === 'monthly' ? op.expenses.social.urssaf_cents : 0));
            social_cents += (op.expenses.social.ircecByMonth?.[monthFilter] ?? (op.expenses.social.ircecPeriodicity === 'monthly' ? op.expenses.social.ircec_cents : 0));
        }
        if (caps.hasIncomeTax) {
            tax_cents += (op.expenses.taxes.incomeTaxByMonth?.[monthFilter] ?? (op.expenses.taxes.incomeTaxPeriodicity === 'monthly' ? op.expenses.taxes.incomeTax_cents : 0));
        }
    }

    // 5. VAT Logic
    if (profile?.vatEnabled) {
        let vatCollected = 0;
        let vatDeductible = 0;

        // A. Collected VAT
        if (monthFilter === "all") {
            let preciseVat = 0;
            preciseVat += splitVat(money.add(...Object.values(op.income.salaryTTCByMonth)), 2000).vat_cents;
            preciseVat += splitVat(op.income.otherIncomeTTC_cents, op.income.otherIncomeVATRate_bps).vat_cents;
            (op.income.items || []).forEach(i => {
                const m = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
                preciseVat += splitVat(i.amount_ttc_cents * m, i.vatRate_bps).vat_cents;
            });
            vatCollected = preciseVat;
        } else {
            let preciseVat = 0;
            preciseVat += splitVat(op.income.salaryTTCByMonth[monthFilter] || 0, 2000).vat_cents;

            if (op.income.otherIncomeSelectedMonths.includes(monthFilter)) {
                if (strictMode) {
                    if (op.income.otherIncomeSelectedMonths[0] === monthFilter) {
                        preciseVat += splitVat(op.income.otherIncomeTTC_cents, op.income.otherIncomeVATRate_bps).vat_cents;
                    }
                } else {
                    const count = op.income.otherIncomeSelectedMonths.length || 1;
                    const portion = Math.round(op.income.otherIncomeTTC_cents / count);
                    preciseVat += splitVat(portion, op.income.otherIncomeVATRate_bps).vat_cents;
                }
            }

            (op.income.items || []).forEach(i => {
                const isDue = i.periodicity === 'monthly' ||
                    (i.periodicity === 'quarterly' && ["Jan", "Apr", "Jul", "Oct"].includes(monthFilter)) ||
                    (i.periodicity === 'yearly' && monthFilter === "Jan");

                if (strictMode) {
                    if (isDue) preciseVat += splitVat(i.amount_ttc_cents, i.vatRate_bps).vat_cents;
                } else {
                    const annual = i.amount_ttc_cents * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1);
                    preciseVat += splitVat(Math.round(annual / 12), i.vatRate_bps).vat_cents;
                }
            });
            vatCollected = preciseVat;
        }

        // B. Deductible VAT
        if (monthFilter === "all") {
            if (op.expenses.pro.totalOverrideTTC_cents) {
                vatDeductible += splitVat(Number(op.expenses.pro.totalOverrideTTC_cents), 2000).vat_cents;
            } else {
                (op.expenses.pro.items || []).forEach(i => {
                    const m = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
                    vatDeductible += splitVat(i.amount_ttc_cents * m, i.vatRate_bps).vat_cents;
                });
            }
        } else {
            if (op.expenses.pro.totalOverrideTTC_cents && !strictMode) {
                const monthlyVal = Math.round(Number(op.expenses.pro.totalOverrideTTC_cents) / 12);
                vatDeductible += splitVat(monthlyVal, 2000).vat_cents;
            } else {
                (op.expenses.pro.items || []).forEach(i => {
                    const isDue = i.periodicity === 'monthly' ||
                        (i.periodicity === 'quarterly' && ["Jan", "Apr", "Jul", "Oct"].includes(monthFilter)) ||
                        (i.periodicity === 'yearly' && monthFilter === "Jan");

                    if (strictMode) {
                        if (isDue) vatDeductible += splitVat(i.amount_ttc_cents, i.vatRate_bps).vat_cents;
                    } else {
                        const annual = i.amount_ttc_cents * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1);
                        vatDeductible += splitVat(Math.round(annual / 12), i.vatRate_bps).vat_cents;
                    }
                });
            }
        }

        vat_net_cents = Math.max(0, vatCollected - vatDeductible);

        if (monthFilter === "all" && op.vatCarryover_cents > 0) {
            vat_net_cents = Math.max(0, vat_net_cents - Number(op.vatCarryover_cents));
        }

        traceLines.push(`VAT Logic: Collected=${vatCollected}, Deductible=${vatDeductible}, Net=${vat_net_cents}`);
    }

    const trace = traceLines.length > 50
        ? [...traceLines.slice(0, 45), `... (${traceLines.length - 49} hidden lines)`, ...traceLines.slice(-4)]
        : traceLines;

    const calcStatus = op.meta?.fiscalHash === fiscalHash ? 'fresh' : 'stale';

    const businessExpenses = pro_cents + social_cents + tax_cents + vat_net_cents;
    const totalOutflow = businessExpenses + personal_cents + other_cents + btc_cents + per_cents;

    return {
        incomeTTC_cents,
        realTreasuryOutflow_cents: totalOutflow,
        projectedTreasury_cents: op.cashCurrent_cents + incomeTTC_cents - totalOutflow,
        profitHT_cents: incomeTTC_cents - pro_cents,
        totalExpenses_cents: totalOutflow,
        vatNet_cents: vat_net_cents,
        socialTotal_cents: social_cents,
        taxTotal_cents: tax_cents,
        btcTotal_cents: btc_cents,
        perTotal_cents: per_cents,
        netPocket_cents: incomeTTC_cents - totalOutflow,
        savingsRate_bps: incomeTTC_cents > 0 ? Math.round(((incomeTTC_cents - totalOutflow) * 10000) / incomeTTC_cents) : 0,
        breakEvenPoint_cents: businessExpenses,
        trace,
        fiscalHash,
        calcStatus
    };
};

export const computeMultiYearTotals = (
    operations: Operation[],
    profile: FiscalProfile | null = null
): Totals => {
    const allTotals = operations.map(op => computeFilteredTotals(op, "all", profile));
    const combined = allTotals.reduce((acc, t) => ({
        incomeTTC_cents: acc.incomeTTC_cents + t.incomeTTC_cents,
        realTreasuryOutflow_cents: acc.realTreasuryOutflow_cents + t.realTreasuryOutflow_cents,
        projectedTreasury_cents: t.projectedTreasury_cents,
        profitHT_cents: acc.profitHT_cents + t.profitHT_cents,
        vatNet_cents: acc.vatNet_cents + t.vatNet_cents,
        socialTotal_cents: acc.socialTotal_cents + t.socialTotal_cents,
        taxTotal_cents: acc.taxTotal_cents + t.taxTotal_cents,
        btcTotal_cents: acc.btcTotal_cents + t.btcTotal_cents,
        perTotal_cents: acc.perTotal_cents + t.perTotal_cents,
        netPocket_cents: acc.netPocket_cents + t.netPocket_cents,
        totalExpenses_cents: acc.totalExpenses_cents + t.totalExpenses_cents,
        savingsRate_bps: 0 as RateBps,
        breakEvenPoint_cents: 0 as MoneyCents,
        trace: acc.trace.concat(t.trace),
        fiscalHash: acc.fiscalHash === t.fiscalHash ? acc.fiscalHash : "multiple",
        calcStatus: acc.calcStatus === t.calcStatus ? acc.calcStatus : 'recomputed'
    }), {
        incomeTTC_cents: 0 as MoneyCents,
        realTreasuryOutflow_cents: 0 as MoneyCents,
        projectedTreasury_cents: 0 as MoneyCents,
        profitHT_cents: 0 as MoneyCents,
        vatNet_cents: 0 as MoneyCents,
        socialTotal_cents: 0 as MoneyCents,
        taxTotal_cents: 0 as MoneyCents,
        btcTotal_cents: 0 as MoneyCents,
        perTotal_cents: 0 as MoneyCents,
        netPocket_cents: 0 as MoneyCents,
        totalExpenses_cents: 0 as MoneyCents,
        savingsRate_bps: 0 as RateBps,
        breakEvenPoint_cents: 0 as MoneyCents,
        trace: ["Combined Multi-Year Audit"],
        fiscalHash: "",
        calcStatus: 'fresh' // Initial status, will be updated by reduce
    });

    return {
        ...combined,
        savingsRate_bps: combined.incomeTTC_cents > 0 ? Math.round((combined.netPocket_cents * 10000) / combined.incomeTTC_cents) : 0,
        breakEvenPoint_cents: Math.round(combined.realTreasuryOutflow_cents / (operations.length || 1))
    };
};

// --- Charts & Distributions ---

export const getExpenseDistribution = (op: Operation, monthFilter: Month | "all" = "all", profile: FiscalProfile | null = null) => {
    const totals = computeFilteredTotals(op, monthFilter, profile);
    let pro_cents = 0;
    let personal_cents = 0;
    let otherSum_cents = 0;
    let social_cents = totals.socialTotal_cents;
    let taxes_cents = totals.taxTotal_cents;
    let tva_cents = totals.vatNet_cents;

    const processDistItem = (item: any, amount_cents: MoneyCents, category: 'pro' | 'personal' | 'other') => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (item.category === 'social') social_cents += amount_cents;
        else if (item.category === 'tax') taxes_cents += amount_cents;
        else {
            if (category === 'personal') personal_cents += amount_cents;
            else if (category === 'other') otherSum_cents += amount_cents;
            else pro_cents += amount_cents;
        }
    };

    if (monthFilter === "all") {
        if (op.expenses.pro.totalOverrideTTC_cents && op.expenses.pro.totalOverrideTTC_cents > 0) {
            pro_cents += op.expenses.pro.totalOverrideTTC_cents;
        } else {
            op.expenses.pro.items.forEach(i => {
                const mult = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
                processDistItem(i, i.amount_ttc_cents * mult, 'pro');
            });
        }
        op.expenses.personal.items.forEach(i => {
            const mult = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
            processDistItem(i, i.amount_cents * mult, 'personal');
        });
        op.expenses.otherItems.forEach(i => {
            let val_cents = 0;
            if (i.selectedMonths && i.selectedMonths.length > 0) val_cents = i.amount_cents * i.selectedMonths.length;
            else val_cents = i.amount_cents * (i.periodicity === 'monthly' ? (i.durationMonths || 12) : i.periodicity === 'quarterly' ? 4 : 1);
            processDistItem(i, val_cents, 'other');
        });
    } else {
        const annualDist = getExpenseDistribution(op, "all", profile);
        const annualTotal = annualDist.reduce((acc, d) => acc + d.value, 0);
        if (annualTotal > 0) {
            annualDist.forEach(d => {
                const ratio = d.value / annualTotal;
                const monthlyValue = totals.realTreasuryOutflow_cents * ratio;
                if (d.name === "Pro") pro_cents = monthlyValue;
                else if (d.name === "Perso") personal_cents = monthlyValue;
                else if (d.name === "Social") social_cents = monthlyValue;
                else if (d.name === "Impôts") taxes_cents = monthlyValue;
                else if (d.name === "TVA Net") tva_cents = monthlyValue;
                else if (d.name === "Autre") otherSum_cents = monthlyValue;
            });
        }
    }

    return [
        { name: "Impôts", value: taxes_cents, fill: "#f97316", color: "#f97316" },
        { name: "Perso", value: personal_cents, fill: "#a855f7", color: "#a855f7" },
        { name: "Pro", value: pro_cents, fill: "#3b82f6", color: "#3b82f6" },
        { name: "Social", value: social_cents, fill: "#ec4899", color: "#ec4899" },
        { name: "TVA Net", value: tva_cents, fill: "#eab308", color: "#eab308" },
        { name: "Autre", value: otherSum_cents, fill: "#64748b", color: "#64748b" }
    ].filter(x => x.value > 0);
};

export const getMultiYearExpenseDistribution = (operations: Operation[], profile: FiscalProfile | null = null) => {
    let pro_cents = 0, personal_cents = 0, otherSum_cents = 0, social_cents = 0, taxes_cents = 0, tva_cents = 0;
    operations.forEach(op => {
        const dist = getExpenseDistribution(op, "all", profile);
        dist.forEach(d => {
            if (d.name === "Pro") pro_cents += d.value;
            else if (d.name === "Perso") personal_cents += d.value;
            else if (d.name === "Social") social_cents += d.value;
            else if (d.name === "Impôts") taxes_cents += d.value;
            else if (d.name === "TVA Net") tva_cents += d.value;
            else if (d.name === "Autre") otherSum_cents += d.value;
        });
    });
    return [
        { name: "Impôts", value: taxes_cents, fill: "#f97316", color: "#f97316" },
        { name: "Perso", value: personal_cents, fill: "#a855f7", color: "#a855f7" },
        { name: "Pro", value: pro_cents, fill: "#3b82f6", color: "#3b82f6" },
        { name: "Social", value: social_cents, fill: "#ec4899", color: "#ec4899" },
        { name: "TVA Net", value: tva_cents, fill: "#eab308", color: "#eab308" },
        { name: "Autre", value: otherSum_cents, fill: "#64748b", color: "#64748b" }
    ].filter(x => x.value > 0);
};

const COLORS = ["#3b82f6", "#ef4444", "#60a5fa", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"];

export const getDetailedExpenseDistribution = (op: Operation, monthFilter: Month | "all", type: "pro" | "personal") => {
    const items = type === "pro" ? op.expenses.pro.items : op.expenses.personal.items;
    return items.map((item, index) => {
        const color = COLORS[index % COLORS.length];
        const amount_cents = 'amount_ttc_cents' in item ? item.amount_ttc_cents : item.amount_cents;
        const mult = item.periodicity === 'monthly' ? 12 : 1; // Simplified for detailed chart
        return {
            name: item.label,
            value: monthFilter === "all" ?
                amount_cents * mult :
                Math.round((amount_cents * mult) / 12),
            fill: color, color: color
        }
    }).filter(i => i.value > 0);
};

export const getMultiYearDetailedExpenseDistribution = (operations: Operation[], type: "pro" | "personal") => {
    const map = new Map<string, number>();
    operations.forEach(op => {
        const dist = getDetailedExpenseDistribution(op, "all", type);
        dist.forEach(d => {
            map.set(d.name, (map.get(d.name) || 0) + d.value);
        });
    });
    return Array.from(map.entries()).map(([name, value], index) => {
        const color = COLORS[index % COLORS.length];
        return { name, value, fill: color, color: color };
    });
};

export const getIncomeDistributionFromOp = (op: Operation, monthFilter: Month | "all") => {
    let salary_cents = 0, other_cents = 0;
    if (monthFilter === "all") {
        salary_cents = money.add(...Object.values(op.income.salaryTTCByMonth));
        salary_cents += (op.income.items || []).reduce((acc, i) => acc + i.amount_ttc_cents * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1), 0);
        other_cents = op.income.otherIncomeTTC_cents;
    } else {
        salary_cents = op.income.salaryTTCByMonth[monthFilter] || 0;
        salary_cents += (op.income.items || []).reduce((acc, i) => {
            const annual = i.amount_ttc_cents * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1);
            return acc + Math.round(annual / 12);
        }, 0);
        if (op.income.otherIncomeSelectedMonths.includes(monthFilter)) {
            other_cents = Math.round(op.income.otherIncomeTTC_cents / (op.income.otherIncomeSelectedMonths.length || 1));
        }
    }
    return [
        { name: "Salaires / Factures", value: salary_cents, fill: "#3b82f6", color: "#3b82f6" },
        { name: "Autres", value: other_cents, fill: "#6366f1", color: "#6366f1" }
    ];
};

export const getMultiYearIncomeDistribution = (operations: Operation[]) => {
    let totalSalary_cents = 0, totalOther_cents = 0;
    operations.forEach(op => {
        const d = getIncomeDistributionFromOp(op, "all");
        totalSalary_cents += d[0].value;
        totalOther_cents += d[1].value;
    });
    return [
        { name: "Salaires / Factures", value: totalSalary_cents, fill: "#3b82f6", color: "#3b82f6" },
        { name: "Autres", value: totalOther_cents, fill: "#6366f1", color: "#6366f1" }
    ];
};

export const getMultiYearChartData = (operations: Operation[]) => {
    return operations.sort((a, b) => a.year - b.year).map(op => {
        const t = computeFilteredTotals(op, "all");
        return {
            name: op.year.toString(),
            "Entrées TTC": t.incomeTTC_cents,
            "Sorties Réelles": t.realTreasuryOutflow_cents,
            "Surplus": t.incomeTTC_cents - t.realTreasuryOutflow_cents
        };
    });
};

// --- Timeline & Payment Schedule ---

export const getPaymentSchedule = (
    op: Operation,
    profile: FiscalProfile | null,
    currentMonth: Month = MONTHS[new Date().getMonth()]
): PaymentEvent[] => {
    const events: PaymentEvent[] = [];
    const currentIdx = MONTHS.indexOf(currentMonth);
    const getStatus = (m: Month) => MONTHS.indexOf(m) <= currentIdx ? 'realized' : 'projected';

    // URSSAF
    if (op.expenses.social.urssafByMonth) {
        Object.entries(op.expenses.social.urssafByMonth).forEach(([m, val]) => {
            if (val > 0) events.push({ id: `urssaf-${m}`, month: m as Month, label: "Cotisations URSSAF", amount: val, type: 'social', status: getStatus(m as Month) });
        });
    } else if (op.expenses.social.urssaf_cents > 0) {
        MONTHS.forEach((m, idx) => {
            let val = 0;
            if (op.expenses.social.urssafPeriodicity === 'monthly') val = op.expenses.social.urssaf_cents;
            else if (op.expenses.social.urssafPeriodicity === 'quarterly' && (idx + 1) % 3 === 0) val = op.expenses.social.urssaf_cents;
            else if (op.expenses.social.urssafPeriodicity === 'yearly' && idx === 11) val = op.expenses.social.urssaf_cents;
            if (val > 0) events.push({ id: `urssaf-${m}`, month: m, label: "Cotisations URSSAF (Est.)", amount: val, type: 'social', status: getStatus(m) });
        });
    }

    // IRCEC
    if (op.expenses.social.ircecByMonth) {
        Object.entries(op.expenses.social.ircecByMonth).forEach(([m, val]) => {
            if (val > 0) events.push({ id: `ircec-${m}`, month: m as Month, label: "Cotisations IRCEC", amount: val, type: 'social', status: getStatus(m as Month) });
        });
    }

    // Taxes
    if (op.expenses.taxes.incomeTaxByMonth) {
        Object.entries(op.expenses.taxes.incomeTaxByMonth).forEach(([m, val]) => {
            if (val > 0) events.push({ id: `tax-${m}`, month: m as Month, label: "Prélèvement à la Source", amount: val, type: 'tax', status: getStatus(m as Month) });
        });
    }

    // VAT
    if (profile?.vatEnabled) {
        const totals = computeFilteredTotals(op, "all", profile);
        if (totals.vatNet_cents > 0) {
            events.push({ id: `vat-total`, month: "Dec", label: "Régularisation TVA Annuelle", amount: totals.vatNet_cents, type: 'vat', status: 'projected' });
        }
    }

    // Manual items
    const processManualItems = (items: any[], catType: 'other' | 'personal') => { // eslint-disable-line @typescript-eslint/no-explicit-any
        items.forEach(i => {
            const label = i.label;
            const type = (i as { category?: string }).category || catType;
            const amount = i.amount_cents || i.amount_ttc_cents || 0;
            if (i.selectedMonths && i.selectedMonths.length > 0) {
                (i.selectedMonths as string[]).forEach((m: string) => {
                    events.push({ id: `${i.id}-${m}`, month: m as Month, label, amount: amount, type: (type || catType) as any, status: getStatus(m as Month) }); // eslint-disable-line @typescript-eslint/no-explicit-any
                });
            } else {
                MONTHS.forEach((m, idx) => {
                    let val = 0;
                    if (i.periodicity === 'monthly') val = amount;
                    else if (i.periodicity === 'quarterly' && (idx + 1) % 3 === 0) val = amount;
                    else if (i.periodicity === 'yearly' && idx === 11) val = amount;
                    if (val > 0) events.push({ id: `${i.id}-${m}`, month: m, label, amount: val, type: (type || catType) as any, status: getStatus(m) }); // eslint-disable-line @typescript-eslint/no-explicit-any
                });
            }
        });
    };
    processManualItems(op.expenses.otherItems, 'other');
    processManualItems(op.expenses.personal.items, 'personal');

    return events.sort((a, b) => MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month));
};
