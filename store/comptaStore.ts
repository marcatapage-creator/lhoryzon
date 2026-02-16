import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Operation, FiscalContext, TreasuryAnchor, AppEntry } from '@/core/fiscal-v2/domain/types';
import { computeFiscalSnapshot } from '@/core/fiscal-v2';
import { getOperations, saveOperation, deleteOperation as deleteOperationAction } from '@/app/actions/compta';
import { FiscalProfile, DashboardViewState, ComptaState } from '../lib/compta/types';

export type { DashboardViewState };

const DRAFT_KEY = 'compta_draft_v1';



// Helper to get month index string
const monthMapping: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
    'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};
const monthIndex = (m: string): string => monthMapping[m] || '01';

// Helper to get draft from localStorage
const getDraftFromStorage = () => {
    if (typeof window === 'undefined') return null;
    const draft = localStorage.getItem(DRAFT_KEY);
    return draft ? JSON.parse(draft) : null;
};

// Helper to save draft to localStorage
const saveDraftToStorage = (draft: Partial<Operation> | null) => {
    if (typeof window === 'undefined') return;
    if (draft) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } else {
        localStorage.removeItem(DRAFT_KEY);
    }
};

export const useComptaStore = create<ComptaState>()(
    persist(
        (set, get) => ({
            operations: [],
            isLoading: false,
            selectedOperationId: null,
            monthFilter: "all",
            currentDraft: getDraftFromStorage(),
            fiscalProfile: null,
            snapshot: null,
            dashboardSettings: {
                visibleKpis: [
                    "netPocket", "nextDeadline", "qontoBalance", "projectedTreasury",
                    "totalProvision", "incomeTTC", "realTreasuryOutflow", "btcTotal",
                    "perTotal", "breakEvenPoint", "savingsRate"
                ]
            },
            notificationSettings: {
                emailEnabled: true,
                negativeProjection: true,
                entryReminders: true,
                news: true,
            },
            viewState: {
                periodType: 'year',
                selectedPeriod: '2026',
                scope: 'all'
            },

            fetchOperations: async () => {
                set({ isLoading: true });
                try {
                    const ops = await getOperations();
                    set({ operations: ops, isLoading: false });

                    if (ops.length > 0) {
                        // Ensure selectedId is valid
                        const currentId = get().selectedOperationId;
                        if (!currentId || !ops.find(o => o.id === currentId)) {
                            // Select most recent
                            const sorted = [...ops].sort((a, b) => b.year - a.year);
                            set({ selectedOperationId: sorted[0].id });
                        }
                    } else {
                        set({ selectedOperationId: null });
                    }
                } catch (e) {
                    console.error("Failed to fetch operations", e);
                    set({ isLoading: false });
                }
            },

            addOperation: async (op) => {
                set((state) => ({
                    operations: [...state.operations, op],
                    currentDraft: null
                }));
                saveDraftToStorage(null);
                try {
                    await saveOperation(op);
                    get().refreshSnapshot();
                } catch (e) {
                    console.error("Failed to save operation", e);
                }
            },

            updateOperation: async (op) => {
                set((state) => ({
                    operations: state.operations.map(o => o.id === op.id ? op : o),
                    currentDraft: null
                }));
                saveDraftToStorage(null);
                try {
                    await saveOperation(op);
                    get().refreshSnapshot();
                } catch (e) {
                    console.error("Failed to update operation", e);
                }
            },

            deleteOperation: async (id) => {
                const op = get().operations.find(o => o.id === id);
                set((state) => ({
                    operations: state.operations.filter(o => o.id !== id),
                    selectedOperationId: state.selectedOperationId === id ? null : state.selectedOperationId
                }));

                if (op) {
                    try {
                        await deleteOperationAction(op.year);
                    } catch (e) {
                        console.error("Failed to delete operation", e);
                    }
                }
            },

            duplicateOperation: async (id) => {
                const op = get().operations.find(o => o.id === id);
                if (op) {
                    const newOp: Operation = {
                        ...op,
                        id: `${op.year}-${Date.now()}`,
                        entries: [...op.entries],
                        meta: {
                            ...op.meta,
                            updatedAt: new Date().toISOString(),
                        }
                    };
                    set((state) => ({ operations: [...state.operations, newOp] }));
                    try {
                        await saveOperation(newOp);
                    } catch (e) {
                        console.error("Failed to save duplicated operation", e);
                    }
                }
            },

            simulateOperation: async (id) => {
                const op = get().operations.find(o => o.id === id);
                if (op) {
                    const newOp: Operation = {
                        ...op,
                        id: `sim-${Date.now()}`,
                        isScenario: true,
                        scenarioName: `Simulation de ${op.year}`,
                        entries: [...op.entries],
                        meta: {
                            ...op.meta,
                            updatedAt: new Date().toISOString(),
                        }
                    };
                    set((state) => ({ operations: [...state.operations, newOp] }));
                    try {
                        await saveOperation(newOp);
                    } catch (e) {
                        console.error("Failed to save simulation", e);
                    }
                }
            },

            setDraft: (draft) => {
                set({ currentDraft: draft });
                saveDraftToStorage(draft);
            },

            setOperations: (ops) => set({ operations: ops }),

            setSelectedOperationId: (id) => {
                set({ selectedOperationId: id });
                get().refreshSnapshot();
            },

            setMonthFilter: (month) => {
                set({ monthFilter: month });
                get().refreshSnapshot();
            },

            updateFiscalProfile: (profile: Partial<FiscalProfile>) => set((state) => ({ fiscalProfile: state.fiscalProfile ? { ...state.fiscalProfile, ...profile } : profile as FiscalProfile })),
            setFiscalProfile: (profile: FiscalProfile) => set({ fiscalProfile: profile }),

            setDashboardSettings: (settings) => set({ dashboardSettings: settings }),

            setNotificationSettings: (settings) => set({ notificationSettings: settings }),

            setViewState: (view) => {
                set((state) => ({ viewState: { ...state.viewState, ...view } }));
                get().refreshSnapshot();
            },

            refreshSnapshot: (nowOverride?: string) => {
                const { operations, selectedOperationId, fiscalProfile } = get();
                if (!operations.length || !fiscalProfile) return;

                const currentOp = operations.find(o => o.id === selectedOperationId) ||
                    operations.find(o => o.year === 2026);
                if (!currentOp) return;

                // 1. Map Profile to Context
                const context: FiscalContext = {
                    taxYear: currentOp.year,
                    now: nowOverride || new Date().toISOString(),
                    // [HOTFIX V2.5] MVP supports only Artist/MNC fully. Force artist_author for others to show taxes.
                    userStatus: fiscalProfile.status.includes('sas') ? 'sasu' : 'artist_author',

                    fiscalRegime: fiscalProfile.status.includes('micro') ? 'micro' : 'reel',
                    vatRegime: fiscalProfile.vatEnabled ? (currentOp.vatPaymentFrequency === 'monthly' ? 'reel_mensuel' : 'reel_trimestriel') : 'franchise',
                    household: { parts: 1, children: 0 }, // Simplified
                    options: {
                        estimateMode: true,
                        vatPaymentFrequency: currentOp.vatPaymentFrequency === 'monthly' ? 'monthly' : 'yearly',
                        defaultVatRate: fiscalProfile.vatEnabled ? 2000 : 0
                    }
                };

                // 2. Resolve Anchor
                const anchor: TreasuryAnchor = {
                    amount_cents: currentOp.cashCurrent_cents || 0,
                    monthIndex: currentOp.year === new Date().getFullYear() ? new Date().getMonth() : -1
                };

                // 3. Compute
                try {
                    const snapshot = computeFiscalSnapshot(operations.filter(o => o.year === currentOp.year), context, anchor);
                    set({ snapshot });
                } catch (err) {
                    console.error("[comptaStore] Failed to refresh snapshot:", err);
                }
            },
        }),
        {
            name: 'compta_v3',
            storage: createJSONStorage(() => {
                // Client-side only storage wrapper
                return {
                    getItem: (name) => typeof window !== 'undefined' ? localStorage.getItem(name) : null,
                    setItem: (name, value) => typeof window !== 'undefined' ? localStorage.setItem(name, value) : undefined,
                    removeItem: (name) => typeof window !== 'undefined' ? localStorage.removeItem(name) : undefined,
                }
            }),
            onRehydrateStorage: () => {
                return (state) => {
                    if (state) {
                        // Ensure selection is set (Default to most recent year)
                        if (!state.selectedOperationId && state.operations.length > 0) {
                            const sorted = [...state.operations].sort((a, b) => b.year - a.year);
                            state.selectedOperationId = sorted[0].id;
                        }

                        // Migration: Operation v2 -> v3
                        state.operations = state.operations.map(op => {
                            if (!op.meta || op.meta.version < 3) {
                                // Safe access to legacy properties
                                const oldOp = op as Record<string, unknown>;
                                const entries: AppEntry[] = [];

                                // 1. Salary
                                const income = oldOp.income as Record<string, unknown> | undefined;
                                const legacySalary = income?.salaryTTCByMonth as Record<string, unknown> | undefined;

                                if (legacySalary && typeof legacySalary === 'object') {
                                    Object.entries(legacySalary).forEach(([month, amount]) => {
                                        const amountNum = Number(amount);
                                        if (amountNum > 0) {
                                            entries.push({
                                                id: `${op.id}-mig-sal-${month}`,
                                                nature: 'INCOME',
                                                label: `Revenu Artistique (${month})`,
                                                amount_ttc_cents: amountNum,
                                                vatRate_bps: 0,
                                                date: `${op.year}-${monthIndex(month)}-15`,
                                                scope: 'pro',
                                                category: 'REVENU_ARTISTIQUE',
                                                periodicity: 'yearly'
                                            });
                                        }
                                    });
                                }

                                // 2. Expenses Pro
                                const expenses = oldOp.expenses as Record<string, unknown> | undefined;
                                const pro = expenses?.pro as Record<string, unknown> | undefined;
                                const legacyExpenses = pro?.items;

                                if (Array.isArray(legacyExpenses)) {
                                    legacyExpenses.forEach((item: Record<string, unknown>, idx: number) => {
                                        const per = item.periodicity;
                                        const validPeriodicity: AppEntry['periodicity'] = (per === 'monthly' || per === 'quarterly' || per === 'yearly') ? per : 'yearly';

                                        entries.push({
                                            id: `${op.id}-exp-pro-${idx}`,
                                            nature: 'EXPENSE_PRO',
                                            label: String(item.label || 'Sans libellé'),
                                            amount_ttc_cents: Number(item.amount_ttc_cents || 0),
                                            vatRate_bps: Number(item.vatRate_bps || 0),
                                            date: `${op.year}-01-01`,
                                            scope: 'pro',
                                            category: String(item.category || 'PRO'),
                                            periodicity: validPeriodicity
                                        });
                                    });
                                }

                                // 3. Social
                                const social = (expenses as Record<string, unknown> | undefined)?.social as Record<string, unknown> | undefined;
                                const urssaf_cents = Number(social?.urssaf_cents || 0);
                                if (urssaf_cents > 0) {
                                    const per = social?.urssafPeriodicity;
                                    const validPeriodicity: AppEntry['periodicity'] = (per === 'monthly' || per === 'quarterly' || per === 'yearly') ? per : 'yearly';

                                    entries.push({
                                        id: `${op.id}-mig-urssaf`,
                                        nature: 'TAX_SOCIAL',
                                        label: 'URSSAF (Provision)',
                                        amount_ttc_cents: urssaf_cents,
                                        vatRate_bps: 0,
                                        date: `${op.year}-12-15`,
                                        scope: 'pro',
                                        category: 'URSSAF',
                                        periodicity: validPeriodicity
                                    });
                                }

                                return {
                                    ...op,
                                    entries,
                                    meta: { ...op.meta, version: 3, updatedAt: new Date().toISOString() }
                                };
                            }
                            return op;
                        });
                    }
                };
            },
        }
    )
);
