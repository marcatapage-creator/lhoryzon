import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Operation, ComptaState } from '../lib/compta/types';
import { getOperations, saveOperation, deleteOperation as deleteOperationAction } from '@/app/actions/compta';

const DRAFT_KEY = 'compta_draft_v1';



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
            fiscalProfile: null, // Default
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

            setSelectedOperationId: (id) => set({ selectedOperationId: id }),

            setMonthFilter: (month) => set({ monthFilter: month }),

            setFiscalProfile: (profile) => set({ fiscalProfile: profile }), // NEW

            setDashboardSettings: (settings) => set({ dashboardSettings: settings }),

            setNotificationSettings: (settings) => set({ notificationSettings: settings }),
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

                        // Migration: Map old string IDs to new technical IDs
                        const mapping: Record<string, string> = {
                            "Trésorerie Qonto": "qontoBalance",
                            "Trésorerie / Mois": "projectedTreasury",
                            "Trésorerie / An": "projectedTreasury",
                            "Trésorerie Finale": "projectedTreasury",
                            "Sorties Réelles": "realTreasuryOutflow",
                            "Surplus Réel (HT)": "netPocket",
                            "Estimation TVA": "nextDeadline",
                            "Engagé BTC": "btcTotal",
                            "Engagé PER": "perTotal",
                            "Bénéfice TTC": "netPocket", // Approx mapping
                        };

                        if (state.dashboardSettings?.visibleKpis) {
                            state.dashboardSettings.visibleKpis = state.dashboardSettings.visibleKpis.map(id => mapping[id] || id);

                            // Remove duplicates if any (e.g. from both "Trésorerie / Mois" and "Trésorerie Finale")
                            state.dashboardSettings.visibleKpis = [...new Set(state.dashboardSettings.visibleKpis)];
                        }

                        // Migration: Ensure new KPIs are visible for existing users
                        const newKpis = ["savingsRate", "breakEvenPoint", "incomeTTC"];
                        if (state.dashboardSettings && state.dashboardSettings.visibleKpis) {
                            newKpis.forEach(kpi => {
                                if (!state.dashboardSettings.visibleKpis.includes(kpi)) {
                                    state.dashboardSettings.visibleKpis.push(kpi);
                                }
                            });
                        }
                    }
                };
            },
        }
    )
);
