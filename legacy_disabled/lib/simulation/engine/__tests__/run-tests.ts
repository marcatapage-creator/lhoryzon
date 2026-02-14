import { IREngine } from "../core/ir_engine";
import { getTaxParams } from "../parameters/tax_params";
import { UserFiscalContext } from "../../types";
import { BNCRegime } from "../regimes/bnc_ir";
import { SASURegime } from "../regimes/sasu_is";

const params2025 = getTaxParams(2025);
const irEngine = new IREngine(params2025);

console.log("🚀 Starting Fiscal Engine Tests...");

// SCENARIO 1: Solo, no children, 50k income
const context1: UserFiscalContext = {
    regime: "BNC_IR",
    anneeFiscale: 2025,
    situationFamiliale: "celibataire",
    nbEnfants: 0,
    gardeAlternee: false,
    revenuImposableFoyer_cents: 50000,
    assujettiTVA: true,
};

const res1 = irEngine.calculateTax(50000, context1);
console.log("\n✅ Test 1: Solo 50k - Expected ~7900€");
console.log(`Result: ${res1.tax_cents}€`);

// SCENARIO 2: Couple, 2 children, 80k income
const context2: UserFiscalContext = {
    regime: "BNC_IR",
    anneeFiscale: 2025,
    situationFamiliale: "couple",
    nbEnfants: 2,
    gardeAlternee: false,
    revenuImposableFoyer_cents: 80000,
    assujettiTVA: true,
};

const res2 = irEngine.calculateTax(80000, context2);
console.log("\n✅ Test 2: Couple 2 children 80k - Expected reduced tax due to 3 parts");
console.log(`Result: ${res2.tax_cents}€`);

// SCENARIO 3: BNC Purchase simulation
const bnc = new BNCRegime(context1);
const purchase = {
    id: "p1",
    label: "MacBook",
    amountTTC_cents: 200000,
    vatRate_bps: 2000,
    isAmortizable: true,
    amortizationPeriodYears: 3,
    category: "hardware" as const
};

const simBNC = bnc.simulate(purchase, context1);
console.log("\n✅ Test 3: BNC Purchase 2400€ TTC");
console.log(`TVA: ${simBNC.tvaRecuperee_cents}€`);
console.log(`Eco IR: ${simBNC.economieIR_cents}€`);
console.log(`Eco Social: ${simBNC.economieCotisations_cents}€`);
console.log(`Coût Réel: ${simBNC.coutReel_cents}€`);

// SCENARIO 4: SASU Purchase simulation
const sasu = new SASURegime();
const simSASU = sasu.simulate(purchase, context1);
console.log("\n✅ Test 4: SASU Purchase 2400€ TTC");
console.log(`TVA: ${simSASU.tvaRecuperee_cents}€`);
console.log(`Eco IS: ${simSASU.economieIS_cents}€`);
console.log(`Coût Réel: ${simSASU.coutReel_cents}€`);

console.log("\n🏁 All tests completed.");
