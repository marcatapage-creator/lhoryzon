import { Operation, FiscalProfile, Month, MONTHS } from "./types";

export interface Totals {
    incomeTTC: number;
    realTreasuryOutflow: number;
    projectedTreasury: number;
    profitHT: number;
    vatNet: number;
    btcTotal: number;
    perTotal: number;
    netPocket: number;
    totalExpenses: number; // Added for detailed view
}


// --- Helpers ---
export const calculateHT = (amountTTC: number, vatRate: number = 20) => {
    return amountTTC / (1 + vatRate / 100);
};

export const calculateVAT = (amountTTC: number, vatRate: number = 20) => {
    return amountTTC - calculateHT(amountTTC, vatRate);
};

// --- Net Pocket Logic ---

export const calculateNetCashFlow = (
    incomeTTC: number,
    proExpensesTTC: number,
    otherExpenses: number,
    profile: FiscalProfile | null
): {
    vatCollected: number;
    socialCharges: number;
    taxes: number;
    netPocket: number;
} => {
    if (!profile) {
        return {
            vatCollected: 0,
            socialCharges: 0,
            taxes: 0,
            netPocket: incomeTTC - proExpensesTTC - otherExpenses
        };
    }

    let vatCollected = 0;

    // 2. VAT Calculation
    if (profile.vatEnabled) {
        // AmountTTC - (AmountTTC / 1.2)
        vatCollected = incomeTTC - (incomeTTC / 1.2);
    }

    // 4. Social & Taxes logic based on Profile
    let socialCharges = 0;
    let taxes = 0;
    let netPocket = 0;

    if (profile.status === 'micro') {
        // Micro: Flat rate on TURNOVER (Gross Income)
        // Social ~22%
        socialCharges = incomeTTC * 0.22;
        // Tax ~2.2% or 0 check
        taxes = incomeTTC * 0.022;

        netPocket = incomeTTC - proExpensesTTC - otherExpenses - socialCharges - taxes;

    } else if (profile.status === 'ei' || profile.status === 'url_ir') {
        // Reel (IR):
        const expensesHT = proExpensesTTC / (profile.vatEnabled ? 1.2 : 1);
        const taxableBase = (incomeTTC - vatCollected) - expensesHT;

        // Rough estimate if we don't have real social/tax data passed in this scope
        socialCharges = Math.max(0, taxableBase * 0.35);
        taxes = Math.max(0, taxableBase * 0.10);

        netPocket = incomeTTC - vatCollected - proExpensesTTC - otherExpenses - socialCharges - taxes;

    } else if (profile.status === 'sas_is') {
        // IS (Company):
        const expensesHT = proExpensesTTC / 1.2;
        const result = (incomeTTC - vatCollected) - expensesHT;

        if (result > 0) {
            const isTax = result * 0.15;
            taxes = isTax;
            const distributable = result - isTax;
            const flatTax = distributable * 0.30;
            netPocket = distributable - flatTax - otherExpenses;
        } else {
            taxes = 0;
            netPocket = -otherExpenses;
        }
    }

    return {
        vatCollected,
        socialCharges,
        taxes,
        netPocket: Math.max(0, netPocket)
    };
};


// --- Core Aggregation ---

