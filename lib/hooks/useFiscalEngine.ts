import { useMemo } from 'react';
import { useComptaStore } from '@/store/comptaStore';
import { ComptaState, Operation, IncomeItem, ProExpenseItem } from '../compta/types';
import { getFiscalProfile, FiscalProfileCode } from '@/core/fiscalEngine/factory';
import { SimulationInput, MONTHS } from '@/core/fiscalEngine/index';

// Helper to map store data to SimulationInput
function mapStoreToInput(store: Pick<ComptaState, 'fiscalProfile' | 'operations' | 'selectedOperationId'>, year: number): SimulationInput {
    // 1. Find Operation for the requested year
    const op = store.operations.find((o: Operation) => o.id === store.selectedOperationId) ||
        store.operations.find((o: Operation) => o.year === year);

    if (!op) {
        // Fallback Default
        return {
            year: year,
            months: MONTHS,
            ca_facture_ttc: 0,
            ca_encaisse_ttc: 0,
            charges_deductibles_ht: 0,
            charges_non_deductibles_ttc: 0,
            tva_collectee_reelle: 0,
            tva_deductible_reelle: 0,
            acomptes_urssaf_payes: 0,
            regularisation_urssaf_n_1: 0,
            nb_parts_fiscales: 1, // Default as store doesn't track it yet
            personne_a_charge: 0,
            autres_revenus_foyer: 0,
            prelevement_source_paye: 0
        };
    }

    // 2. Aggregate Data (Cash Basis)
    // Income
    // salaryTTCByMonth is likely "Encaissement" in this app context
    const salarySum = Object.values(op.income.salaryTTCByMonth || {}).reduce((a: number, b: unknown) => a + (b as number), 0);
    const otherIncome = op.income.otherIncomeTTC_cents || 0;
    // Manual items
    const manualIncome = (op.income.items || []).reduce((acc: number, item: IncomeItem) => {
        const mult = item.periodicity === 'monthly' ? 12 : item.periodicity === 'quarterly' ? 4 : 1;
        return acc + (item.amount_ttc_cents * mult);
    }, 0);

    const CA_TTC = salarySum + otherIncome + manualIncome;

    // Expenses
    // Pro items
    const proSum = (op.expenses.pro.items || []).reduce((acc: number, item: ProExpenseItem) => {
        const mult = item.periodicity === 'monthly' ? 12 : item.periodicity === 'quarterly' ? 4 : 1;
        return acc + (item.amount_ttc_cents * mult);
    }, 0);
    const proOverride = op.expenses.pro.totalOverrideTTC_cents ? Number(op.expenses.pro.totalOverrideTTC_cents) : proSum;

    // Deductible usually implies HT for BNC Reel, but for Micro it's ignored (Standard Abattement).
    // Let's assume proOverride is TTC. 
    // Approx HT = TTC / 1.2 ? No, let's keep it clean.
    // In strict accounting, we would sum HT values. 
    // For MVP simulator, we assume Pro Expenses are mostly deductible.
    const Charges_Deductibles_HT = proOverride / 1.2; // Crude approx if data is TTC

    // Social & Tax Paid Context
    // Urssaf Paid so far?
    // We can look at `op.expenses.social.urssafByMonth` sum
    const urssafPaid = Object.values(op.expenses.social.urssafByMonth || {}).reduce((a: number, b: unknown) => a + (b as number), 0);
    const irPaid = Object.values(op.expenses.taxes.incomeTaxByMonth || {}).reduce((a: number, b: unknown) => a + (b as number), 0);

    return {
        year: op.year,
        months: MONTHS,

        ca_facture_ttc: CA_TTC, // Assuming Facturé ~ Encaissé for simple sim
        ca_encaisse_ttc: CA_TTC,

        charges_deductibles_ht: Charges_Deductibles_HT,
        charges_non_deductibles_ttc: 0, // Not tracked in simple store yet

        tva_collectee_reelle: undefined, // Let engine compute
        tva_deductible_reelle: undefined, // Let engine compute from charges

        acomptes_urssaf_payes: urssafPaid, // What has been paid in the UI
        regularisation_urssaf_n_1: 0,

        nb_parts_fiscales: 1, // Default to 1
        personne_a_charge: 0,
        autres_revenus_foyer: 0, // Todo: Add to user settings
        prelevement_source_paye: irPaid
    };
}


