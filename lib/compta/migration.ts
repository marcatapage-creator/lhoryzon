/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Operation, MONTHS } from "./types";

/**
 * Robustly migrates any operation data (legacy or current) 
 * into the latest strict schema format.
 */
export function migrateOperation(data: any): any {
    if (!data) return data;

    // Helper to ensure we get a valid integer, never NaN or null
    const safeInt = (val: any, fallback = 0): number => {
        if (val === null || val === undefined) return fallback;
        const num = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(num) ? fallback : Math.round(num);
    };

    // Helper to ensure an object has all MONTHS as keys with safe numeric values
    const normalizeMonthlyGrid = (grid: any): Record<string, number> => {
        const normalized: Record<string, number> = {};
        MONTHS.forEach(m => {
            normalized[m] = safeInt(grid?.[m]);
        });
        return normalized;
    };

    const migrated = { ...data };

    // 1. Root level mapping & rounding
    if (data.cashCurrent !== undefined && data.cashCurrent_cents === undefined) {
        migrated.cashCurrent_cents = safeInt(data.cashCurrent * 100);
    } else {
        migrated.cashCurrent_cents = safeInt(data.cashCurrent_cents);
    }

    if (data.vatCarryover !== undefined && data.vatCarryover_cents === undefined) {
        migrated.vatCarryover_cents = safeInt(data.vatCarryover * 100);
    } else {
        migrated.vatCarryover_cents = safeInt(data.vatCarryover_cents);
    }

    // Default other missing roots
    migrated.id = data.id || `op-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    migrated.isScenario = !!data.isScenario;
    migrated.year = safeInt(data.year, new Date().getFullYear());

    // 2. Income migration
    if (!migrated.income || typeof migrated.income !== 'object') {
        migrated.income = {};
    }

    // Salary: could be number (legacy) or object
    let salaryGrid: any = {};
    if (typeof data.income?.salaryTTCByMonth === 'object' && data.income.salaryTTCByMonth !== null) {
        salaryGrid = data.income.salaryTTCByMonth;
    } else if (typeof data.income?.salaryTTCByMonth === 'number') {
        const val = safeInt(data.income.salaryTTCByMonth);
        MONTHS.forEach(m => salaryGrid[m] = val);
    } else if (typeof data.salaryTTCByMonth === 'object' && data.salaryTTCByMonth !== null) {
        salaryGrid = data.salaryTTCByMonth;
    }

    migrated.income.salaryTTCByMonth = normalizeMonthlyGrid(salaryGrid);

    // Other income
    const otherTTC = data.income?.otherIncomeTTC_cents !== undefined ? data.income.otherIncomeTTC_cents :
        (data.income?.otherIncomeTTC !== undefined ? data.income.otherIncomeTTC * 100 :
            (data.otherIncomeTTC !== undefined ? data.otherIncomeTTC * 100 : 0));
    migrated.income.otherIncomeTTC_cents = safeInt(otherTTC);

    const otherVAT = data.income?.otherIncomeVATRate_bps !== undefined ? data.income.otherIncomeVATRate_bps :
        (data.income?.otherIncomeVATRate !== undefined ? data.income.otherIncomeVATRate * 100 :
            (data.otherIncomeVATRate !== undefined ? data.otherIncomeVATRate * 100 : 0));
    migrated.income.otherIncomeVATRate_bps = safeInt(otherVAT);

    migrated.income.otherIncomeSelectedMonths = Array.isArray(data.income?.otherIncomeSelectedMonths) ?
        data.income.otherIncomeSelectedMonths : [];

    // Income items
    const rawIncomeItems = Array.isArray(data.income?.items) ? data.income.items :
        (Array.isArray(data.incomeItems) ? data.incomeItems : []);

    migrated.income.items = rawIncomeItems.map((item: any) => {
        const amount = item.amount_ttc_cents !== undefined ? item.amount_ttc_cents :
            (item.amountTTC !== undefined ? item.amountTTC * 100 : 0);
        const vat = item.vatRate_bps !== undefined ? item.vatRate_bps :
            (item.vatRate !== undefined ? item.vatRate * 100 : 2000);
        return {
            ...item,
            id: item.id || `inc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            amount_ttc_cents: safeInt(amount),
            vatRate_bps: safeInt(vat, 2000),
            type: item.type || 'other'
        };
    });

    // 3. Expenses migration
    if (!migrated.expenses || typeof migrated.expenses !== 'object') {
        migrated.expenses = {};
    }

    // Pro items: Handle if expenses.pro WAS just an array in VERY old versions
    let proStructure = data.expenses?.pro || {};
    if (Array.isArray(data.expenses?.pro)) {
        proStructure = { items: data.expenses.pro };
    }

    const proItems = Array.isArray(proStructure.items) ? proStructure.items : [];
    migrated.expenses.pro = {
        totalOverrideTTC_cents: safeInt(proStructure.totalOverrideTTC_cents, null as any),
        items: proItems.map((item: any) => {
            const amount = item.amount_ttc_cents !== undefined ? item.amount_ttc_cents :
                (item.amountTTC !== undefined ? item.amountTTC * 100 : 0);
            const vat = item.vatRate_bps !== undefined ? item.vatRate_bps :
                (item.vatRate !== undefined ? item.vatRate * 100 : 2000);
            return {
                ...item,
                id: item.id || `pro-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                amount_ttc_cents: safeInt(amount),
                vatRate_bps: safeInt(vat, 2000),
                category: (item.category && ["pro", "social", "tax", "vat"].includes(item.category)) ? item.category : "pro"
            };
        })
    };

    // Social
    const soc = data.expenses?.social || {};
    const urssaf = soc.urssaf_cents !== undefined ? soc.urssaf_cents :
        (soc.urssaf !== undefined ? soc.urssaf * 100 : 0);
    const ircec = soc.ircec_cents !== undefined ? soc.ircec_cents :
        (soc.ircec !== undefined ? soc.ircec * 100 : 0);
    migrated.expenses.social = {
        urssaf_cents: safeInt(urssaf),
        urssafPeriodicity: soc.urssafPeriodicity || 'yearly',
        urssafByMonth: normalizeMonthlyGrid(soc.urssafByMonth),
        ircec_cents: safeInt(ircec),
        ircecPeriodicity: soc.ircecPeriodicity || 'yearly',
        ircecByMonth: normalizeMonthlyGrid(soc.ircecByMonth)
    };

    // Taxes
    const taxes = data.expenses?.taxes || {};
    const incomeTax = taxes.incomeTax_cents !== undefined ? taxes.incomeTax_cents :
        (taxes.incomeTax !== undefined ? taxes.incomeTax * 100 : 0);
    migrated.expenses.taxes = {
        incomeTax_cents: safeInt(incomeTax),
        incomeTaxPeriodicity: taxes.incomeTaxPeriodicity || 'yearly',
        incomeTaxByMonth: normalizeMonthlyGrid(taxes.incomeTaxByMonth)
    };

    // Personal items: Handle if expenses.personal WAS just an array
    let personalStructure = data.expenses?.personal || {};
    if (Array.isArray(data.expenses?.personal)) {
        personalStructure = { items: data.expenses.personal };
    }
    const perItems = Array.isArray(personalStructure.items) ? personalStructure.items : [];
    migrated.expenses.personal = {
        items: perItems.map((item: any) => {
            const amount = item.amount_cents !== undefined ? item.amount_cents :
                (item.amount !== undefined ? item.amount * 100 : 0);
            return {
                ...item,
                id: item.id || `per-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                amount_cents: safeInt(amount),
                category: "personal"
            };
        })
    };

    // Other items
    const rawOtherItems = Array.isArray(data.expenses?.otherItems) ? data.expenses.otherItems : [];
    migrated.expenses.otherItems = rawOtherItems.map((item: any) => {
        const amount = item.amount_cents !== undefined ? item.amount_cents :
            (item.amount !== undefined ? item.amount * 100 : 0);
        return {
            ...item,
            id: item.id || `oth-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            amount_cents: safeInt(amount),
            category: (item.category && ["other", "btc", "per"].includes(item.category)) ? item.category : "other"
        };
    });

    // 4. Meta migration
    migrated.meta = {
        version: 2,
        createdAt: data.meta?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    return migrated;
}
