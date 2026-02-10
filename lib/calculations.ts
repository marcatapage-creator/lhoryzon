import { Operation, Month, MONTHS } from "./types";

/**
 * TVA Precisions:
 * For a rate r%:
 * TVA = TTC * r / (100 + r)
 * HT = TTC - TVA
 */
export const calculateVAT = (ttc: number, rate: number = 20) => {
    if (rate === 0) return 0;
    return ttc * (rate / (100 + rate));
};

export const calculateHT = (ttc: number, rate: number = 20) => {
    return ttc - calculateVAT(ttc, rate);
};

export interface Totals {
    cash: number;
    incomeTTC: number;
    incomeHT: number;
    incomeVATCollected: number;
    proExpenseTTC: number;
    proVATDeductible: number;
    proExpenseHT: number;
    personalExpenseTotal: number;
    socialTotal: number;
    taxesTotal: number;
    otherAmount: number;
    totalExpenses: number;
    vatNet: number;
    profitTTC: number;
    profitHT: number;
    realTreasuryOutflow: number;
    projectedTreasury: number;
    btcTotal: number;
    perTotal: number;
}

const getMultiplier = (p?: string) => {
    if (p === "monthly") return 12;
    if (p === "quarterly") return 4;
    return 1;
};

/**
 * matchesInvestLabel helper
 */
const matchesInvestLabel = (label: string, keyword: string) => {
    const cleanLabel = label?.toLowerCase().replace(/\./g, "") || "";
    if (keyword === "btc") {
        return cleanLabel.includes("btc") || cleanLabel.includes("bitcoin");
    }
    return cleanLabel.includes(keyword.toLowerCase());
};

/**
 * computeYearTotals
 */
