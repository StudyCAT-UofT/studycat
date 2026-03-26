import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findMany: vi.fn(), create: vi.fn() },
    },
}))

const { prisma } = await import('@/lib/prisma')
const { GET, POST } = await import('./route')

const makeRequest = (body: object) =>
    new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

// ─── GET /api/users ──────────────────────────────────────────────────────────

describe('GET /api/users', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 200 with users array', async () => {
        vi.mocked(prisma.user.findMany).mockResolvedValue([
            { id: 'u1', username: 'alice', givenName: 'Alice', familyName: 'Smith', isAdmin: false, createdAt: new Date() },
            { id: 'u2', username: 'bob',   givenName: 'Bob',   familyName: 'Jones', isAdmin: false, createdAt: new Date() },
        ] as never)

        const res = await GET()
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.users).toHaveLength(2)
        expect(data.users[0].username).toBe('alice')
    })

    it('returns 200 with empty array when no users exist', async () => {
        vi.mocked(prisma.user.findMany).mockResolvedValue([])
        const res = await GET()
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.users).toEqual([])
    })

    it('returns 500 on database error', async () => {
        vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('DB down'))
        const res = await GET()
        expect(res.status).toBe(500)
    })
})

// ─── POST /api/users ─────────────────────────────────────────────────────────

describe('POST /api/users', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when username is missing', async () => {
        const res = await POST(makeRequest({}))
        expect(res.status).toBe(400)
        const data = await res.json()
        expect(data.error).toMatch(/username/i)
    })

    it('returns 201 with created user', async () => {
        vi.mocked(prisma.user.create).mockResolvedValue({
            id: 'u-new',
            username: 'carol',
            givenName: null,
            familyName: null,
            isAdmin: false,
            createdAt: new Date(),
        } as never)

        const res = await POST(makeRequest({ username: 'carol' }))
        expect(res.status).toBe(201)
        const data = await res.json()
        expect(data.user.username).toBe('carol')
        expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith({
            data: { username: 'carol' },
        })
    })

    it('returns 500 on database error', async () => {
        vi.mocked(prisma.user.create).mockRejectedValue(new Error('constraint violation'))
        const res = await POST(makeRequest({ username: 'dave' }))
        expect(res.status).toBe(500)
    })
})
