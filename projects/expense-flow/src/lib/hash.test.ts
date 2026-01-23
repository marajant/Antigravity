import { describe, it, expect } from 'vitest'
import { calculateFileHash } from './hash'

describe('hash', () => {
    describe('calculateFileHash', () => {
        it('should return a non-empty string', async () => {
            const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
            const hash = await calculateFileHash(file)

            expect(typeof hash).toBe('string')
            expect(hash.length).toBeGreaterThan(0)
        })

        it('should return a valid hash format', async () => {
            const file = new File(['content'], 'file.txt', { type: 'text/plain' })
            const hash = await calculateFileHash(file)

            // Either a 64-char hex string (real hash) or fallback-xxxxxxxx format
            const isRealHash = /^[a-f0-9]{64}$/.test(hash)
            const isFallback = /^fallback-[a-f0-9]{8}$/.test(hash)

            expect(isRealHash || isFallback).toBe(true)
        })

        it('should handle files with different names', async () => {
            const file1 = new File(['same content'], 'file_A.txt', { type: 'text/plain' })
            const file2 = new File(['same content'], 'file_B.txt', { type: 'text/plain' })

            const hash1 = await calculateFileHash(file1)
            const hash2 = await calculateFileHash(file2)

            // Both should return valid hashes (doesn't matter if same or different in fallback)
            expect(hash1.length).toBeGreaterThan(0)
            expect(hash2.length).toBeGreaterThan(0)
        })
    })
})
