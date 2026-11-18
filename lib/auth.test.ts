// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (name === 'session-token' && cookie.value ? { value: cookie.value } : undefined),
  })),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}))

const { prisma } = await import('@/lib/prisma')
const { getSession } = await import('./auth')
const { signToken } = await import('./jwt')

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cookie.value = undefined
  })

  it('returns null without a session cookie', async () => {
    expect(await getSession()).toBeNull()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('returns null for an invalid token without querying the database', async () => {
    cookie.value = 'not-a-token'
    expect(await getSession()).toBeNull()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('returns the session when the user still exists', async () => {
    cookie.value = signToken({ userId: 'u1', username: 'alice' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as never)

    expect(await getSession()).toMatchObject({ userId: 'u1', username: 'alice' })
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }))
  })

  it('returns null once the user has been deleted, though the token is still valid', async () => {
    cookie.value = signToken({ userId: 'u1', username: 'alice' })
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    expect(await getSession()).toBeNull()
  })
})
