import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        module: { findMany: vi.fn() },
    },
}))

const { prisma } = await import('@/lib/prisma')
const { GET } = await import('./route')

const makeRequest = (courseOfferingId?: string) =>
    new Request(`http://localhost/api/modules${courseOfferingId ? `?courseOfferingId=${courseOfferingId}` : ''}`)

describe('GET /api/modules', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when courseOfferingId is missing', async () => {
        const res = await GET(makeRequest())
        expect(res.status).toBe(400)
    })

    it('returns 200 with modules array', async () => {
        vi.mocked(prisma.module.findMany).mockResolvedValue([
            { id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() },
            { id: 'mod-2', name: 'Module 2', offeringId: 'o1', createdAt: new Date() },
        ])
        const res = await GET(makeRequest('offering-1'))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.modules).toHaveLength(2)
        expect(data.modules[0].name).toBe('Module 1')
    })

    it('returns 500 on database error', async () => {
        vi.mocked(prisma.module.findMany).mockRejectedValue(new Error('DB error'))
        const res = await GET(makeRequest('offering-1'))
        expect(res.status).toBe(500)
    })
})
