import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mocks 

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
    requireAdmin: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        course: { findMany: vi.fn(), create: vi.fn() },
        courseOffering: { findMany: vi.fn(), create: vi.fn() },
        enrollment: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
        term: { findMany: vi.fn(), create: vi.fn() },
        user: { findMany: vi.fn(), create: vi.fn() },
    },
}))

const { getSession, requireAdmin } = await import('@/lib/auth')
const { prisma } = await import('@/lib/prisma')
const { GET: getCoursesRoute, POST: postCoursesRoute } = await import('./courses/route')
const { GET: getOfferingsRoute, POST: postOfferingsRoute } = await import('./offerings/route')
const { GET: getTermsRoute, POST: postTermsRoute } = await import('./terms/route')
const { GET: getUsersRoute, POST: postUsersRoute } = await import('./users/route')
const { GET: getEnrollmentsRoute, POST: postEnrollmentsRoute, DELETE: deleteEnrollmentsRoute } = await import('./enrollments/route')
const { GET: getStatusRoute } = await import('./status/route')

// Helpers 

const asAdmin = () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 'admin', username: 'admin' })
    vi.mocked(requireAdmin).mockResolvedValue(undefined)
}

const asNonAdmin = () => {
    vi.mocked(getSession).mockResolvedValue({ userId: 'user', username: 'user' })
    vi.mocked(requireAdmin).mockRejectedValue(new Error('Forbidden'))
}

const asUnauthenticated = () => {
    vi.mocked(getSession).mockResolvedValue(null)
}

const makeRequest = (body: object, method = 'POST') =>
    new Request('http://localhost/api/admin/test', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

// Courses 

describe('GET /api/admin/courses', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await getCoursesRoute()
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await getCoursesRoute()
        expect(res.status).toBe(403)
    })

    it('returns 200 with courses for admin', async () => {
        asAdmin()
        vi.mocked(prisma.course.findMany).mockResolvedValue([
            { id: '1', code: 'CSC108', title: 'Intro', createdAt: new Date() },
        ])
        const data = await (await getCoursesRoute()).json()
        expect(data.courses).toHaveLength(1)
        expect(data.courses[0].code).toBe('CSC108')
    })

    it('returns 500 on database error', async () => {
        asAdmin()
        vi.mocked(prisma.course.findMany).mockRejectedValue(new Error('DB error'))
        const res = await getCoursesRoute()
        expect(res.status).toBe(500)
    })
})

describe('POST /api/admin/courses', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await postCoursesRoute(makeRequest({ code: 'CSC309', title: 'Web' }))
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await postCoursesRoute(makeRequest({ code: 'CSC309', title: 'Web' }))
        expect(res.status).toBe(403)
    })

    it('returns 400 when fields are missing', async () => {
        asAdmin()
        const res = await postCoursesRoute(makeRequest({ code: 'CSC309' }))
        expect(res.status).toBe(400)
    })

    it('returns 400 when course code is not alphanumeric', async () => {
        asAdmin()
        const res = await postCoursesRoute(makeRequest({ code: 'CSC 309' }))
        expect(res.status).toBe(400)
    })

    it('returns 201 with created course', async () => {
        asAdmin()
        vi.mocked(prisma.course.create).mockResolvedValue({ id: '1', code: 'CSC309', title: 'Web', createdAt: new Date() })
        const res = await postCoursesRoute(makeRequest({ code: 'CSC309', title: 'Web' }))
        const data = await res.json()
        expect(res.status).toBe(201)
        expect(data.course.code).toBe('CSC309')
    })
})

// Offerings

describe('GET /api/admin/offerings', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await getOfferingsRoute()
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await getOfferingsRoute()
        expect(res.status).toBe(403)
    })

    it('returns 200 with offerings for admin', async () => {
        asAdmin()
        vi.mocked(prisma.courseOffering.findMany).mockResolvedValue([
            { id: '1', courseId: 'c1', termId: 't1', display: 'CSC309 F24', createdAt: new Date() },
        ])
        const data = await (await getOfferingsRoute()).json()
        expect(data.offerings).toHaveLength(1)
        expect(data.offerings[0].display).toBe('CSC309 F24')
    })

    it('returns 500 on database error', async () => {
        asAdmin()
        vi.mocked(prisma.courseOffering.findMany).mockRejectedValue(new Error('DB error'))
        const res = await getOfferingsRoute()
        expect(res.status).toBe(500)
    })
})

