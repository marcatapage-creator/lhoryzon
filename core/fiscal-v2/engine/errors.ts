export class FiscalError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "FiscalError";
    }
}

export class RulesetNotFound extends FiscalError {
    constructor(year: number) {
        super("RULESET_NOT_FOUND", `No ruleset found for tax year ${year}`);
    }
}

export class InvalidOperation extends FiscalError {
    constructor(opId: string, reason: string) {
        super("INVALID_OPERATION", `Operation ${opId} is invalid: ${reason}`);
    }
}

export class IncoherentVATAmounts extends InvalidOperation {
    constructor(opId: string, ht: number, tva: number, ttc: number) {
        super(opId, `HT (${ht}) + TVA (${tva}) != TTC (${ttc})`);
    }
}

export class UnknownCategoryMapping extends FiscalError {
    constructor(category: string) {
        super("UNKNOWN_CATEGORY_MAPPING", `Cannot map App Category '${category}' to Fiscal Category`);
    }
}
