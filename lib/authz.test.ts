// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    enrollment: { findMany: vi.fn() },
  },
}))

const { getSession } = await import('@/lib/auth')
const { prisma } = await import('@/lib/prisma')
const {
  requireSession,
  requireAdminUser,
  requireRole,
  requireOfferingRole,
  requireCourseRole,
  STAFF_ROLES,
  ANY_ROLE,
} = await import('./authz')

const SESSION = { userId: 'user-1', username: 'alice' }

const asUser = (isAdmin = false) => {
  vi.mocked(getSession).mockResolvedValue(SESSION)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ isAdmin } as never)
}

/** Enrollments the user holds, as returned for an offering-scoped query. */
const holdsOfferings = (...offeringIds: string[]) =>
  vi.mocked(prisma.enrollment.findMany).mockResolvedValue(offeringIds.map((offeringId) => ({ offeringId })) as never)

/** Enrollments the user holds, as returned for a course-scoped query. */
const holdsCourses = (...courseIds: string[]) =>
  vi.mocked(prisma.enrollment.findMany).mockResolvedValue(
    courseIds.map((courseId) => ({ offering: { courseId } })) as never,
  )

beforeEach(() => {
  vi.resetAllMocks()
})

describe('requireSession', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await requireSession()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
  })

  it('returns the session when logged in', async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION)
    const result = await requireSession()
    expect(result).toEqual({ ok: true, session: SESSION })
  })
})

describe('requireAdminUser', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await requireAdminUser()
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(401)
  })

  it('returns 403 for a non-admin', async () => {
    asUser(false)
    const result = await requireAdminUser()
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(403)
  })

  it('returns 403 when the session user no longer exists', async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const result = await requireAdminUser()
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(403)
  })

  it('allows an admin', async () => {
    asUser(true)
    expect((await requireAdminUser()).ok).toBe(true)
  })
})

describe('requireOfferingRole', () => {
  it('returns 401 without a session and does not query enrollments', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await requireOfferingRole('o1', STAFF_ROLES)
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(401)
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled()
  })

  it('queries only the session user, the given offering and the given roles', async () => {
    asUser()
    holdsOfferings('o1')
    await requireOfferingRole('o1', STAFF_ROLES)
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', offeringId: { in: ['o1'] }, offeringRole: { in: ['INSTRUCTOR', 'TA'] } },
      select: { offeringId: true },
    })
  })

  it('allows a user holding a matching role', async () => {
    asUser()
    holdsOfferings('o1')
    const result = await requireOfferingRole('o1', STAFF_ROLES)
    expect(result).toEqual({ ok: true, session: SESSION, isAdmin: false })
  })

  it('returns 403 for a user without a matching role', async () => {
    asUser()
    holdsOfferings()
    const result = await requireOfferingRole('o1', STAFF_ROLES)
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(403)
  })

  it('allows an admin with no enrollment', async () => {
    asUser(true)
    holdsOfferings()
    const result = await requireOfferingRole('o1', STAFF_ROLES)
    expect(result).toEqual({ ok: true, session: SESSION, isAdmin: true })
  })

  it('passes ANY_ROLE through to the query', async () => {
    asUser()
    holdsOfferings('o1')
    await requireOfferingRole('o1', ANY_ROLE)
    expect(vi.mocked(prisma.enrollment.findMany).mock.calls[0][0]).toMatchObject({
      where: { offeringRole: { in: ['STUDENT', 'TA', 'INSTRUCTOR'] } },
    })
  })
})

describe('requireCourseRole', () => {
  it('scopes the query to offerings of the course', async () => {
    asUser()
    holdsCourses('c1')
    const result = await requireCourseRole('c1', STAFF_ROLES)
    expect(result.ok).toBe(true)
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', offeringRole: { in: ['INSTRUCTOR', 'TA'] }, offering: { courseId: { in: ['c1'] } } },
      select: { offering: { select: { courseId: true } } },
    })
  })

  it('returns 403 for a user who is not staff in the course', async () => {
    asUser()
    holdsCourses()
    const result = await requireCourseRole('c1', STAFF_ROLES)
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(403)
  })
})

describe('requireRole with several targets', () => {
  it('returns 403 unless the user holds the role in every offering', async () => {
    asUser()
    holdsOfferings('o1')
    const result = await requireRole({ offeringIds: ['o1', 'o2'] }, STAFF_ROLES)
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(403)
  })

  it('allows when every offering is covered, ignoring duplicate ids', async () => {
    asUser()
    holdsOfferings('o1', 'o2')
    const result = await requireRole({ offeringIds: ['o1', 'o2', 'o1'] }, STAFF_ROLES)
    expect(result.ok).toBe(true)
  })

  it('returns 403 unless the user holds the role in every course', async () => {
    asUser()
    holdsCourses('c1')
    const result = await requireRole({ courseIds: ['c1', 'c2'] }, STAFF_ROLES)
    if (result.ok) throw new Error('expected denial')
    expect(result.response.status).toBe(403)
  })

  it('treats an empty scope as admin-only', async () => {
    asUser(false)
    const denied = await requireRole({}, STAFF_ROLES)
    expect(denied.ok).toBe(false)
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled()

    asUser(true)
    expect((await requireRole({ offeringIds: [] }, STAFF_ROLES)).ok).toBe(true)
  })
})
