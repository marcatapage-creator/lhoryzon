import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Operation, ComptaState } from '../lib/compta/types';
import { getOperations, saveOperation, deleteOperation as deleteOperationAction } from '@/app/actions/compta';

const DRAFT_KEY = 'compta_draft_v1';

const SEED_DATA: Operation[] = [
    {
        id: "seed-2024",
        year: 2024,
        cashCurrent: 5000,
        income: {
            salaryTTCByMonth: {
                Jan: 3000, Feb: 3000, Mar: 3000, Apr: 3000, May: 3000, Jun: 3000,
                Jul: 3000, Aug: 3000, Sep: 3000, Oct: 3000, Nov: 3000, Dec: 3000,
            },
            otherIncomeTTC: 1200,
            otherIncomeVATRate: 0,
            otherIncomeSelectedMonths: [],
        },
        expenses: {
            pro: {
                items: [
                    { id: "p1", label: "Software Subscriptions", amountTTC: 50, vatRate: 20, periodicity: "yearly" },
                    { id: "p2", label: "Rent Coworking", amountTTC: 300, vatRate: 20, periodicity: "yearly" },
                ],
            },
            social: {
                urssaf: 4000,
                urssafPeriodicity: "yearly",
                ircec: 500,
                ircecPeriodicity: "yearly",
            },
            taxes: {
                incomeTax: 2000,
                incomeTaxPeriodicity: "yearly",
            },
            personal: {
                items: [
                    { id: "pers1", label: "Rent", amount: 1200, periodicity: "monthly" },
                    { id: "pers2", label: "Food", amount: 400, periodicity: "monthly" },
                ],
            },
            otherItems: [],
        },
        meta: { version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    },
    {
        id: "seed-2025",
        year: 2025,
        cashCurrent: 12000,
        income: {
            salaryTTCByMonth: {
                Jan: 4000, Feb: 4000, Mar: 0, Apr: 0, May: 0, Jun: 0,
                Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0,
            },
            otherIncomeTTC: 0,
            otherIncomeVATRate: 0,
            otherIncomeSelectedMonths: [],
        },
        expenses: {
            pro: {
                items: [
                    { id: "p1", label: "Hardware", amountTTC: 1500, vatRate: 20, periodicity: "yearly" },
                ],
            },
            social: {
                urssaf: 1000,
                urssafPeriodicity: "yearly",
                ircec: 100,
                ircecPeriodicity: "yearly",
            },
            taxes: {
                incomeTax: 500,
                incomeTaxPeriodicity: "yearly",
            },
            personal: {
                items: [
                    { id: "pers1", label: "Vacation", amount: 2000, periodicity: "yearly" },
                ],
            },
            otherItems: [],
        },
        meta: { version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    }
];

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
            selectedOperationId: null,
            monthFilter: "all",
            currentDraft: getDraftFromStorage(),
            fiscalProfile: null, // Default
            dashboardSettings: {
                visibleKpis: [
                    "Trésorerie Qonto",
                    "Trésorerie / Mois",
                    "Trésorerie / An",
                    "Trésorerie Totale",
                    "Trésorerie Finale",
                    "Surplus Réel (HT)",
                    "Estimation TVA",
                    "Engagé BTC",
                    "Engagé PER",
                    "Sorties Réelles"
                ]
            },
            notificationSettings: {
                emailEnabled: true,
                negativeProjection: true,
                entryReminders: true,
                news: true,
            },

            fetchOperations: async () => {
                try {
                    const ops = await getOperations();
                    if (ops.length > 0) {
                        set({ operations: ops });
                        // Ensure selectedId is valid
                        const currentId = get().selectedOperationId;
                        if (!currentId || !ops.find(o => o.id === currentId)) {
                            // Select most recent
                            const sorted = [...ops].sort((a, b) => b.year - a.year);
                            set({ selectedOperationId: sorted[0].id });
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch operations", e);
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

            duplicateOperation: (id) => {
                const op = get().operations.find(o => o.id === id);
                if (op) {
                    const newOp: Operation = {
                        ...op,
                        id: `copy-${Date.now()}`,
                        meta: {
                            ...op.meta,
                            updatedAt: new Date().toISOString(),
                        }
                    };
                    set((state) => ({ operations: [...state.operations, newOp] }));
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
                        // 1. Initialize data if empty
                        if (!state.operations || state.operations.length === 0) {
                            state.operations = SEED_DATA;
                        }
                        // 2. Ensure selection is set (Default to most recent year)
                        if (!state.selectedOperationId && state.operations.length > 0) {
                            const sorted = [...state.operations].sort((a, b) => b.year - a.year);
                            state.selectedOperationId = sorted[0].id;
                        }
                    }
                };
            },
        }
    )
);
