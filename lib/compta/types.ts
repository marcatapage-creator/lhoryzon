import { z } from "zod";

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
  amountTTC: z.number().min(0, "Amount must be positive"),
  vatRate: z.number().min(0).default(20),
  periodicity: PeriodicitySchema.default("yearly"),
});

export type ProExpenseItem = z.infer<typeof ProExpenseItemSchema>;

export const PersonalExpenseItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  amount: z.number().min(0, "Amount must be positive"),
  periodicity: PeriodicitySchema.default("yearly"),
});

export type PersonalExpenseItem = z.infer<typeof PersonalExpenseItemSchema>;

export const OtherExpenseItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  amount: z.number().min(0, "Amount must be positive"),
  periodicity: PeriodicitySchema.default("yearly"),
  durationMonths: z.number().min(1).max(12).default(1),
  selectedMonths: z.array(MonthSchema).default([]),
});

export type OtherExpenseItem = z.infer<typeof OtherExpenseItemSchema>;

export const OperationSchema = z.object({
  id: z.string(),
  year: z.number().min(2000).max(2100),
  cashCurrent: z.number().min(0).default(0),
  income: z.object({
    salaryTTCByMonth: z.record(MonthSchema, z.number().min(0)).default({
      Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
      Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
    }),
    otherIncomeTTC: z.number().min(0).default(0),
    otherIncomeVATRate: z.number().min(0).default(0),
    otherIncomeSelectedMonths: z.array(MonthSchema).default([]),
  }),
  expenses: z.object({
    pro: z.object({
      totalOverrideTTC: z.number().min(0).nullable().optional(),
      items: z.array(ProExpenseItemSchema).default([]),
    }),
    social: z.object({
      urssaf: z.number().min(0).default(0),
      urssafPeriodicity: PeriodicitySchema.default("yearly"),
      urssafByMonth: z.record(MonthSchema, z.number().min(0)).optional(),
      ircec: z.number().min(0).default(0),
      ircecPeriodicity: PeriodicitySchema.default("yearly"),
      ircecByMonth: z.record(MonthSchema, z.number().min(0)).optional(),
    }),
    taxes: z.object({
      incomeTax: z.number().min(0).default(0),
      incomeTaxPeriodicity: PeriodicitySchema.default("yearly"),
      incomeTaxByMonth: z.record(MonthSchema, z.number().min(0)).optional(),
    }),
    personal: z.object({
      items: z.array(PersonalExpenseItemSchema).default([]),
    }),
    otherItems: z.array(OtherExpenseItemSchema).default([]),
  }),
  meta: z.object({
    version: z.number().default(1),
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
}

export interface ComptaState {
  operations: Operation[];
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
  duplicateOperation: (id: string) => void;
  setDraft: (draft: Partial<Operation> | null) => void;
  setOperations: (ops: Operation[]) => void;
  setSelectedOperationId: (id: string | null) => void;
  setMonthFilter: (month: Month | "all") => void;
  setFiscalProfile: (profile: FiscalProfile) => void; // NEW: Setter
  setDashboardSettings: (settings: DashboardSettings) => void;
  setNotificationSettings: (settings: NotificationSettings) => void;
}
