// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({
    verifyToken: vi.fn(),
    getSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        enrollment: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            deleteMany: vi.fn(),
            updateMany: vi.fn(),
        },
        attempt: { findMany: vi.fn() },
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        courseOffering: { findUnique: vi.fn() },
    },
}))

const { verifyToken } = await import('@/lib/auth')
const { prisma } = await import('@/lib/prisma')
const { GET: getStudents, POST: postStudents } = await import('./route')
const { GET: getEnrollments, DELETE: deleteEnrollments, PATCH: patchEnrollments } = await import('../enrollments/route')

const TOKEN = 'valid-token'
const SESSION = { userId: 'user-1', username: 'testuser' }

const withToken = (url: string, method = 'GET', body?: object): NextRequest =>
    new NextRequest(url, {
        method,
        headers: {
            Cookie: `session-token=${TOKEN}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    })

const withoutToken = (url: string, method = 'GET', body?: object): NextRequest =>
    new NextRequest(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
    })

const mockUser = {
    id: 'user-1',
    username: 'alice',
    givenName: 'Alice',
    familyName: 'Smith',
    isAdmin: false,
    createdAt: new Date(),
}

const mockEnrollment = {
    id: 'e1',
    userId: 'user-1',
    offeringId: 'o1',
    offeringRole: 'STUDENT',
    createdAt: new Date(),
    hidden: false,
    user: mockUser,
}

// GET /api/students

describe('GET /api/students', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when no session token', async () => {
        const res = await getStudents(withoutToken('http://localhost/api/students?courseOfferingId=o1'))
        expect(res.status).toBe(401)
    })

    it('returns 401 when token is invalid', async () => {
        vi.mocked(verifyToken).mockReturnValue(null)
        const res = await getStudents(withToken('http://localhost/api/students?courseOfferingId=o1'))
        expect(res.status).toBe(401)
    })

    it('returns 400 when courseOfferingId is missing', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        const res = await getStudents(withToken('http://localhost/api/students'))
        expect(res.status).toBe(400)
    })

    it('returns 200 with students array', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        vi.mocked(prisma.enrollment.findMany).mockResolvedValue([mockEnrollment])
        vi.mocked(prisma.attempt.findMany).mockResolvedValue([])
        const res = await getStudents(withToken('http://localhost/api/students?courseOfferingId=o1'))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.students).toHaveLength(1)
        expect(data.students[0].username).toBe('alice')
    })
})

// POST /api/students

describe('POST /api/students', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when no session token', async () => {
        const res = await postStudents(withoutToken('http://localhost/api/students', 'POST', { courseOfferingId: 'o1', students: [{ username: 'alice' }] }))
        expect(res.status).toBe(401)
    })

    it('returns 400 when courseOfferingId is missing', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        const res = await postStudents(withToken('http://localhost/api/students', 'POST', { students: [{ username: 'alice' }] }))
        expect(res.status).toBe(400)
    })

    it('returns 400 when students array is empty', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        const res = await postStudents(withToken('http://localhost/api/students', 'POST', { courseOfferingId: 'o1', students: [] }))
        expect(res.status).toBe(400)
    })

    it('returns 201 and creates new user and enrollment', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({ id: 'o1', courseId: 'c1', termId: 't1', display: null, createdAt: new Date() })
        vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.user.create).mockResolvedValue(mockUser)
        vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(null)
        vi.mocked(prisma.enrollment.create).mockResolvedValue(mockEnrollment)

        const res = await postStudents(withToken('http://localhost/api/students', 'POST', {
            courseOfferingId: 'o1',
            students: [{ username: 'alice', givenName: 'Alice', familyName: 'Smith' }],
        }))
        expect(res.status).toBe(201)
        const data = await res.json()
        expect(data.results.created).toHaveLength(1)
    })

    it('returns 201 and records alreadyExists for duplicate enrollment', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({ id: 'o1', courseId: 'c1', termId: 't1', display: null, createdAt: new Date() })
        vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
        vi.mocked(prisma.enrollment.findUnique).mockResolvedValue(mockEnrollment)

        const res = await postStudents(withToken('http://localhost/api/students', 'POST', {
            courseOfferingId: 'o1',
            students: [{ username: 'alice' }],
        }))
        expect(res.status).toBe(201)
        const data = await res.json()
        expect(data.results.alreadyExists).toContain('alice')
    })
})

// GET /api/enrollments

describe('GET /api/enrollments', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when no session token', async () => {
        const res = await getEnrollments(withoutToken('http://localhost/api/enrollments'))
        expect(res.status).toBe(401)
    })

    it('returns 200 with courseOfferings', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        vi.mocked(prisma.enrollment.findMany).mockResolvedValue([
            {
                ...mockEnrollment,
                offering: {
                    id: 'o1',
                    display: 'CSC108 F24',
                    courseId: 'c1',
                    termId: 't1',
                    createdAt: new Date(),
                    course: { id: 'c1', code: 'CSC108', title: 'Intro', createdAt: new Date() },
                    term: { id: 't1', name: 'Fall 2024', startDate: null, endDate: null },
                },
            } as never,
        ])
        const res = await getEnrollments(withToken('http://localhost/api/enrollments'))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.courseOfferings).toHaveLength(1)
        expect(data.courseOfferings[0].display).toBe('CSC108 F24')
    })
})

// DELETE /api/enrollments

describe('DELETE /api/enrollments', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when no session token', async () => {
        const res = await deleteEnrollments(withoutToken('http://localhost/api/enrollments', 'DELETE', { enrollmentIds: ['e1'] }))
        expect(res.status).toBe(401)
    })

    it('returns 400 when enrollmentIds is missing', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        const res = await deleteEnrollments(withToken('http://localhost/api/enrollments', 'DELETE', {}))
        expect(res.status).toBe(400)
    })

    it('returns 200 on successful bulk delete', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        vi.mocked(prisma.enrollment.deleteMany).mockResolvedValue({ count: 1 })
        const res = await deleteEnrollments(withToken('http://localhost/api/enrollments', 'DELETE', { enrollmentIds: ['e1'] }))
        expect(res.status).toBe(200)
    })
})

// PATCH /api/enrollments

describe('PATCH /api/enrollments', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when no session token', async () => {
        const res = await patchEnrollments(withoutToken('http://localhost/api/enrollments', 'PATCH', { enrollmentIds: ['e1'], hidden: true }))
        expect(res.status).toBe(401)
    })

    it('returns 400 when hidden is not a boolean', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        const res = await patchEnrollments(withToken('http://localhost/api/enrollments', 'PATCH', { enrollmentIds: ['e1'], hidden: 'yes' }))
        expect(res.status).toBe(400)
    })

    it('returns 200 on successful update', async () => {
        vi.mocked(verifyToken).mockReturnValue(SESSION)
        vi.mocked(prisma.enrollment.updateMany).mockResolvedValue({ count: 1 })
        const res = await patchEnrollments(withToken('http://localhost/api/enrollments', 'PATCH', { enrollmentIds: ['e1'], hidden: true }))
        expect(res.status).toBe(200)
    })
})
