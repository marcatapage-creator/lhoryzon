import { Operation, FiscalSnapshot, AppEntry, Month, MONTHS, Periodicity } from "@/core/fiscal-v2/domain/types";
import { z } from "zod";

export type { Operation, FiscalSnapshot, AppEntry, Month, Periodicity };
export { MONTHS };

// Unified OperationSchema from core/fiscal-v2
import { OperationSchema as CoreSchema } from "@/core/fiscal-v2/domain/types";
export const OperationSchema = CoreSchema;

export interface NotificationSettings {
  emailEnabled: boolean;
  negativeProjection: boolean;
  entryReminders: boolean;
  news: boolean;
}

export interface DashboardSettings {
  visibleKpis: string[];
}

export type FiscalStatus = 'artist_author' | 'freelance' | 'sasu';

export interface FiscalProfile {
  status: FiscalStatus;
  vatEnabled: boolean;
  isPro: boolean;
}

export interface DashboardViewState {
  periodType: 'month' | 'quarter' | 'year';
  selectedPeriod: string; // "Jan", "Q1", "2026"
  scope: 'pro' | 'perso' | 'all';
}

export interface ComptaState {
  operations: Operation[];
  isLoading: boolean;
  selectedOperationId: string | null;
  currentDraft: Partial<Operation> | null;
  monthFilter: Month | "all";
  fiscalProfile: FiscalProfile | null;
  dashboardSettings: DashboardSettings;
  notificationSettings: NotificationSettings;
  viewState: DashboardViewState;
  snapshot: FiscalSnapshot | null;
  refreshSnapshot: () => void;
  fetchOperations: () => Promise<void>;
  addOperation: (op: Operation) => Promise<void> | void;
  updateOperation: (op: Operation) => Promise<void> | void;
  deleteOperation: (id: string) => Promise<void> | void;
  duplicateOperation: (id: string) => Promise<void> | void;
  simulateOperation: (id: string) => Promise<void> | void;
  setDraft: (draft: Partial<Operation> | null) => void;
  setOperations: (ops: Operation[]) => void;
  setSelectedOperationId: (id: string | null) => void;
  setMonthFilter: (month: Month | "all") => void;
  setFiscalProfile: (profile: FiscalProfile) => void;
  setDashboardSettings: (settings: DashboardSettings) => void;
  setNotificationSettings: (settings: NotificationSettings) => void;
  setViewState: (view: Partial<DashboardViewState>) => void;
}

export interface PaymentEvent {
  id: string;
  month: Month;
  label: string;
  amount: number;
  type: 'vat' | 'social' | 'tax' | 'pro' | 'personal' | 'other' | 'income';
  status: 'realized' | 'projected';
}