export const computeFilteredTotals = (
    op: Operation,
    monthFilter: Month | "all",
    profile: FiscalProfile | null = null
): Totals => {
    let incomeTTC = 0;
    let proExpenses = 0;
    let social = 0;
    let tax = 0;
    let personal = 0;
    let other = 0;

    // Filter Logic
    if (monthFilter === "all") {
        incomeTTC = Object.values(op.income.salaryTTCByMonth).reduce((acc, val) => acc + val, 0) + op.income.otherIncomeTTC;

        // Pro Expenses: Override > 0 takes precedence
        if (op.expenses.pro.totalOverrideTTC && op.expenses.pro.totalOverrideTTC > 0) {
            proExpenses = op.expenses.pro.totalOverrideTTC;
        } else {
            proExpenses = op.expenses.pro.items.reduce((acc, i) => acc + i.amountTTC * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1), 0);
        }

        // Social: Sum of all months if schedule exists, otherwise yearly total
        // URSSAF
        if (op.expenses.social.urssafByMonth) {
            social += Object.values(op.expenses.social.urssafByMonth).reduce((acc, val) => acc + val, 0);
        } else {
            const m = op.expenses.social.urssafPeriodicity === 'monthly' ? 12 : op.expenses.social.urssafPeriodicity === 'quarterly' ? 4 : 1;
            social += op.expenses.social.urssaf * m;
        }
        // IRCEC
        if (op.expenses.social.ircecByMonth) {
            social += Object.values(op.expenses.social.ircecByMonth).reduce((acc, val) => acc + val, 0);
        } else {
            const m = op.expenses.social.ircecPeriodicity === 'monthly' ? 12 : op.expenses.social.ircecPeriodicity === 'quarterly' ? 4 : 1;
            social += op.expenses.social.ircec * m;
        }

        // Taxes
        if (op.expenses.taxes.incomeTaxByMonth) {
            tax += Object.values(op.expenses.taxes.incomeTaxByMonth).reduce((acc, val) => acc + val, 0);
        } else {
            const m = op.expenses.taxes.incomeTaxPeriodicity === 'monthly' ? 12 : op.expenses.taxes.incomeTaxPeriodicity === 'quarterly' ? 4 : 1;
            tax += op.expenses.taxes.incomeTax * m;
        }

        personal = op.expenses.personal.items.reduce((acc, i) => acc + i.amount * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1), 0);

        // Other items handling
        other = op.expenses.otherItems.reduce((acc, i) => {
            if (i.selectedMonths && i.selectedMonths.length > 0) {
                return acc + i.amount * i.selectedMonths.length;
            }
            if (i.periodicity === 'monthly') {
                // Check durationMonths if defined
                return acc + i.amount * (i.durationMonths || 12); // Default to 12 if no duration? or 1? Schema says default 1. But logic says "Monthly". Usually means x12 unless duration constraint.
                // Actually schema says durationMonths min 1 max 12 default 1.
                // But wait, if it's monthly recurrence indefinitely, it should be 12.
                // The wizard sets durationMonths to 1 by default but has "selectedMonths" logic.
                // Let's assume: if selectedMonths is empty, use durationMonths (if set), else 12?
                // Let's trust durationMonths if it's monthly.
            }
            return acc + i.amount * (i.periodicity === 'quarterly' ? 4 : 1);
        }, 0);

    } else {
        // MONTHLY VIEW
        incomeTTC = op.income.salaryTTCByMonth[monthFilter] || 0;

        // Other Income: Check specific months
        if (op.income.otherIncomeSelectedMonths.includes(monthFilter)) {
            incomeTTC += op.income.otherIncomeTTC / op.income.otherIncomeSelectedMonths.length;
        }

        // Pro Expenses
        if (op.expenses.pro.totalOverrideTTC && op.expenses.pro.totalOverrideTTC > 0) {
            // Simplified: Divide by 12
            proExpenses = op.expenses.pro.totalOverrideTTC / 12;
        } else {
            proExpenses = op.expenses.pro.items.reduce((acc, i) => {
                let amount = 0;
                if (i.periodicity === 'monthly') amount = i.amountTTC;
                else if (i.periodicity === 'quarterly') amount = i.amountTTC / 3; // Approx
                else amount = i.amountTTC / 12; // Yearly
                return acc + amount;
            }, 0);
        }

        // Social
        // URSSAF
        if (op.expenses.social.urssafByMonth) {
            social += op.expenses.social.urssafByMonth[monthFilter] || 0;
        } else {
            // If periodic, check if this month is a payment month? Too complex.
            // Let's smooth it out: Total / 12 for monthly view is standard for cash flow projection usually, 
            // unless we want strict cash view. Dashboard says "Trésorerie / Mois".
            // Let's smooth.
            const totalUrssaf = op.expenses.social.urssaf * (op.expenses.social.urssafPeriodicity === 'monthly' ? 12 : op.expenses.social.urssafPeriodicity === 'quarterly' ? 4 : 1);
            social += totalUrssaf / 12;
        }
        // IRCEC
        if (op.expenses.social.ircecByMonth) {
            social += op.expenses.social.ircecByMonth[monthFilter] || 0;
        } else {
            const totalIrcec = op.expenses.social.ircec * (op.expenses.social.ircecPeriodicity === 'monthly' ? 12 : op.expenses.social.ircecPeriodicity === 'quarterly' ? 4 : 1);
            social += totalIrcec / 12;
        }

        // Tax
        if (op.expenses.taxes.incomeTaxByMonth) {
            tax += op.expenses.taxes.incomeTaxByMonth[monthFilter] || 0;
        } else {
            const totalTax = op.expenses.taxes.incomeTax * (op.expenses.taxes.incomeTaxPeriodicity === 'monthly' ? 12 : op.expenses.taxes.incomeTaxPeriodicity === 'quarterly' ? 4 : 1);
            tax += totalTax / 12;
        }

        personal = op.expenses.personal.items.reduce((acc, i) => {
            // Smooth
            const m = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
            return acc + (i.amount * m) / 12;
        }, 0);

        other = op.expenses.otherItems.reduce((acc, i) => {
            if (i.selectedMonths && i.selectedMonths.length > 0) {
                return i.selectedMonths.includes(monthFilter) ? i.amount : 0;
            }
            // If durationMonths defined
            // How do we request "start month"? We don't have it.
            // Assumption: spreading heavily relies on "selectedMonths".
            // If monthly without selectedMonths, we assume all year or smooth.
            // Let's smooth.

            let total = 0;
            if (i.periodicity === 'monthly') {
                total = i.amount * (i.durationMonths || 12);
            } else {
                total = i.amount * (i.periodicity === 'quarterly' ? 4 : 1);
            }
            return acc + total / 12;
        }, 0);
    }


    // Net Pocket Calc
    // We pass explicit Social/Tax if we want to override the profile estimation, 
    // OR we rely purely on profile estimation for "Net Pocket" and use stored values for "Sorties Réelles"
    // mixing both is tricky.
    // For "Sorties Réelles" (Cash Flow Out), we MUST use what is actually paid (stored).

    const realTreasuryOutflow = proExpenses + social + tax + personal + other;

    // For "Net Pocket", we use the profile logic
    const { netPocket, vatCollected, taxes: estimatedTax } = calculateNetCashFlow(
        incomeTTC,
        proExpenses,
        personal + other, // Personal/Other are deducted from Net Pocket
        profile
    );

    // Projected Treasury
    // Start Cash + Income - Outflow
    const projectedTreasury = op.cashCurrent + incomeTTC - realTreasuryOutflow;

    // Profit HT (Approx)
    // If VAT enabled: IncomeHT - ExpensesHT
    const incomeHT = profile?.vatEnabled ? incomeTTC / 1.2 : incomeTTC;
    const expenseHT = profile?.vatEnabled ? proExpenses / 1.2 : proExpenses;
    const profitHT = incomeHT - expenseHT;

    // VAT Net
    // If we have profile: Estimated
    const vatNet = vatCollected; // - Deductible? (Included in logic above technically)
    // Let's simplify: Net VAT to pay = Collected - Deductible on Expenses
    // Deductible = ExpensesTTC - ExpensesHT
    const vatDeductible = proExpenses - (proExpenses / 1.2);
    const finalVatNet = profile?.vatEnabled ? Math.max(0, vatCollected - vatDeductible) : 0;


    return {
        incomeTTC,
        realTreasuryOutflow,
        projectedTreasury,
        profitHT,
        vatNet: finalVatNet,
        btcTotal: 0,
        perTotal: 0,
        netPocket,
        totalExpenses: realTreasuryOutflow // Alias
    };
};