describe('POST /api/admin/offerings', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await postOfferingsRoute(makeRequest({ courseId: 'c1', termId: 't1' }))
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await postOfferingsRoute(makeRequest({ courseId: 'c1', termId: 't1' }))
        expect(res.status).toBe(403)
    })

    it('returns 400 when courseId or termId is missing', async () => {
        asAdmin()
        const res = await postOfferingsRoute(makeRequest({ courseId: 'c1' }))
        expect(res.status).toBe(400)
    })

    it('returns 201 with created offering', async () => {
        asAdmin()
        vi.mocked(prisma.courseOffering.create).mockResolvedValue({ id: '1', courseId: 'c1', termId: 't1', display: null, createdAt: new Date() })
        const res = await postOfferingsRoute(makeRequest({ courseId: 'c1', termId: 't1' }))
        expect(res.status).toBe(201)
    })
})

// Terms

describe('GET /api/admin/terms', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await getTermsRoute()
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await getTermsRoute()
        expect(res.status).toBe(403)
    })

    it('returns 200 with terms for admin', async () => {
        asAdmin()
        vi.mocked(prisma.term.findMany).mockResolvedValue([
            { id: '1', name: 'Fall 2024', startDate: null, endDate: null },
        ])
        const data = await (await getTermsRoute()).json()
        expect(data.terms).toHaveLength(1)
        expect(data.terms[0].name).toBe('Fall 2024')
    })

    it('returns 500 on database error', async () => {
        asAdmin()
        vi.mocked(prisma.term.findMany).mockRejectedValue(new Error('DB error'))
        const res = await getTermsRoute()
        expect(res.status).toBe(500)
    })
})

describe('POST /api/admin/terms', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await postTermsRoute(makeRequest({ name: 'Fall 2024' }))
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await postTermsRoute(makeRequest({ name: 'Fall 2024' }))
        expect(res.status).toBe(403)
    })

    it('returns 400 when name is missing', async () => {
        asAdmin()
        const res = await postTermsRoute(makeRequest({}))
        expect(res.status).toBe(400)
    })

    it('returns 201 with created term', async () => {
        asAdmin()
        vi.mocked(prisma.term.create).mockResolvedValue({ id: '1', name: 'Fall 2024', startDate: null, endDate: null })
        const res = await postTermsRoute(makeRequest({ name: 'Fall 2024' }))
        const data = await res.json()
        expect(res.status).toBe(201)
        expect(data.term.name).toBe('Fall 2024')
    })
})

// Users 

describe('GET /api/admin/users', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await getUsersRoute()
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await getUsersRoute()
        expect(res.status).toBe(403)
    })

    it('returns 200 with users for admin', async () => {
        asAdmin()
        vi.mocked(prisma.user.findMany).mockResolvedValue([
            { id: '1', username: 'alice', givenName: 'Alice', familyName: 'Smith', isAdmin: false, createdAt: new Date() },
        ])
        const data = await (await getUsersRoute()).json()
        expect(data.users).toHaveLength(1)
        expect(data.users[0].username).toBe('alice')
    })

    it('returns 500 on database error', async () => {
        asAdmin()
        vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('DB error'))
        const res = await getUsersRoute()
        expect(res.status).toBe(500)
    })
})

describe('POST /api/admin/users', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await postUsersRoute(makeRequest({ username: 'alice' }))
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await postUsersRoute(makeRequest({ username: 'alice' }))
        expect(res.status).toBe(403)
    })

    it('returns 201 with created user', async () => {
        asAdmin()
        vi.mocked(prisma.user.create).mockResolvedValue({ id: '1', username: 'alice', givenName: 'Alice', familyName: 'Smith', isAdmin: false, createdAt: new Date() })
        const res = await postUsersRoute(makeRequest({ username: 'alice', givenName: 'Alice', familyName: 'Smith' }))
        const data = await res.json()
        expect(res.status).toBe(201)
        expect(data.user.username).toBe('alice')
    })

    it('returns 500 on database error', async () => {
        asAdmin()
        vi.mocked(prisma.user.create).mockRejectedValue(new Error('DB error'))
        const res = await postUsersRoute(makeRequest({ username: 'alice' }))
        expect(res.status).toBe(500)
    })
})

