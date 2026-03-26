import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        course: { findUnique: vi.fn() },
        courseOffering: { findUnique: vi.fn() },
        item: { findMany: vi.fn() },
        module: { findFirst: vi.fn(), create: vi.fn() },
        $transaction: vi.fn(),
    },
}))

const { POST } = await import('./route')

describe('POST /api/upload', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when Content-Type is not multipart/form-data', async () => {
        const res = await POST(
            new Request('http://localhost/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId: 'c1' }),
            })
        )
        expect(res.status).toBe(400)
    })

    it('returns 400 when courseId is missing', async () => {
        const formData = new FormData()
        formData.append('offeringId', 'o1')
        const res = await POST(
            new Request('http://localhost/api/upload', {
                method: 'POST',
                body: formData,
            })
        )
        expect(res.status).toBe(400)
    })

    it('returns 400 when offeringId is missing', async () => {
        const formData = new FormData()
        formData.append('courseId', 'c1')
        const res = await POST(
            new Request('http://localhost/api/upload', {
                method: 'POST',
                body: formData,
            })
        )
        expect(res.status).toBe(400)
    })

    it('returns 400 when file is missing', async () => {
        const formData = new FormData()
        formData.append('courseId', 'c1')
        formData.append('offeringId', 'o1')
        const res = await POST(
            new Request('http://localhost/api/upload', {
                method: 'POST',
                body: formData,
            })
        )
        expect(res.status).toBe(400)
    })
})
