import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, cn } from './utils';

describe('utils', () => {
    it('cn merges classes correctly', () => {
        expect(cn('w-full', 'p-4', 'p-2')).toBe('w-full p-2');
        expect(cn('text-red-500', null, undefined, 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    it('formatCurrency formats USD by default', () => {
        expect(formatCurrency(1000)).toBe('$1,000.00');
        expect(formatCurrency(10.5)).toBe('$10.50');
    });

    it('formatDate formats date correctly', () => {
        const date = new Date(2023, 0, 15); // Jan 15, 2023
        expect(formatDate(date)).toBe('Jan 15, 2023');
    });
});
