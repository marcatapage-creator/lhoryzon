import { describe, it, expect } from 'vitest';
import { AA_2026_Fingerprint } from '../rulesets/2026/fr/artist_author/fingerprint';
import { canonicalStringify, paramsFingerprint } from '../engine/hashing';

describe('Governance & Stability Tripwires', () => {

    // --- Safety 6: Ruleset Drift Gate ---
    it('Safety 6: Ruleset Drift Gate (AA 2026)', () => {
        // This test ensures that ANY change to the functional parameters of the ruleset
        // (rates, thresholds, formulas, rounding mode) changes the fingerprint.
        // If this test fails:
        // 1. You have modified a business rule.
        // 2. You MUST bump the rulesetRevision (e.g. 2026.1 -> 2026.2).
        // 3. You MUST acknowledge the change by updating the EXPECTED_HASH below.

        // This is the "Golden Hash" for the current certified revision.
        // This is the "Golden Hash" for the current certified revision.
        const EXPECTED_HASH = "8a37b7250effc15f67d51fa20e6bc4c54f4198057275e8d737cfc5112155b6a0";

        expect(AA_2026_Fingerprint).toBe(EXPECTED_HASH);
    });

    // --- Safety 7: Canonical Stability Gate ---
    it('Safety 7: Canonical Stability Gate', () => {
        // This test verifies that the canonical JSON serializer is deterministic
        // regardless of input key order. This is critical because JS objects
        // obey insertion order (mostly), but our hash must be order-independent.

        const baseObject = {
            z: 1,
            a: {
                d: 4,
                c: [3, 2, 1] // Arrays preserve order (this is intended)
            },
            b: 2
        };

        const referenceHash = paramsFingerprint(baseObject);

        // 1. Verify Structure
        // Expected: {"a":{"c":[3,2,1],"d":4},"b":2,"z":1}
        const canon = canonicalStringify(baseObject);
        expect(canon).toBe('{"a":{"c":[3,2,1],"d":4},"b":2,"z":1}');

        // 2. Stress Test: Random Shuffle (1000 iterations)
        for (let i = 0; i < 1000; i++) {
            const shuffled = shuffleKeysRecursive(JSON.parse(JSON.stringify(baseObject)));
            const hash = paramsFingerprint(shuffled);
            expect(hash).toBe(referenceHash);
        }
    });

});

// Helper to shuffle object keys recursively
function shuffleKeysRecursive(obj: any): any {
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const keys = Object.keys(obj);
    // Fisher-Yates shuffle
    for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
    }

    const newObj: any = {};
    for (const key of keys) {
        newObj[key] = shuffleKeysRecursive(obj[key]);
    }
    return newObj;
}
