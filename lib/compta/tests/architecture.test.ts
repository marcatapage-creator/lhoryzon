import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Architecture Constraints', () => {
    const libComptaPath = path.resolve(__dirname, '..'); // lib/compta

    it('should not contain legacy fiscal keywords in lib/compta (outside tests)', () => {
        const forbiddenKeywords = [
            'URSSAF_RATE',
            'TMI',
            'DECOTE',
            'ABATTEMENT',
            'PLAFOND_SS',
            'BAREME_IMPOT',
            'taux_urssaf',
            'taux_impot',
            'calcul_impot'
        ];

        const files = getAllFiles(libComptaPath);
        const violations: string[] = [];

        files.forEach(file => {
            // Skip tests and type definitions if needed (though types shouldn't have logic)
            if (file.includes('.test.ts') || file.includes('tests/')) return;

            const content = fs.readFileSync(file, 'utf-8');
            forbiddenKeywords.forEach(keyword => {
                if (content.includes(keyword)) {
                    // Start of file check to avoid false positives in imports from core
                    // Actually, even importing them might be suspicious if we are just aggregating.
                    // But let's look for usage.
                    // Strict check: simply present.
                    violations.push(`File ${path.relative(libComptaPath, file)} contains forbidden keyword: "${keyword}"`);
                }
            });
        });

        if (violations.length > 0) {
            console.error("Architecture Violations Found:\n" + violations.join('\n'));
        }
        expect(violations).toEqual([]);
    });
});

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if (file !== 'tests') { // Skip tests directory recursion if we want, but better to filter in loop
                getAllFiles(dirPath + "/" + file, arrayOfFiles);
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });
    return arrayOfFiles;
}
