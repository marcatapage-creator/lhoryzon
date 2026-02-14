import { PurchaseItem, UserFiscalContext, SimulationResult } from "../types";
import { BNCRegime } from "./regimes/bnc_ir";
import { SASURegime } from "./regimes/sasu_is";
import { MicroBNCRegime } from "./regimes/micro_bnc";

export class FiscalSimulator {
    public static simulate(purchase: PurchaseItem, context: UserFiscalContext): SimulationResult {
        switch (context.regime) {
            case "BNC_IR":
                return new BNCRegime(context).simulate(purchase, context);
            case "SASU_IS":
                return new SASURegime().simulate(purchase, context);
            case "MICRO_BNC":
                return new MicroBNCRegime().simulate(purchase, context);
            case "EI_IS":
                // For approximation, EI_IS logic is very close to SASU_IS on the IS part
                return new SASURegime().simulate(purchase, context);
            default:
                throw new Error(`Régime non supporté : ${context.regime}`);
        }
    }
}