export function useFiscalEngine(simulationParams?: {
    additionalExpense?: { amount_ttc: number, vat_rate: number, is_deductible: boolean },
    socialMode?: 'approx' | 'iteratif',
    sasuOverrides?: {
        remunerationMode?: 'total_charge' | 'net_target',
        remunerationAmount?: number,
        dividendesBruts?: number
    }
}) {
    const { fiscalProfile, operations, selectedOperationId } = useComptaStore();

    // Determine current fiscal config
    const profileCode: FiscalProfileCode = getProfileCodeFromStore(fiscalProfile?.status);
    const profile = getFiscalProfile(profileCode);

    const simulation = useMemo(() => {
        // 1. Get Base Data (Current Year Context)
        const baseInput = mapStoreToInput({ fiscalProfile, operations, selectedOperationId }, 2026);

        // Apply Store preference or Parameter override
        const activeSocialMode = simulationParams?.socialMode || fiscalProfile?.socialMode || 'approx';
        baseInput.mode_assiette_sociale = activeSocialMode;

        // SASU Mapping
        baseInput.remuneration_mode = fiscalProfile?.sasuRemunerationMode || 'total_charge';
        baseInput.remuneration_amount = fiscalProfile?.sasuRemunerationAmount || 0;
        baseInput.dividendes_bruts = fiscalProfile?.sasuDividendesBruts || 0;

        // Handle overrides via simulationParams if we add them later for "Arbitrage" distinct from Store
        if (simulationParams?.sasuOverrides) {
            if (simulationParams.sasuOverrides.remunerationMode) baseInput.remuneration_mode = simulationParams.sasuOverrides.remunerationMode;
            if (simulationParams.sasuOverrides.remunerationAmount !== undefined) baseInput.remuneration_amount = simulationParams.sasuOverrides.remunerationAmount;
            if (simulationParams.sasuOverrides.dividendesBruts !== undefined) baseInput.dividendes_bruts = simulationParams.sasuOverrides.dividendesBruts;
        }

        // 2. Apply Simulation Params (e.g. New Purchase)
        const simulatedInput = { ...baseInput };
        if (simulationParams?.additionalExpense) {
            const exp = simulationParams.additionalExpense;
            // Add to charges
            // If deductible, add to HT (approx subtract VAT)
            if (exp.is_deductible) {
                const vatAmount = exp.amount_ttc * (exp.vat_rate / (10000 + exp.vat_rate)); // bps
                simulatedInput.charges_deductibles_ht += (exp.amount_ttc - vatAmount);
            } else {
                simulatedInput.charges_non_deductibles_ttc += exp.amount_ttc;
            }
        }

        // 3. Run Engine
        const revenue = profile.computeRevenue(simulatedInput);
        const charges = profile.computeCharges(simulatedInput);
        const social = profile.computeSocial(simulatedInput, revenue);
        const tax = profile.computeTax(simulatedInput, revenue, social);
        const vat = profile.computeVat(simulatedInput);
        const forecast = profile.computeForecast(simulatedInput, revenue, social, tax, vat);

        // 4. Calculate Differential (Cost of Purchase)
        // If we want "Real Cost", we compare Base vs Simulated.
        // Let's Run Base first.
        const baseRevenue = profile.computeRevenue(baseInput);
        // const baseCharges = profile.computeCharges(baseInput);
        const baseSocial = profile.computeSocial(baseInput, baseRevenue);
        const baseTax = profile.computeTax(baseInput, baseRevenue, baseSocial);
        const baseVat = profile.computeVat(baseInput);
        const baseForecast = profile.computeForecast(baseInput, baseRevenue, baseSocial, baseTax, baseVat);

        const deltaPocket = baseForecast.restant_a_vivre_annuel - forecast.restant_a_vivre_annuel;
        // deltaPocket is "How much less money I have at the end". This is the "Real Cost".

        return {
            base: { revenue, charges, social, tax, vat, forecast },
            simulated: { revenue, charges, social, tax, vat, forecast },
            delta: {
                realCost: deltaPocket,
                savedVat: vat.tva_deductible - baseVat.tva_deductible,
                savedTax: baseTax.impot_revenu_total - tax.impot_revenu_total,
                savedSocial: baseSocial.cotisations_totales - social.cotisations_totales
            }
        };

    }, [profile, fiscalProfile, operations, selectedOperationId, simulationParams]);

    return {
        profile,
        simulation,
        isLoading: false
    };
}

function getProfileCodeFromStore(status?: string): FiscalProfileCode {
    if (!status) return 'MICRO_BNC';
    if (status.includes('micro')) return 'MICRO_BNC';
    if (status.includes('ei')) return 'EI_REEL';
    if (status.includes('sas')) return 'SASU_IS';
    if (status.includes('url')) return 'EURL_IS'; // Approximation
    return 'MICRO_BNC';
}
