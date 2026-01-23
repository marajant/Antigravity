import { describe, it, expect } from 'vitest';
import { parseReceiptText } from './ocr';

describe('OCR Parsing', () => {
    it('extracts highest amount as total', () => {
        const text = `
      Walmart
      Item 1   $10.00
      Item 2   $5.50
      Total    $15.50
    `;
        const result = parseReceiptText(text);
        expect(result.amount).toBe(15.50);
    });

    it('extracts date correctly', () => {
        const text = `
      Target
      Date: 01/15/2023
      Total: $20.00
    `;
        const result = parseReceiptText(text);
        // Note: Date parsing depends on local timezone, so we check ISO string date part or equality
        expect(result.date).toBeDefined();
        expect(result.date?.getFullYear()).toBe(2023);
        expect(result.date?.getMonth()).toBe(0); // Jan is 0
    });

    it('extracts merchant as first line', () => {
        const text = `
      Starbucks Coffee
      123 Main St
      Latte $5.00
    `;
        const result = parseReceiptText(text);
        expect(result.merchant).toBe('Starbucks Coffee');
    });
});
