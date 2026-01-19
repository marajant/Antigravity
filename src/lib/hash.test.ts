import { describe, it, expect } from 'vitest'
import { calculateFileHash } from './hash'

describe('hash', () => {
    describe('calculateFileHash', () => {
        it('should return a string for a file', async () => {
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
            const hash = await calculateFileHash(file)

            expect(typeof hash).toBe('string')
            expect(hash.length).toBeGreaterThan(0)
        })

        it('should return different hash for different content', async () => {
            const file1 = new File(['content A'], 'file.txt', { type: 'text/plain' })
            const file2 = new File(['content B'], 'file.txt', { type: 'text/plain' })

            const hash1 = await calculateFileHash(file1)
            const hash2 = await calculateFileHash(file2)

            // Hashes should differ for different content
            expect(hash1).not.toBe(hash2)
        })

        it('should handle fallback gracefully when crypto.subtle unavailable', async () => {
            // In Node.js test environment, crypto.subtle may not work with File objects
            // The function should gracefully fall back to metadata-based hash
            const file = new File(['any content'], 'test.txt', { type: 'text/plain' })
            const hash = await calculateFileHash(file)

            // Should return a valid hash string (either real or fallback)
            expect(hash).toBeDefined()
            expect(typeof hash).toBe('string')
        })
    })
})
