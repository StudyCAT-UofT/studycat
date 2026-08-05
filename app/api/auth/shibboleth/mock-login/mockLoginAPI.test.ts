// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

const makeRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/auth/shibboleth/mock-login')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return new NextRequest(url)
}

// ─── GET /api/auth/shibboleth/mock-login ─────────────────────────────────────

describe('GET /api/auth/shibboleth/mock-login', () => {
    afterEach(() => vi.unstubAllEnvs())

    it('returns 403 in production', async () => {
        vi.stubEnv('NODE_ENV', 'production')
        const res = await GET(makeRequest())
        expect(res.status).toBe(403)
        const data = await res.json()
        expect(data.error).toMatch(/not available in production/i)
    })

    it('redirects to the callback with default utorid=testuser when no param given', async () => {
        vi.stubEnv('NODE_ENV', 'test')
        const res = await GET(makeRequest())
        expect(res.status).toBe(307)
        const location = res.headers.get('location') ?? ''
        expect(location).toContain('/api/auth/shibboleth/callback')
        expect(location).toContain('utorid=testuser')
    })

    it('redirects with the provided utorid query param', async () => {
        vi.stubEnv('NODE_ENV', 'test')
        const res = await GET(makeRequest({ utorid: 'alice' }))
        expect(res.status).toBe(307)
        const location = res.headers.get('location') ?? ''
        expect(location).toContain('utorid=alice')
    })

    it('includes mock=true in the redirect URL', async () => {
        vi.stubEnv('NODE_ENV', 'test')
        const res = await GET(makeRequest({ utorid: 'bob' }))
        expect(res.status).toBe(307)
        const location = res.headers.get('location') ?? ''
        expect(location).toContain('mock=true')
    })
})
