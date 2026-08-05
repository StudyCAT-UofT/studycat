// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        user: { findUnique: vi.fn() },
    },
}))

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
    createToken: vi.fn(() => 'mock-token'),
    setSessionCookie: vi.fn(),
    clearSessionCookie: vi.fn(),
}))

const { prisma } = await import('@/lib/prisma')
const { getSession, createToken, setSessionCookie, clearSessionCookie } = await import('@/lib/auth')
const { POST: loginRoute } = await import('./login/route')
const { POST: logoutRoute } = await import('./logout/route')
const { GET: sessionRoute } = await import('./session/route')

const makeLoginRequest = (body: object) =>
    new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

// Login

describe('POST /api/auth/login', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when username is missing', async () => {
        const res = await loginRoute(makeLoginRequest({}))
        expect(res.status).toBe(400)
    })

    it('returns 404 when user is not found', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
        const res = await loginRoute(makeLoginRequest({ username: 'nobody' }))
        expect(res.status).toBe(404)
    })

    it('returns 200 with user and calls setSessionCookie on success', async () => {
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
            id: 'user-1',
            username: 'alice',
            givenName: 'Alice',
            familyName: 'Smith',
            isAdmin: false,
            createdAt: new Date(),
        })
        const res = await loginRoute(makeLoginRequest({ username: 'alice' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.user.username).toBe('alice')
        expect(createToken).toHaveBeenCalledWith({ userId: 'user-1', username: 'alice' })
        expect(setSessionCookie).toHaveBeenCalledWith('mock-token')
    })
})

// Logout

describe('POST /api/auth/logout', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 200 and clears session cookie', async () => {
        const res = await logoutRoute()
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.message).toMatch(/logged out/i)
        expect(clearSessionCookie).toHaveBeenCalled()
    })
})

// Session

describe('GET /api/auth/session', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when no session', async () => {
        vi.mocked(getSession).mockResolvedValue(null)
        const res = await sessionRoute()
        expect(res.status).toBe(401)
    })

    it('returns 200 with user when session is valid', async () => {
        vi.mocked(getSession).mockResolvedValue({ userId: 'user-1', username: 'alice' })
        const res = await sessionRoute()
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.user.username).toBe('alice')
    })
})
