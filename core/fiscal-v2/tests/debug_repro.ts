
import { computeFiscal } from '../engine/dispatcher';
import { buildFiscalContext } from '../bridge/mapper';
import { Operation } from '@/lib/compta/types';

// Helper to create zero-filled month record
const zeroMonthRecord = () => ({
    Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0,
    Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0
});

// Mock Operation with 150k income
const mockOp: Operation = {
    id: 'test-op',
    year: 2026,
    cashCurrent_cents: 0,
    isScenario: false,
    scenarioName: 'Test',
    isArtistAuthor: true,
    vatPaymentFrequency: 'quarterly',
    vatCarryover_cents: 0,
    income: {
        salaryTTCByMonth: {
            Jan: 1000000,
            Feb: 1000000,
            Mar: 1000000,
            Apr: 1000000,
            May: 1000000,
            Jun: 1000000,
            Jul: 1000000,
            Aug: 1000000,
            Sep: 1000000,
            Oct: 1000000,
            Nov: 1000000,
            Dec: 1000000
        },
        items: [],
        otherIncomeTTC_cents: 3000000,
        otherIncomeSelectedMonths: ['Jun'],
        otherIncomeVATRate_bps: 2000
    },
    expenses: {
        pro: { items: [], totalOverrideTTC_cents: 0 },
        personal: { items: [] },
        social: {
            urssafPeriodicity: 'quarterly',
            urssaf_cents: 0,
            urssafByMonth: zeroMonthRecord(),
            ircecPeriodicity: 'yearly',
            ircec_cents: 0,
            ircecByMonth: zeroMonthRecord(),
        },
        taxes: {
            incomeTaxPeriodicity: 'monthly',
            incomeTax_cents: 0,
            incomeTaxByMonth: zeroMonthRecord()
        },
        otherItems: []
    },
    meta: {
        version: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
};

const profile = {
    identity: {
        legalStatus: 'EI',
        taxRegime: 'BNC',
        vatRegime: 'REAL_SIMPLIFIED'
    },
    accre: {
        enabled: false
    }
};

console.log("Running Fiscal Engine Debug...");

try {
    const context = buildFiscalContext(
        profile as any,
        2026,
        true,
        'quarterly'
    );

    console.log("Context built:", JSON.stringify(context, null, 2));

    const output = computeFiscal([mockOp], context);

    console.log("------------------------------------------------");
    console.log("Fiscal Output Summary:");
    console.log("------------------------------------------------");

    const urssafTotal = output.taxes.urssaf.reduce((acc, t) => acc + t.amount, 0);
    const ircecTotal = output.taxes.ircec.reduce((acc, t) => acc + t.amount, 0);
    const taxTotal = output.taxes.ir.reduce((acc, t) => acc + t.amount, 0);
    const vatTotal = output.bases.vat.balance;

    console.log(`URSSAF Total: ${(urssafTotal / 100).toFixed(2)} €`);
    console.log(`IRCEC Total: ${(ircecTotal / 100).toFixed(2)} €`);
    console.log(`Income Tax Total: ${(taxTotal / 100).toFixed(2)} €`);
    console.log(`VAT Balance: ${(vatTotal / 100).toFixed(2)} €`);

    console.log("------------------------------------------------");
    console.log("Schedule Items:", output.schedule.length);
    output.schedule.forEach(s => {
        console.log(`- ${s.date} [${s.organization}] ${s.label}: ${(s.amount / 100).toFixed(2)}€`);
    });

} catch (err) {
    console.error("Engine Runtime Error:", err);
    console.error(err);
}
