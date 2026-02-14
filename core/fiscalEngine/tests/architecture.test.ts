import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Architecture Guardrails', () => {
    const FORBIDDEN_IMPORTS = [
        'legacy_disabled',
        'lib/simulation' // Old location, just in case
    ];

    const DIRS_TO_SCAN = [
        'app',
        'core',
        'lib/hooks',
        'lib/compta'
    ];

    const ROOT_DIR = path.resolve(__dirname, '../../../../');
    // Adjust based on where this test file is located: 
    // We are putting it in core/fiscalEngine/tests/architecture.test.ts -> depth 4 from root?
    // /Users/.../compta-standalone/core/fiscalEngine/tests/architecture.test.ts
    // ../../../../ -> /Users/.../compta-standalone. Correct.

    function scanDir(dir: string, fileList: string[] = []) {
        const fullPath = path.join(ROOT_DIR, dir);
        if (!fs.existsSync(fullPath)) return fileList;

        const files = fs.readdirSync(fullPath);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(path.join(ROOT_DIR, filePath));
            if (stat.isDirectory()) {
                scanDir(filePath, fileList);
            } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                fileList.push(filePath);
            }
        }
        return fileList;
    }

    it('should not allow imports from legacy code in active directories', () => {
        const files = DIRS_TO_SCAN.flatMap(dir => scanDir(dir));
        const violations: string[] = [];

        files.forEach(file => {
            const content = fs.readFileSync(path.join(ROOT_DIR, file), 'utf-8');
            FORBIDDEN_IMPORTS.forEach(forbidden => {
                if (content.includes(forbidden)) {
                    // Check if it's not a comment? Simple check for now.
                    // Exclude this test file itself if it matches?
                    if (!file.includes('architecture.test.ts')) {
                        violations.push(`File ${file} imports '${forbidden}'`);
                    }
                }
            });
        });

        expect(violations).toEqual([]);
    });
});
