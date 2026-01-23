import { describe, it, expect } from 'vitest'
import {
    getCurrencySymbol,
    convertAmount,
    calculateMonthlyTotal,
    calculateSpendingTrend,
    calculateCategoryBreakdown,
    calculateTopVendors
} from './analytics'
import type { Expense, ExchangeRate, Category } from './db'

describe('analytics', () => {
    // Mock data
    const mockRates: ExchangeRate[] = [
        { id: 'USD', rate: 1, updatedAt: new Date() },
        { id: 'EUR', rate: 0.92, updatedAt: new Date() },
        { id: 'GBP', rate: 0.79, updatedAt: new Date() },
        { id: 'JPY', rate: 150, updatedAt: new Date() },
    ]

    const baseDate = new Date()

    const mockExpenses: Expense[] = [
        { id: 1, amount: 100, currency: 'USD', merchant: 'Starbucks', date: baseDate, categoryId: 1, isTaxRelevant: 0, createdAt: new Date() },
        { id: 2, amount: 50, currency: 'USD', merchant: 'Amazon', date: baseDate, categoryId: 2, isTaxRelevant: 1, createdAt: new Date() },
        { id: 3, amount: 75, currency: 'USD', merchant: 'Starbucks', date: baseDate, categoryId: 1, isTaxRelevant: 0, createdAt: new Date() },
    ]

    const mockCategories: Category[] = [
        { id: 1, name: 'Food', color: '#FF0000', icon: 'utensils' },
        { id: 2, name: 'Shopping', color: '#00FF00', icon: 'shopping-cart' },
    ]

    describe('getCurrencySymbol', () => {
        it('should return correct symbol for USD', () => {
            expect(getCurrencySymbol('USD')).toBe('$')
        })

        it('should return correct symbol for EUR', () => {
            expect(getCurrencySymbol('EUR')).toBe('€')
        })

        it('should return correct symbol for GBP', () => {
            expect(getCurrencySymbol('GBP')).toBe('£')
        })

        it('should return currency code for unknown currencies', () => {
            expect(getCurrencySymbol('XYZ')).toBe('XYZ')
        })
    })

    describe('convertAmount', () => {
        it('should return same amount when source and target are the same', () => {
            expect(convertAmount(100, 'USD', 'USD', mockRates)).toBe(100)
        })

        it('should convert USD to EUR correctly', () => {
            const result = convertAmount(100, 'USD', 'EUR', mockRates)
            expect(result).toBeCloseTo(92, 1) // 100 * 0.92
        })

        it('should convert EUR to USD correctly', () => {
            const result = convertAmount(92, 'EUR', 'USD', mockRates)
            expect(result).toBeCloseTo(100, 1) // 92 / 0.92
        })

        it('should handle missing rates gracefully', () => {
            const result = convertAmount(100, 'XYZ', 'USD', mockRates)
            expect(result).toBe(100) // Falls back to 1:1
        })
    })

    describe('calculateMonthlyTotal', () => {
        it('should sum all expenses for current month', () => {
            const total = calculateMonthlyTotal(mockExpenses, new Date(), mockRates, 'USD')
            expect(total).toBe(225) // 100 + 50 + 75
        })

        it('should return 0 for empty expenses', () => {
            const total = calculateMonthlyTotal([], new Date(), mockRates, 'USD')
            expect(total).toBe(0)
        })
    })

    describe('calculateSpendingTrend', () => {
        it('should group expenses by date', () => {
            const trend = calculateSpendingTrend(mockExpenses, mockRates, 'USD')
            expect(trend.length).toBeGreaterThan(0)
            expect(trend[0]).toHaveProperty('date')
            expect(trend[0]).toHaveProperty('amount')
        })

        it('should return empty array for no expenses', () => {
            const trend = calculateSpendingTrend([], mockRates, 'USD')
            expect(trend).toEqual([])
        })
    })

    describe('calculateCategoryBreakdown', () => {
        it('should group expenses by category', () => {
            const breakdown = calculateCategoryBreakdown(mockExpenses, mockCategories, mockRates, 'USD')
            expect(breakdown.length).toBe(2)
        })

        it('should include category name and color', () => {
            const breakdown = calculateCategoryBreakdown(mockExpenses, mockCategories, mockRates, 'USD')
            const foodCategory = breakdown.find(b => b.name === 'Food')
            expect(foodCategory).toBeDefined()
            expect(foodCategory?.color).toBe('#FF0000')
        })

        it('should sum amounts correctly per category', () => {
            const breakdown = calculateCategoryBreakdown(mockExpenses, mockCategories, mockRates, 'USD')
            const foodCategory = breakdown.find(b => b.name === 'Food')
            expect(foodCategory?.value).toBe(175) // 100 + 75
        })
    })

    describe('calculateTopVendors', () => {
        it('should return top N vendors', () => {
            const vendors = calculateTopVendors(mockExpenses, 2, mockRates, 'USD')
            expect(vendors.length).toBe(2)
        })

        it('should order by total amount descending', () => {
            const vendors = calculateTopVendors(mockExpenses, 5, mockRates, 'USD')
            expect(vendors[0].name).toBe('Starbucks') // 175 total
            expect(vendors[1].name).toBe('Amazon')    // 50 total
        })

        it('should sum by vendor correctly', () => {
            const vendors = calculateTopVendors(mockExpenses, 5, mockRates, 'USD')
            const starbucks = vendors.find(v => v.name === 'Starbucks')
            expect(starbucks?.value).toBe(175)
        })
    })
})
