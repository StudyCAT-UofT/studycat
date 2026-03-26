import { describe, it, expect } from 'vitest'
import { getBloomColor } from './getBloomColor'

describe('getBloomColor', () => {
    it.each([
        ['REMEMBER', 'blue'],
        ['UNDERSTAND', 'green'],
        ['APPLY', 'yellow'],
        ['ANALYZE', 'orange'],
        ['EVALUATE', 'red'],
        ['CREATE', 'purple'],
        ['UNKNOWN_LEVEL', 'gray'],
    ])('returns correct color for %s', (bloom, expected) => {
        expect(getBloomColor(bloom)).toBe(expected)
    })
})