// Enrollments

const makeGetEnrollmentRequest = (offeringId?: string) =>
    new Request(`http://localhost/api/admin/enrollments${offeringId ? `?offeringId=${offeringId}` : ''}`)

const mockEnrollment = {
    id: 'e1',
    userId: 'u1',
    offeringId: 'o1',
    offeringRole: 'STUDENT',
    createdAt: new Date(),
    hidden: false,
    user: { id: 'u1', username: 'alice', givenName: 'Alice', familyName: 'Smith', isAdmin: false, createdAt: new Date() },
}

describe('GET /api/admin/enrollments', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await getEnrollmentsRoute(makeGetEnrollmentRequest('o1'))
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await getEnrollmentsRoute(makeGetEnrollmentRequest('o1'))
        expect(res.status).toBe(403)
    })

    it('returns 400 when offeringId is missing', async () => {
        asAdmin()
        const res = await getEnrollmentsRoute(makeGetEnrollmentRequest())
        expect(res.status).toBe(400)
    })

    it('returns 200 with enrollments for admin', async () => {
        asAdmin()
        vi.mocked(prisma.enrollment.findMany).mockResolvedValue([mockEnrollment])
        const data = await (await getEnrollmentsRoute(makeGetEnrollmentRequest('o1'))).json()
        expect(data.enrollments).toHaveLength(1)
        expect(data.enrollments[0].offeringRole).toBe('STUDENT')
    })
})

describe('POST /api/admin/enrollments', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await postEnrollmentsRoute(makeRequest({ userId: 'u1', offeringId: 'o1', offeringRole: 'STUDENT' }))
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await postEnrollmentsRoute(makeRequest({ userId: 'u1', offeringId: 'o1', offeringRole: 'STUDENT' }))
        expect(res.status).toBe(403)
    })

    it('returns 400 when required fields are missing', async () => {
        asAdmin()
        const res = await postEnrollmentsRoute(makeRequest({ userId: 'u1' }))
        expect(res.status).toBe(400)
    })

    it('returns 201 with created enrollment', async () => {
        asAdmin()
        vi.mocked(prisma.enrollment.create).mockResolvedValue(mockEnrollment)
        const res = await postEnrollmentsRoute(makeRequest({ userId: 'u1', offeringId: 'o1', offeringRole: 'STUDENT' }))
        expect(res.status).toBe(201)
    })
})

describe('DELETE /api/admin/enrollments', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await deleteEnrollmentsRoute(makeRequest({ userId: 'u1', offeringId: 'o1' }, 'DELETE'))
        expect(res.status).toBe(401)
    })

    it('returns 403 for non-admin', async () => {
        asNonAdmin()
        const res = await deleteEnrollmentsRoute(makeRequest({ userId: 'u1', offeringId: 'o1' }, 'DELETE'))
        expect(res.status).toBe(403)
    })

    it('returns 400 when required fields are missing', async () => {
        asAdmin()
        const res = await deleteEnrollmentsRoute(makeRequest({ userId: 'u1' }, 'DELETE'))
        expect(res.status).toBe(400)
    })

    it('returns 404 when enrollment does not exist', async () => {
        asAdmin()
        vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null)
        const res = await deleteEnrollmentsRoute(makeRequest({ userId: 'u1', offeringId: 'o1' }, 'DELETE'))
        expect(res.status).toBe(404)
    })

    it('returns 200 when enrollment is deleted', async () => {
        asAdmin()
        vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(mockEnrollment)
        vi.mocked(prisma.enrollment.delete).mockResolvedValue(mockEnrollment)
        const res = await deleteEnrollmentsRoute(makeRequest({ userId: 'u1', offeringId: 'o1' }, 'DELETE'))
        expect(res.status).toBe(200)
    })
})

// Status

describe('GET /api/admin/status', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 with admin: false when unauthenticated', async () => {
        asUnauthenticated()
        const res = await getStatusRoute()
        const data = await res.json()
        expect(res.status).toBe(401)
        expect(data.admin).toBe(false)
    })

    it('returns 200 with admin: false for non-admin', async () => {
        asNonAdmin()
        const res = await getStatusRoute()
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.admin).toBe(false)
    })

    it('returns 200 with admin: true for admin', async () => {
        asAdmin()
        const res = await getStatusRoute()
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.admin).toBe(true)
    })
})