export const computeMultiYearTotals = (
    operations: Operation[],
    profile: FiscalProfile | null = null
): Totals => {
    // Sum of all annual totals
    const allTotals = operations.map(op => computeFilteredTotals(op, "all", profile));

    return allTotals.reduce((acc, t) => ({
        incomeTTC: acc.incomeTTC + t.incomeTTC,
        realTreasuryOutflow: acc.realTreasuryOutflow + t.realTreasuryOutflow,
        projectedTreasury: t.projectedTreasury, // Take the latest one? Or sum? "Trésorerie Finale" is usually cumulative.
        // Actually, projected treasury is a stock, not a flow.
        // If we sum years, we might just want the latest year's end state?
        // Or users want "Total Cash Accumulated"? 
        // Let's assume "Projected Treasury" of the latest year is the global state.
        // But "Net Pocket" etc are flows (Sums).
        profitHT: acc.profitHT + t.profitHT,
        vatNet: acc.vatNet + t.vatNet,
        btcTotal: acc.btcTotal + t.btcTotal,
        perTotal: acc.perTotal + t.perTotal,
        netPocket: acc.netPocket + t.netPocket,
        totalExpenses: acc.totalExpenses + t.totalExpenses
    }), {
        incomeTTC: 0,
        realTreasuryOutflow: 0,
        projectedTreasury: 0, // This logic is tricky for reduce
        profitHT: 0,
        vatNet: 0,
        btcTotal: 0,
        perTotal: 0,
        netPocket: 0,
        totalExpenses: 0
    });
};


// --- Charts & Distributions ---

