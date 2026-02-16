import crypto from "crypto";

// 1) Canonical stringify: keys sorted recursively
export function canonicalStringify(value: unknown): string {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(canonicalStringify).join(",")}]`;
    }

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const entries = keys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
    return `{${entries.join(",")}}`;
}

export function sha256Hex(input: string): string {
    return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function paramsFingerprint(params: unknown): string {
    const canon = canonicalStringify(params);
    return sha256Hex(canon);
}
