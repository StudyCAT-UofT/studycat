import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock Prisma
const mockFindUnique = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}))

// Mock JWT signing
vi.mock('@/lib/jwt', () => ({
  signToken: vi.fn(() => 'mock-jwt-token'),
}))

function makeRequest(headers: Record<string, string> = {}, searchParams: Record<string, string> = {}) {
  const url = new URL('https://sp.studycat.local/api/auth/shibboleth/callback')
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url, { headers })
}

describe('GET /api/auth/shibboleth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to /login?error=missing_utorid when no Shibboleth headers are present', async () => {
    const request = makeRequest()
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login?error=missing_utorid')
  })

  it('redirects to /login?error=user_not_found when UTORid has no matching user in the database', async () => {
    mockFindUnique.mockResolvedValue(null)

    const request = makeRequest({ uid: 'unknownuser' })
    const response = await GET(request)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { username: 'unknownuser' } })
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/login?error=user_not_found')
  })

  it('sets session-token cookie and redirects on successful authentication', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-123', username: 'testuser' })

    const request = makeRequest({ uid: 'testuser' })
    const response = await GET(request)

    expect(response.status).toBe(307)
    const cookie = response.cookies.get('session-token')
    expect(cookie?.value).toBe('mock-jwt-token')
    expect(cookie?.httpOnly).toBe(true)
  })

  it('extracts UTORid using uid > remote_user > eppn header priority', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-456', username: 'primaryuser' })

    // uid should win over remote_user and eppn
    const request = makeRequest({
      uid: 'primaryuser',
      remote_user: 'otheruser@domain.com',
      eppn: 'anotheruser@domain.com',
    })
    await GET(request)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { username: 'primaryuser' } })

    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue({ id: 'user-789', username: 'remoteuser' })

    // remote_user (domain stripped) should win over eppn when uid is absent
    const request2 = makeRequest({
      remote_user: 'remoteuser@domain.com',
      eppn: 'eppnuser@domain.com',
    })
    await GET(request2)

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { username: 'remoteuser' } })
  })
})
