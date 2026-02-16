import { Month, MONTHS } from '@/core/fiscal-v2/domain/types';
export { MONTHS };
export type AllocationRule = 'spread_evenly' | 'due_on_period_end' | 'due_on_specific_months';
export type Periodicity = 'once' | 'monthly' | 'quarterly' | 'yearly';

export interface LedgerMonth {
    month: Month;
    // Operational Flows (Input)
    income_ttc_cents: number;
    expense_perso_ttc_cents: number;
    expense_pro_ttc_cents: number; // Raw outcome from ops
    expense_autre_ttc_cents: number; // Explicit "Other" category

    // VAT (Accrual from Ops)
    vat_collected_cents: number;
    vat_deductible_cents: number;
    vat_due_cents: number; // collected - deductible

    // Tax Flows (Cash Out)
    urssaf_cash_cents: number;
    ircec_cash_cents: number;
    ir_cash_cents: number;
    vat_cash_cents: number; // Net VAT paid
    other_taxes_cash_cents: number;

    // Computed
    net_cashflow_cents: number;
    closing_treasury_cents: number; // To be computed in Treasury step

    // V2: Provision & Debt Tracking
    // These represent the "Liability" side, calculated typically as prorata of revenue or specific events
    provision_social_cents: number;
    provision_tax_cents: number;
    provision_vat_cents: number;
}

export type Ledger = Record<Month, LedgerMonth>;

export interface LedgerOps {
    byMonth: Record<Month, {
        income_ttc: number;
        expense_perso: number;
        expense_pro: number;
        manual_social: number; // Items with category 'social'
        manual_tax: number; // Items with category 'tax'
        vat_collected: number;
        vat_deductible: number;
    }>;
}

export interface LedgerTaxes {
    byMonth: Record<Month, {
        urssaf: number;
        ircec: number;
        ir: number;
        vat_payment: number;
        other_taxes: number;
    }>;
}

export interface LedgerFinal {
    byMonth: Record<Month, LedgerMonth>;
    initialTreasury: number;
    projectedTreasury: number; // End of year or current
    currentYearProvisionSocial_cents?: number;
    currentYearProvisionTax_cents?: number;
    currentYearProvisionVat_cents?: number;
}