export const getExpenseDistribution = (op: Operation, monthFilter: Month | "all" = "all") => {
    let pro = 0;
    let personal = 0;
    let socialTax = 0;
    let other = 0;

    if (monthFilter === "all") {
        if (op.expenses.pro.totalOverrideTTC && op.expenses.pro.totalOverrideTTC > 0) {
            pro = op.expenses.pro.totalOverrideTTC;
        } else {
            pro = op.expenses.pro.items.reduce((acc, i) => acc + i.amountTTC * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1), 0);
        }

        personal = op.expenses.personal.items.reduce((acc, i) => acc + i.amount * (i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1), 0);

        // Social
        if (op.expenses.social.urssafByMonth) socialTax += Object.values(op.expenses.social.urssafByMonth).reduce((a, b) => a + b, 0);
        else socialTax += op.expenses.social.urssaf * (op.expenses.social.urssafPeriodicity === 'monthly' ? 12 : op.expenses.social.urssafPeriodicity === 'quarterly' ? 4 : 1);

        if (op.expenses.social.ircecByMonth) socialTax += Object.values(op.expenses.social.ircecByMonth).reduce((a, b) => a + b, 0);
        else socialTax += op.expenses.social.ircec * (op.expenses.social.ircecPeriodicity === 'monthly' ? 12 : op.expenses.social.ircecPeriodicity === 'quarterly' ? 4 : 1);

        if (op.expenses.taxes.incomeTaxByMonth) socialTax += Object.values(op.expenses.taxes.incomeTaxByMonth).reduce((a, b) => a + b, 0);
        else socialTax += op.expenses.taxes.incomeTax * (op.expenses.taxes.incomeTaxPeriodicity === 'monthly' ? 12 : op.expenses.taxes.incomeTaxPeriodicity === 'quarterly' ? 4 : 1);

        other = op.expenses.otherItems.reduce((acc, i) => {
            if (i.selectedMonths && i.selectedMonths.length > 0) return acc + i.amount * i.selectedMonths.length;
            return acc + i.amount * (i.periodicity === 'monthly' ? (i.durationMonths || 12) : i.periodicity === 'quarterly' ? 4 : 1);
        }, 0);

    } else {
        // Monthly View
        if (op.expenses.pro.totalOverrideTTC && op.expenses.pro.totalOverrideTTC > 0) {
            pro = op.expenses.pro.totalOverrideTTC / 12;
        } else {
            pro = op.expenses.pro.items.reduce((acc, i) => {
                let amount = 0;
                if (i.periodicity === 'monthly') amount = i.amountTTC;
                else if (i.periodicity === 'quarterly') amount = i.amountTTC / 3;
                else amount = i.amountTTC / 12;
                return acc + amount;
            }, 0);
        }

        personal = op.expenses.personal.items.reduce((acc, i) => {
            const m = i.periodicity === 'monthly' ? 12 : i.periodicity === 'quarterly' ? 4 : 1;
            return acc + (i.amount * m) / 12;
        }, 0);

        // Social
        if (op.expenses.social.urssafByMonth) socialTax += op.expenses.social.urssafByMonth[monthFilter] || 0;
        else socialTax += (op.expenses.social.urssaf * (op.expenses.social.urssafPeriodicity === 'monthly' ? 12 : op.expenses.social.urssafPeriodicity === 'quarterly' ? 4 : 1)) / 12;

        if (op.expenses.social.ircecByMonth) socialTax += op.expenses.social.ircecByMonth[monthFilter] || 0;
        else socialTax += (op.expenses.social.ircec * (op.expenses.social.ircecPeriodicity === 'monthly' ? 12 : op.expenses.social.ircecPeriodicity === 'quarterly' ? 4 : 1)) / 12;

        if (op.expenses.taxes.incomeTaxByMonth) socialTax += op.expenses.taxes.incomeTaxByMonth[monthFilter] || 0;
        else socialTax += (op.expenses.taxes.incomeTax * (op.expenses.taxes.incomeTaxPeriodicity === 'monthly' ? 12 : op.expenses.taxes.incomeTaxPeriodicity === 'quarterly' ? 4 : 1)) / 12;

        // Other
        other = op.expenses.otherItems.reduce((acc, i) => {
            if (i.selectedMonths && i.selectedMonths.length > 0) {
                return i.selectedMonths.includes(monthFilter) ? i.amount : 0;
            }
            let total = i.amount * (i.periodicity === 'monthly' ? (i.durationMonths || 12) : i.periodicity === 'quarterly' ? 4 : 1);
            return acc + total / 12;
        }, 0);
    }

    return [
        { name: "Pro", value: pro, fill: "#3b82f6", color: "#3b82f6" },
        { name: "Perso", value: personal, fill: "#f43f5e", color: "#f43f5e" },
        { name: "Social/Impôts", value: socialTax, fill: "#eab308", color: "#eab308" },
        { name: "Autres", value: other, fill: "#a855f7", color: "#a855f7" }
    ].filter(x => x.value > 0);
};