export const computeYearTotals = (op: Operation): Totals => {
    const salariesTTC = Object.values(op.income.salaryTTCByMonth).reduce((acc, v) => acc + v, 0);
    const salariesVAT = calculateVAT(salariesTTC, 20);
    const otherVAT = calculateVAT(op.income.otherIncomeTTC, op.income.otherIncomeVATRate || 0);

    const incomeVATCollected = salariesVAT + otherVAT;
    const incomeTTC = salariesTTC + op.income.otherIncomeTTC;
    const incomeHT = incomeTTC - incomeVATCollected;

    let proExpenseTTC = 0;
    let proVATDeductible = 0;

    if (op.expenses.pro.totalOverrideTTC && op.expenses.pro.totalOverrideTTC > 0) {
        proExpenseTTC = op.expenses.pro.totalOverrideTTC;
        proVATDeductible = calculateVAT(proExpenseTTC, 20);
    } else {
        op.expenses.pro.items.forEach(item => {
            const amount = item.amountTTC * getMultiplier(item.periodicity);
            proExpenseTTC += amount;
            proVATDeductible += calculateVAT(amount, item.vatRate);
        });
    }
    const proExpenseHT = proExpenseTTC - proVATDeductible;

    const personalExpenseTotal = op.expenses.personal.items.reduce((acc, item) => {
        return acc + (item.amount * getMultiplier(item.periodicity));
    }, 0);

    const urssafYear = op.expenses.social.urssafByMonth
        ? Object.values(op.expenses.social.urssafByMonth).reduce((acc, v) => acc + v, 0)
        : (op.expenses.social.urssaf * getMultiplier(op.expenses.social.urssafPeriodicity));

    const ircecYear = op.expenses.social.ircecByMonth
        ? Object.values(op.expenses.social.ircecByMonth).reduce((acc, v) => acc + v, 0)
        : (op.expenses.social.ircec * getMultiplier(op.expenses.social.ircecPeriodicity));

    const socialTotal = urssafYear + ircecYear;

    const taxesTotal = op.expenses.taxes.incomeTaxByMonth
        ? Object.values(op.expenses.taxes.incomeTaxByMonth).reduce((acc, v) => acc + v, 0)
        : (op.expenses.taxes.incomeTax * getMultiplier(op.expenses.taxes.incomeTaxPeriodicity));

    const otherAmount = op.expenses.otherItems?.reduce((acc, item) => {
        let m = 0;
        if (item.periodicity === "monthly") {
            m = (item.selectedMonths && item.selectedMonths.length > 0)
                ? item.selectedMonths.length
                : (item.durationMonths || 1);
        } else {
            m = item.periodicity === "quarterly" ? 4 : 1;
        }
        return acc + (item.amount * m);
    }, 0) || 0;

    const totalExpenses = proExpenseTTC + personalExpenseTotal + socialTotal + taxesTotal + otherAmount;
    const vatNet = incomeVATCollected - proVATDeductible;
    const profitTTC = incomeTTC - totalExpenses;
    const profitHT = incomeHT - proExpenseHT - (personalExpenseTotal + socialTotal + taxesTotal + otherAmount);

    const realTreasuryOutflow = totalExpenses + Math.max(0, vatNet);
    const projectedTreasury = op.cashCurrent + (incomeTTC - realTreasuryOutflow);

    // BTC & PER engagements (Scan all expense categories)
    const btcItems: { amount: number, periodicity: string, selectedMonths?: Month[], durationMonths?: number, isRecurring: boolean }[] = [
        ...(op.expenses.pro.items || []).filter(i => matchesInvestLabel(i.label, "btc")).map(i => ({ amount: i.amountTTC, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.personal.items || []).filter(i => matchesInvestLabel(i.label, "btc")).map(i => ({ amount: i.amount, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.otherItems || []).filter(i => matchesInvestLabel(i.label, "btc")).map(i => ({ ...i, isRecurring: false }))
    ];

    const perItems = [
        ...(op.expenses.pro.items || []).filter(i => matchesInvestLabel(i.label, "per")).map(i => ({ amount: i.amountTTC, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.personal.items || []).filter(i => matchesInvestLabel(i.label, "per")).map(i => ({ amount: i.amount, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.otherItems || []).filter(i => matchesInvestLabel(i.label, "per")).map(i => ({ ...i, isRecurring: false }))
    ];

    interface SumItem {
        amount: number;
        periodicity?: string;
        isRecurring: boolean;
        selectedMonths?: Month[];
        durationMonths?: number;
    }

    const sumYear = (items: SumItem[]) => items.reduce((acc, i) => {
        let m = 0;
        if (i.isRecurring) {
            m = getMultiplier(i.periodicity);
        } else {
            if (i.periodicity === "monthly") {
                m = (i.selectedMonths && i.selectedMonths.length > 0) ? i.selectedMonths.length : (i.durationMonths || 1);
            } else {
                m = i.periodicity === "quarterly" ? 4 : 1;
            }
        }
        return acc + (i.amount * m);
    }, 0);

    const btcTotal = sumYear(btcItems);
    const perTotal = sumYear(perItems);

    return {
        cash: op.cashCurrent,
        incomeTTC,
        incomeHT,
        incomeVATCollected,
        proExpenseTTC,
        proVATDeductible,
        proExpenseHT,
        personalExpenseTotal,
        socialTotal,
        taxesTotal,
        otherAmount,
        totalExpenses,
        vatNet,
        profitTTC,
        profitHT,
        realTreasuryOutflow,
        projectedTreasury,
        btcTotal,
        perTotal,
    };
};

/**
 * computeMonthTotals (Month Index 0..11)
 */
export const computeMonthTotals = (op: Operation, monthIndex: number): Totals => {
    const monthName = MONTHS[monthIndex];
    const salaryTTC = op.income.salaryTTCByMonth[monthName] || 0;

    const otherIncomeTTC = (op.income.otherIncomeSelectedMonths && op.income.otherIncomeSelectedMonths.length > 0)
        ? (op.income.otherIncomeSelectedMonths.includes(monthName) ? op.income.otherIncomeTTC : 0)
        : (op.income.otherIncomeTTC / 12);
    const incomeTTC = salaryTTC + otherIncomeTTC;

    const salaryVAT = calculateVAT(salaryTTC, 20);
    const otherVAT = calculateVAT(otherIncomeTTC, op.income.otherIncomeVATRate || 0);
    const incomeVATCollected = salaryVAT + otherVAT;
    const incomeHT = incomeTTC - incomeVATCollected;

    let proExpenseTTC = 0;
    let proVATDeductible = 0;
    if (op.expenses.pro.totalOverrideTTC && op.expenses.pro.totalOverrideTTC > 0) {
        proExpenseTTC = op.expenses.pro.totalOverrideTTC / 12;
        proVATDeductible = calculateVAT(proExpenseTTC, 20);
    } else {
        op.expenses.pro.items.forEach(item => {
            const amount = item.amountTTC * getMultiplier(item.periodicity) / 12;
            proExpenseTTC += amount;
            proVATDeductible += calculateVAT(amount, item.vatRate);
        });
    }
    const proExpenseHT = proExpenseTTC - proVATDeductible;

    const personalExpenseTotal = op.expenses.personal.items.reduce((acc, item) => {
        return acc + (item.amount * getMultiplier(item.periodicity) / 12);
    }, 0);

    const socialTotal = (op.expenses.social.urssafByMonth ? (op.expenses.social.urssafByMonth[monthName] || 0) : (op.expenses.social.urssaf * getMultiplier(op.expenses.social.urssafPeriodicity) / 12)) +
        (op.expenses.social.ircecByMonth ? (op.expenses.social.ircecByMonth[monthName] || 0) : (op.expenses.social.ircec * getMultiplier(op.expenses.social.ircecPeriodicity) / 12));

    const taxesTotal = op.expenses.taxes.incomeTaxByMonth
        ? (op.expenses.taxes.incomeTaxByMonth[monthName] || 0)
        : (op.expenses.taxes.incomeTax * getMultiplier(op.expenses.taxes.incomeTaxPeriodicity) / 12);

    const otherAmount = op.expenses.otherItems?.reduce((acc, item) => {
        if (item.periodicity === "monthly") {
            const isSelected = (item.selectedMonths && item.selectedMonths.length > 0)
                ? item.selectedMonths.includes(monthName)
                : (MONTHS.indexOf(monthName) < (item.durationMonths || 1));
            return acc + (isSelected ? item.amount : 0);
        } else {
            const m = item.periodicity === "quarterly" ? 4 : 1;
            return acc + (item.amount * m / 12);
        }
    }, 0) || 0;

    const totalExpenses = proExpenseTTC + personalExpenseTotal + socialTotal + taxesTotal + otherAmount;
    const vatNet = incomeVATCollected - proVATDeductible;
    const profitTTC = incomeTTC - totalExpenses;
    const profitHT = incomeHT - proExpenseHT - (personalExpenseTotal + socialTotal + taxesTotal + otherAmount);
    const realTreasuryOutflow = totalExpenses + Math.max(0, vatNet);

    // Cumulative projected treasury for the month (Initial Cash + sum of all months up to selected month)
    let accumulatedResult = 0;
    for (let i = 0; i <= monthIndex; i++) {
        const mTotals = computeMonthTotalsSimple(op, i);
        accumulatedResult += (mTotals.incomeTTC - mTotals.realTreasuryOutflow);
    }
    const projectedTreasury = op.cashCurrent + accumulatedResult;

    // BTC & PER engagement (Month specific)
    const btcItems = [
        ...(op.expenses.pro.items || []).filter(i => matchesInvestLabel(i.label, "btc")).map(i => ({ amount: i.amountTTC, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.personal.items || []).filter(i => matchesInvestLabel(i.label, "btc")).map(i => ({ amount: i.amount, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.otherItems || []).filter(i => matchesInvestLabel(i.label, "btc")).map(i => ({ ...i, isRecurring: false }))
    ];

    const perItems = [
        ...(op.expenses.pro.items || []).filter(i => matchesInvestLabel(i.label, "per")).map(i => ({ amount: i.amountTTC, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.personal.items || []).filter(i => matchesInvestLabel(i.label, "per")).map(i => ({ amount: i.amount, periodicity: i.periodicity, isRecurring: true })),
        ...(op.expenses.otherItems || []).filter(i => matchesInvestLabel(i.label, "per")).map(i => ({ ...i, isRecurring: false }))
    ];

    interface SumItem {
        amount: number;
        periodicity?: string;
        isRecurring: boolean;
        selectedMonths?: Month[];
        durationMonths?: number;
    }

    const sumMonth = (items: SumItem[]) => items.reduce((acc, i) => {
        if (i.isRecurring) {
            if (i.periodicity === "monthly") return acc + i.amount;
            if (i.periodicity === "quarterly") return acc + (i.amount / 3);
            return acc + (i.amount / 12);
        } else {
            if (i.periodicity === "monthly") {
                const isSelected = (i.selectedMonths && i.selectedMonths.length > 0)
                    ? i.selectedMonths.includes(monthName)
                    : (MONTHS.indexOf(monthName) < (i.durationMonths || 1));
                return acc + (isSelected ? i.amount : 0);
            } else {
                const m = i.periodicity === "quarterly" ? 4 : 1;
                return acc + (i.amount * m / 12);
            }
        }
    }, 0);

    const btcTotal = sumMonth(btcItems);
    const perTotal = sumMonth(perItems);

    return {
        cash: op.cashCurrent,
        incomeTTC,
        incomeHT,
        incomeVATCollected,
        proExpenseTTC,
        proVATDeductible,
        proExpenseHT,
        personalExpenseTotal,
        socialTotal,
        taxesTotal,
        otherAmount,
        totalExpenses,
        vatNet,
        profitTTC,
        profitHT,
        realTreasuryOutflow,
        projectedTreasury,
        btcTotal,
        perTotal,
    };
};

/**
 * Internal helper to avoid infinite recursion
 */
const computeMonthTotalsSimple = (op: Operation, monthIndex: number) => {
    const monthName = MONTHS[monthIndex];
    const salaryTTC = op.income.salaryTTCByMonth[monthName] || 0;
    const otherIncomeTTC = (op.income.otherIncomeSelectedMonths && op.income.otherIncomeSelectedMonths.length > 0)
        ? (op.income.otherIncomeSelectedMonths.includes(monthName) ? op.income.otherIncomeTTC : 0)
        : (op.income.otherIncomeTTC / 12);
    const incomeTTC = salaryTTC + otherIncomeTTC;

    const salaryVAT = calculateVAT(salaryTTC, 20);
    const otherVAT = calculateVAT(otherIncomeTTC, op.income.otherIncomeVATRate || 0);
    const incomeVATCollected = salaryVAT + otherVAT;

    let proExpenseTTC = 0;
    let proVATDeductible = 0;
    if (op.expenses.pro.totalOverrideTTC && op.expenses.pro.totalOverrideTTC > 0) {
        proExpenseTTC = op.expenses.pro.totalOverrideTTC / 12;
        proVATDeductible = calculateVAT(proExpenseTTC, 20);
    } else {
        op.expenses.pro.items.forEach(item => {
            const amount = item.amountTTC * getMultiplier(item.periodicity) / 12;
            proExpenseTTC += amount;
            proVATDeductible += calculateVAT(amount, item.vatRate);
        });
    }

    const personalExpenseTotal = op.expenses.personal.items.reduce((acc, item) => {
        return acc + (item.amount * getMultiplier(item.periodicity) / 12);
    }, 0);

    const socialTotal = (op.expenses.social.urssafByMonth ? (op.expenses.social.urssafByMonth[monthName] || 0) : (op.expenses.social.urssaf * getMultiplier(op.expenses.social.urssafPeriodicity) / 12)) +
        (op.expenses.social.ircecByMonth ? (op.expenses.social.ircecByMonth[monthName] || 0) : (op.expenses.social.ircec * getMultiplier(op.expenses.social.ircecPeriodicity) / 12));

    const taxesTotal = op.expenses.taxes.incomeTaxByMonth
        ? (op.expenses.taxes.incomeTaxByMonth[monthName] || 0)
        : (op.expenses.taxes.incomeTax * getMultiplier(op.expenses.taxes.incomeTaxPeriodicity) / 12);

    const otherAmount = op.expenses.otherItems?.reduce((acc, item) => {
        if (item.periodicity === "monthly") {
            const isSelected = (item.selectedMonths && item.selectedMonths.length > 0)
                ? item.selectedMonths.includes(monthName)
                : (MONTHS.indexOf(monthName) < (item.durationMonths || 1));
            return acc + (isSelected ? item.amount : 0);
        } else {
            const m = item.periodicity === "quarterly" ? 4 : 1;
            return acc + (item.amount * m / 12);
        }
    }, 0) || 0;

    const totalExpenses = proExpenseTTC + personalExpenseTotal + socialTotal + taxesTotal + otherAmount;
    const vatNet = incomeVATCollected - proVATDeductible;
    const realTreasuryOutflow = totalExpenses + Math.max(0, vatNet);

    return {
        incomeTTC,
        realTreasuryOutflow
    };
};

export const getExpenseDistribution = (totals: Totals) => {
    return [
        { name: "Pro", value: totals.proExpenseTTC, color: "#3b82f6" },
        { name: "Perso", value: totals.personalExpenseTotal, color: "#a855f7" },
        { name: "Social", value: totals.socialTotal, color: "#ec4899" },
        { name: "Impôts", value: totals.taxesTotal, color: "#f97316" },
        { name: "Autres", value: totals.otherAmount, color: "#64748b" },
        { name: "TVA Net", value: Math.max(0, totals.vatNet), color: "#eab308" },
    ].filter(item => item.value > 0);
};

export const getIncomeDistribution = (totals: Totals) => {
    return [
        { name: "Salaires (TTC)", value: (totals.incomeTTC - (totals.incomeTTC * 0.2)), color: "#3b82f6" },
        { name: "Autres Rentrées", value: totals.incomeTTC * 0.2, color: "#10b981" },
    ].filter(item => item.value > 0);
};

// IMPROVED: getIncomeDistribution with real data by calculating from op
export const getIncomeDistributionFromOp = (op: Operation, filter: Month | "all") => {
    let salary = 0;
    let other = 0;

    if (filter === "all") {
        salary = Object.values(op.income.salaryTTCByMonth).reduce((acc, v) => acc + v, 0);
        other = op.income.otherIncomeTTC;
    } else {
        const monthName = filter;
        salary = op.income.salaryTTCByMonth[monthName] || 0;
        other = (op.income.otherIncomeSelectedMonths && op.income.otherIncomeSelectedMonths.length > 0)
            ? (op.income.otherIncomeSelectedMonths.includes(monthName) ? op.income.otherIncomeTTC : 0)
            : (op.income.otherIncomeTTC / 12);
    }

    return [
        { name: "Salaires (TTC)", value: salary, color: "#3b82f6" },
        { name: "Autres Rentrées", value: other, color: "#10b981" },
    ].filter(item => item.value > 0);
};

export const computeFilteredTotals = (op: Operation, filter: Month | "all"): Totals => {
    if (filter === "all") {
        return computeYearTotals(op);
    }
    const monthIndex = MONTHS.indexOf(filter);
    return computeMonthTotals(op, monthIndex);
};

/**
 * Multi-year aggregation
 */
export const computeMultiYearTotals = (ops: Operation[]): Totals => {
    const yearTotals = ops.map(op => computeYearTotals(op));

    const initial: Totals = {
        cash: 0,
        incomeTTC: 0,
        incomeHT: 0,
        incomeVATCollected: 0,
        proExpenseTTC: 0,
        proVATDeductible: 0,
        proExpenseHT: 0,
        personalExpenseTotal: 0,
        socialTotal: 0,
        taxesTotal: 0,
        otherAmount: 0,
        totalExpenses: 0,
        vatNet: 0,
        profitTTC: 0,
        profitHT: 0,
        realTreasuryOutflow: 0,
        projectedTreasury: 0,
        btcTotal: 0,
        perTotal: 0,
    };

    const aggregated = yearTotals.reduce((acc, t) => ({
        ...acc,
        incomeTTC: acc.incomeTTC + t.incomeTTC,
        incomeHT: acc.incomeHT + t.incomeHT,
        incomeVATCollected: acc.incomeVATCollected + t.incomeVATCollected,
        proExpenseTTC: acc.proExpenseTTC + t.proExpenseTTC,
        proVATDeductible: acc.proVATDeductible + t.proVATDeductible,
        proExpenseHT: acc.proExpenseHT + t.proExpenseHT,
        personalExpenseTotal: acc.personalExpenseTotal + t.personalExpenseTotal,
        socialTotal: acc.socialTotal + t.socialTotal,
        taxesTotal: acc.taxesTotal + t.taxesTotal,
        otherAmount: acc.otherAmount + t.otherAmount,
        totalExpenses: acc.totalExpenses + t.totalExpenses,
        vatNet: acc.vatNet + t.vatNet,
        profitTTC: acc.profitTTC + t.profitTTC,
        profitHT: acc.profitHT + t.profitHT,
        realTreasuryOutflow: acc.realTreasuryOutflow + t.realTreasuryOutflow,
        btcTotal: acc.btcTotal + t.btcTotal,
        perTotal: acc.perTotal + t.perTotal,
    }), initial);

    // For cash-related KPIs, take the most recent year
    const latestOp = [...ops].sort((a, b) => b.year - a.year)[0];
    const latestTotals = computeYearTotals(latestOp);

    return {
        ...aggregated,
        cash: latestOp.cashCurrent,
        projectedTreasury: latestTotals.projectedTreasury
    };
};

export const getMultiYearChartData = (ops: Operation[]) => {
    return [...ops].sort((a, b) => a.year - b.year).map(op => {
        const t = computeYearTotals(op);
        return {
            name: op.year.toString(),
            "Entrées TTC": t.incomeTTC,
            "Sorties Réelles": t.realTreasuryOutflow,
            "Surplus": t.incomeTTC - t.realTreasuryOutflow
        };
    });
};

export const getMultiYearIncomeDistribution = (ops: Operation[]) => {
    let salary = 0;
    let other = 0;

    ops.forEach(op => {
        salary += Object.values(op.income.salaryTTCByMonth).reduce((acc, v) => acc + v, 0);
        other += op.income.otherIncomeTTC;
    });

    return [
        { name: "Salaires (TTC)", value: salary, color: "#3b82f6" },
        { name: "Autres Rentrées", value: other, color: "#10b981" },
    ].filter(item => item.value > 0);
};

/**
 * Detailed Expense Breakdown (Items)
 */
const COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
    "#ec4899", "#06b6d4", "#f43f5e", "#14b8a6", "#6366f1"
];

export const getDetailedExpenseDistribution = (op: Operation, filter: Month | "all", type: "pro" | "personal") => {
    const items: { label: string, amount: number }[] = [];

    if (type === "pro") {
        op.expenses.pro.items.forEach(item => {
            let amount = 0;
            if (filter === "all") {
                amount = item.amountTTC * (item.periodicity === "monthly" ? 12 : (item.periodicity === "quarterly" ? 4 : 1));
            } else {
                amount = (item.amountTTC * (item.periodicity === "monthly" ? 12 : (item.periodicity === "quarterly" ? 4 : 1))) / 12;
            }
            items.push({ label: item.label, amount });
        });
    } else {
        op.expenses.personal.items.forEach(item => {
            let amount = 0;
            if (filter === "all") {
                amount = item.amount * (item.periodicity === "monthly" ? 12 : (item.periodicity === "quarterly" ? 4 : 1));
            } else {
                amount = (item.amount * (item.periodicity === "monthly" ? 12 : (item.periodicity === "quarterly" ? 4 : 1))) / 12;
            }
            items.push({ label: item.label, amount });
        });
    }

    return items
        .filter(i => i.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .map((item, index) => ({
            name: item.label || "Sans nom",
            value: item.amount,
            color: COLORS[index % COLORS.length]
        }));
};

export const getMultiYearDetailedExpenseDistribution = (ops: Operation[], type: "pro" | "personal") => {
    const map = new Map<string, number>();

    ops.forEach(op => {
        const details = getDetailedExpenseDistribution(op, "all", type);
        details.forEach(d => {
            map.set(d.name, (map.get(d.name) || 0) + d.value);
        });
    });

    return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length]
        }));
};
