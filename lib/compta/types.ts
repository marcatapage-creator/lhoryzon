import { z } from "zod";

export type MoneyCents = number;
export type RateBps = number; // Basis points: 1% = 100 bps

export const MonthSchema = z.enum([
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]);

export const PeriodicitySchema = z.enum(["monthly", "quarterly", "yearly"]);
export type Periodicity = z.infer<typeof PeriodicitySchema>;

export type Month = z.infer<typeof MonthSchema>;

export const MONTHS: Month[] = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const ProExpenseItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  amount_ttc_cents: z.number().int().min(0).default(0),
  category: z.enum(["pro", "social", "tax", "vat"]).default("pro"),
  vatRate_bps: z.number().int().min(0).default(2000),
  periodicity: PeriodicitySchema.default("yearly"),
});

export type ProExpenseItem = z.infer<typeof ProExpenseItemSchema>;

export const PersonalExpenseItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  amount_cents: z.number().int().min(0).default(0),
  category: z.enum(["personal", "btc", "per"]).default("personal"),
  periodicity: PeriodicitySchema.default("yearly"),
});

export type PersonalExpenseItem = z.infer<typeof PersonalExpenseItemSchema>;

export const OtherExpenseItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  amount_cents: z.number().int().min(0).default(0),
  category: z.enum(["other", "btc", "per"]).default("other"),
  periodicity: PeriodicitySchema.default("yearly"),
  durationMonths: z.number().min(1).max(12).default(1),
  selectedMonths: z.array(MonthSchema).default([]),
});

export type OtherExpenseItem = z.infer<typeof OtherExpenseItemSchema>;

export const IncomeItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  amount_ttc_cents: z.number().int().min(0).default(0),
  vatRate_bps: z.number().int().min(0).default(2000),
  periodicity: PeriodicitySchema.default("monthly"),
  type: z.enum(["salary", "dividend", "other", "bonus"]).default("salary"),
});

export type IncomeItem = z.infer<typeof IncomeItemSchema>;

export const OperationSchema = z.object({
  id: z.string(),
  year: z.number().int().min(2000).max(2100),
  isScenario: z.boolean().default(false),
  scenarioName: z.string().optional(),
  cashCurrent_cents: z.number().int().min(0).default(0),
  // VAT Modeling
  vatPaymentFrequency: PeriodicitySchema.default("yearly"),
  vatCarryover_cents: z.number().int().default(0),

  income: z.object({
    salaryTTCByMonth: z.record(MonthSchema, z.number().int().min(0)).default({
      Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
      Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
    }),
    otherIncomeTTC_cents: z.number().int().min(0).default(0),
    otherIncomeVATRate_bps: z.number().int().min(0).default(0),
    otherIncomeSelectedMonths: z.array(MonthSchema).default([]),
    items: z.array(IncomeItemSchema).default([]),
  }),
  expenses: z.object({
    pro: z.object({
      totalOverrideTTC_cents: z.number().int().min(0).nullable().optional(),
      items: z.array(ProExpenseItemSchema).default([]),
    }),
    social: z.object({
      urssaf_cents: z.number().int().min(0).default(0),
      urssafPeriodicity: PeriodicitySchema.default("yearly"),
      urssafByMonth: z.record(MonthSchema, z.number().int().min(0)).optional(),
      ircec_cents: z.number().int().min(0).default(0),
      ircecPeriodicity: PeriodicitySchema.default("yearly"),
      ircecByMonth: z.record(MonthSchema, z.number().int().min(0)).optional(),
    }),
    taxes: z.object({
      incomeTax_cents: z.number().int().min(0).default(0),
      incomeTaxPeriodicity: PeriodicitySchema.default("yearly"),
      incomeTaxByMonth: z.record(MonthSchema, z.number().int().min(0)).optional(),
    }),
    personal: z.object({
      items: z.array(PersonalExpenseItemSchema).default([]),
    }),
    otherItems: z.array(OtherExpenseItemSchema).default([]),
  }),
  meta: z.object({
    version: z.number().default(2),
    engineVersion: z.string().optional(),
    fiscalHash: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
});

export type Operation = z.infer<typeof OperationSchema>;

export interface NotificationSettings {
  emailEnabled: boolean;
  negativeProjection: boolean;
  entryReminders: boolean;
  news: boolean;
}

export interface DashboardSettings {
  visibleKpis: string[];
}


export type FiscalStatus = 'micro' | 'ei' | 'url_ir' | 'sas_is';

export interface FiscalProfile {
  status: FiscalStatus;
  vatEnabled: boolean;
  isPro: boolean;
  socialMode?: 'approx' | 'iteratif';

  // SASU Specific
  sasuRemunerationMode?: 'total_charge' | 'net_target';
  sasuRemunerationAmount?: number; // Cents
  sasuDividendesBruts?: number; // Cents
}

export interface ComptaState {
  operations: Operation[];
  isLoading: boolean;
  selectedOperationId: string | null;
  currentDraft: Partial<Operation> | null;
  monthFilter: Month | "all";
  fiscalProfile: FiscalProfile | null; // NEW: Persisted fiscal profile
  dashboardSettings: DashboardSettings;
  notificationSettings: NotificationSettings;
  fetchOperations: () => Promise<void>;
  addOperation: (op: Operation) => Promise<void> | void; // Allow async
  updateOperation: (op: Operation) => Promise<void> | void; // Allow async
  deleteOperation: (id: string) => Promise<void> | void; // Allow async
  duplicateOperation: (id: string) => Promise<void> | void;
  simulateOperation: (id: string) => Promise<void> | void;
  setDraft: (draft: Partial<Operation> | null) => void;
  setOperations: (ops: Operation[]) => void;
  setSelectedOperationId: (id: string | null) => void;
  setMonthFilter: (month: Month | "all") => void;
  setFiscalProfile: (profile: FiscalProfile) => void; // NEW: Setter
  setDashboardSettings: (settings: DashboardSettings) => void;
  setNotificationSettings: (settings: NotificationSettings) => void;
}

export interface RegimeCapability {
  hasVat: boolean;
  hasSocial: boolean;
  hasIncomeTax: boolean;
  hasIs: boolean;
  isCompany: boolean;
}

export interface Totals {
  incomeTTC_cents: MoneyCents;
  realTreasuryOutflow_cents: MoneyCents;
  projectedTreasury_cents: MoneyCents;
  profitHT_cents: MoneyCents;
  totalExpenses_cents: MoneyCents;
  vatNet_cents: MoneyCents;
  socialTotal_cents: MoneyCents;
  taxTotal_cents: MoneyCents;
  btcTotal_cents: MoneyCents;
  perTotal_cents: MoneyCents;
  netPocket_cents: MoneyCents;
  savingsRate_bps: RateBps;
  breakEvenPoint_cents: MoneyCents;
  trace: string[];
  fiscalHash: string; // Deterministic fingerprint of fiscal rules used
  calcStatus: 'fresh' | 'stale' | 'recomputed'; // Status of the calculation vs persisted hash
}

export interface PaymentEvent {
  id: string;
  month: Month;
  label: string;
  amount: number;
  type: 'vat' | 'social' | 'tax' | 'pro' | 'personal' | 'other' | 'btc' | 'per';
  status: 'realized' | 'projected';
}