export const getMultiYearExpenseDistribution = (operations: Operation[]) => {
    let pro = 0;
    let personal = 0;
    let socialTax = 0;
    let other = 0;

    operations.forEach(op => {
        pro += op.expenses.pro.items.reduce((acc, i) => acc + i.amountTTC, 0);
        personal += op.expenses.personal.items.reduce((acc, i) => acc + i.amount * (i.periodicity === 'monthly' ? 12 : 1), 0);
        socialTax += (op.expenses.social.urssaf + op.expenses.social.ircec) + op.expenses.taxes.incomeTax;
        other += op.expenses.otherItems.reduce((acc, i) => acc + i.amount * (i.periodicity === 'monthly' ? 12 : 1), 0);
    });

    return [
        { name: "Pro", value: pro, fill: "#3b82f6", color: "#3b82f6" },
        { name: "Perso", value: personal, fill: "#f43f5e", color: "#f43f5e" },
        { name: "Social/Impôts", value: socialTax, fill: "#eab308", color: "#eab308" },
        { name: "Autres", value: other, fill: "#a855f7", color: "#a855f7" }
    ].filter(x => x.value > 0);
};

const COLORS = [
    "#3b82f6", // blue-500
    "#ef4444", // red-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
    "#f97316", // orange-500
    "#6366f1", // indigo-500
];

export const getDetailedExpenseDistribution = (
    op: Operation,
    monthFilter: Month | "all",
    type: "pro" | "personal"
) => {
    // Extract actual items
    const items = type === "pro" ? op.expenses.pro.items : op.expenses.personal.items;

    return items.map((item, index) => {
        const color = COLORS[index % COLORS.length];
        return {
            name: item.label,
            value: monthFilter === "all" ?
                (item.periodicity === 'monthly' ? ('amountTTC' in item ? item.amountTTC : item.amount) * 12 : ('amountTTC' in item ? item.amountTTC : item.amount)) :
                (item.periodicity === 'yearly' ? ('amountTTC' in item ? item.amountTTC : item.amount) / 12 : ('amountTTC' in item ? item.amountTTC : item.amount)),
            fill: color,
            color: color
        }
    }).filter(i => i.value > 0);
};

export const getMultiYearDetailedExpenseDistribution = (
    operations: Operation[],
    type: "pro" | "personal"
) => {
    const map = new Map<string, number>();

    operations.forEach(op => {
        const dist = getDetailedExpenseDistribution(op, "all", type);
        dist.forEach(d => {
            const current = map.get(d.name) || 0;
            map.set(d.name, current + d.value);
        });
    });

    return Array.from(map.entries()).map(([name, value], index) => {
        const color = COLORS[index % COLORS.length];
        return { name, value, fill: color, color: color };
    });
};


export const getIncomeDistributionFromOp = (op: Operation, monthFilter: Month | "all") => {
    let salary = 0;
    let other = 0;

    if (monthFilter === "all") {
        salary = Object.values(op.income.salaryTTCByMonth).reduce((acc, val) => acc + val, 0);
        other = op.income.otherIncomeTTC;
    } else {
        salary = op.income.salaryTTCByMonth[monthFilter] || 0;
        // other income distribution logic same as above
        if (op.income.otherIncomeSelectedMonths.includes(monthFilter)) {
            other = op.income.otherIncomeTTC / op.income.otherIncomeSelectedMonths.length;
        }
    }

    return [
        { name: "Salaires / Factures", value: salary, fill: "#10b981", color: "#10b981" },
        { name: "Autres", value: other, fill: "#6366f1", color: "#6366f1" }
    ];
};

export const getMultiYearIncomeDistribution = (operations: Operation[]) => {
    let totalSalary = 0;
    let totalOther = 0;

    operations.forEach(op => {
        const d = getIncomeDistributionFromOp(op, "all");
        totalSalary += d[0].value;
        totalOther += d[1].value;
    });

    return [
        { name: "Salaires / Factures", value: totalSalary, fill: "#10b981", color: "#10b981" },
        { name: "Autres", value: totalOther, fill: "#6366f1", color: "#6366f1" }
    ];
};

export const getMultiYearChartData = (operations: Operation[]) => {
    return operations.sort((a, b) => a.year - b.year).map(op => {
        const t = computeFilteredTotals(op, "all");
        return {
            name: op.year.toString(),
            "Entrées TTC": t.incomeTTC,
            "Sorties Réelles": t.realTreasuryOutflow,
            "Surplus": t.incomeTTC - t.realTreasuryOutflow
        };
    });
};
