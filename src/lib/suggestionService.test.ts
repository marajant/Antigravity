import { describe, it, expect } from 'vitest'
import { levenshtein, findMerchantInText } from './suggestionService'

// Export the levenshtein function for testing (it's currently private)
// For now, test findMerchantInText which uses it internally

describe('suggestionService', () => {
    describe('findMerchantInText', () => {
        const knownMerchants = ['Starbucks', 'Home Depot', 'Amazon', 'Walmart', 'Costco', 'Dot Loop']

        it('should find exact match in text', () => {
            const result = findMerchantInText('Thank you for shopping at Walmart', knownMerchants)
            expect(result).toBe('Walmart')
        })

        it('should find case-insensitive match', () => {
            const result = findMerchantInText('STARBUCKS COFFEE', knownMerchants)
            expect(result).toBe('Starbucks')
        })

        it('should find squashed match (Dot Loop -> dotloop)', () => {
            const result = findMerchantInText('888-DOTLOOP', knownMerchants)
            expect(result).toBe('Dot Loop')
        })

        it('should return undefined when no match', () => {
            const result = findMerchantInText('Random receipt text', knownMerchants)
            expect(result).toBeUndefined()
        })

        it('should return undefined for empty text', () => {
            const result = findMerchantInText('', knownMerchants)
            expect(result).toBeUndefined()
        })

        it('should return undefined for empty merchant list', () => {
            const result = findMerchantInText('Starbucks receipt', [])
            expect(result).toBeUndefined()
        })

        it('should prefer longer merchant names', () => {
            const merchants = ['Home', 'Home Depot']
            const result = findMerchantInText('Welcome to Home Depot', merchants)
            expect(result).toBe('Home Depot')
        })
    })
})
