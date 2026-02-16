
import { describe, it, expect } from 'vitest';
import { TaxLineItem, FiscalContext } from '@/core/fiscal-v2/domain/types';
import { computeSchedule } from '../rulesets/2026/fr/artist_author/schedule';

// Helper Context
const createContext = (freq: 'monthly' | 'annual'): FiscalContext => ({
    taxYear: 2026,
    userStatus: 'artist_author',
    fiscalRegime: 'reel',
    vatRegime: 'reel_mensuel',
    household: { parts: 1, children: 0 },
    options: {
        estimateMode: true,
        vatPaymentFrequency: freq
    }
});

// Mock VAT Lines (from computeVat)
const mockVatLines: TaxLineItem[] = [
    { code: 'VAT_JAN', label: 'TVA Jan', amount: 100, organization: 'DGFIP', category: 'VAT', confidence: 'ESTIMATED', base: 0, rate_bps: 2000, metadata: { month: 'Jan', monthIndex: 0 } },
    { code: 'VAT_FEB', label: 'TVA Feb', amount: 200, organization: 'DGFIP', category: 'VAT', confidence: 'ESTIMATED', base: 0, rate_bps: 2000, metadata: { month: 'Feb', monthIndex: 1 } },
    { code: 'VAT_DEC', label: 'TVA Dec', amount: 300, organization: 'DGFIP', category: 'VAT', confidence: 'ESTIMATED', base: 0, rate_bps: 2000, metadata: { month: 'Dec', monthIndex: 11 } }
];

describe('VAT Payment Frequency Schedule', () => {

    it('should schedule Monthly VAT payments in M+1', () => {
        const context = createContext('monthly');
        const schedule = computeSchedule(mockVatLines, context);

        const vatItems = schedule.filter(s => s.organization === 'DGFIP' && s.label.includes('TVA'));

        expect(vatItems.length).toBe(3);

        // Jan VAT -> Paid Feb 20
        const janPay = vatItems.find(i => i.sourceLineCodes?.includes('VAT_JAN'));
        expect(janPay?.date).toBe('2026-02-20');
        expect(janPay?.amount).toBe(100);

        // Dec VAT -> Paid Jan 2027
        const decPay = vatItems.find(i => i.sourceLineCodes?.includes('VAT_DEC'));
        expect(decPay?.date).toBe('2027-01-20'); // N+1
    });

    it('should schedule Annual VAT payment in N+1', () => {
        const context = createContext('annual');
        const schedule = computeSchedule(mockVatLines, context);

        const vatItems = schedule.filter(s => s.organization === 'DGFIP' && s.label.includes('TVA'));

        expect(vatItems.length).toBe(1); // One big payment

        const annualPay = vatItems[0];
        expect(annualPay.date).toBe('2027-05-01');
        expect(annualPay.amount).toBe(600); // 100+200+300
        expect(annualPay.type).toBe('BALANCE');
    });

});
