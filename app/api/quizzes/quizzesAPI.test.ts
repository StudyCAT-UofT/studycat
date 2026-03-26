import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        quiz: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            deleteMany: vi.fn(),
        },
        quizModule: { createMany: vi.fn() },
        module: { findMany: vi.fn() },
        courseOffering: { findUnique: vi.fn() },
    },
}))

const { getSession } = await import('@/lib/auth')
const { prisma } = await import('@/lib/prisma')
const { GET, POST, DELETE } = await import('./route')
const { PUT, DELETE: DELETEById } = await import('./[id]/route')

const asAuthenticated = () =>
    vi.mocked(getSession).mockResolvedValue({ userId: 'user-1', username: 'testuser' })
const asUnauthenticated = () => vi.mocked(getSession).mockResolvedValue(null)

const makeRequest = (body: object, method = 'POST') =>
    new Request('http://localhost/api/quizzes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

const makeGetRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/quizzes')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return new Request(url)
}

const mockQuiz = {
    id: 'quiz-1',
    title: 'Test Quiz',
    offeringId: 'offering-1',
    active: true,
    shuffled: false,
    feedbackVisibility: 'full',
    fixedLength: 10,
    includedBlooms: '[]',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 'user-1',
    createdBy: { id: 'user-1', username: 'testuser' },
    attempts: [],
    quizItems: [],
    quizModules: [],
}

// GET /api/quizzes

describe('GET /api/quizzes', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when courseOfferingId is missing', async () => {
        const res = await GET(makeGetRequest())
        expect(res.status).toBe(400)
    })

    it('returns 200 with quizzes array', async () => {
        vi.mocked(prisma.quiz.findMany).mockResolvedValue([mockQuiz])
        const res = await GET(makeGetRequest({ courseOfferingId: 'offering-1' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.quizzes).toHaveLength(1)
        expect(data.quizzes[0].title).toBe('Test Quiz')
    })

    it('returns 500 on database error', async () => {
        vi.mocked(prisma.quiz.findMany).mockRejectedValue(new Error('DB error'))
        const res = await GET(makeGetRequest({ courseOfferingId: 'offering-1' }))
        expect(res.status).toBe(500)
    })
})

// POST /api/quizzes

describe('POST /api/quizzes', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await POST(makeRequest({ courseOfferingId: 'o1', title: 'Q', includedModuleIds: ['m1'], masteryThresholds: [0.8], fixedLength: 5 }))
        expect(res.status).toBe(401)
    })

    it('returns 400 when title is missing', async () => {
        asAuthenticated()
        const res = await POST(makeRequest({ courseOfferingId: 'o1', includedModuleIds: ['m1'], masteryThresholds: [0.8], fixedLength: 5 }))
        expect(res.status).toBe(400)
    })

    it('returns 400 when modules array is empty', async () => {
        asAuthenticated()
        const res = await POST(makeRequest({ courseOfferingId: 'o1', title: 'Q', includedModuleIds: [], masteryThresholds: [], fixedLength: 5 }))
        expect(res.status).toBe(400)
    })

    it('returns 400 when fixedLength is less than 1', async () => {
        asAuthenticated()
        const res = await POST(makeRequest({ courseOfferingId: 'o1', title: 'Q', includedModuleIds: ['m1'], masteryThresholds: [0.8], fixedLength: 0 }))
        expect(res.status).toBe(400)
    })

    it('returns 400 when masteryThresholds count mismatches modules', async () => {
        asAuthenticated()
        const res = await POST(makeRequest({ courseOfferingId: 'o1', title: 'Q', includedModuleIds: ['m1', 'm2'], masteryThresholds: [0.8], fixedLength: 5 }))
        expect(res.status).toBe(400)
    })

    it('returns 400 for invalid feedbackVisibility', async () => {
        asAuthenticated()
        const res = await POST(makeRequest({ courseOfferingId: 'o1', title: 'Q', includedModuleIds: ['m1'], masteryThresholds: [0.8], fixedLength: 5, feedbackVisibility: 'invalid' }))
        expect(res.status).toBe(400)
    })

    it('returns 201 with created quiz', async () => {
        asAuthenticated()
        vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({ id: 'o1', courseId: 'c1', termId: 't1', display: null, createdAt: new Date() })
        vi.mocked(prisma.module.findMany).mockResolvedValue([{ id: 'm1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() }])
        vi.mocked(prisma.quiz.create).mockResolvedValue({ id: 'quiz-new', title: 'New Quiz', offeringId: 'o1', active: true, shuffled: false, feedbackVisibility: 'full', fixedLength: 5, includedBlooms: '[]', createdAt: new Date(), updatedAt: new Date(), createdById: 'user-1' })
        vi.mocked(prisma.quizModule.createMany).mockResolvedValue({ count: 1 })

        const res = await POST(makeRequest({ courseOfferingId: 'o1', title: 'New Quiz', includedModuleIds: ['m1'], masteryThresholds: [0.8], fixedLength: 5 }))
        expect(res.status).toBe(201)
        const data = await res.json()
        expect(data.quiz.title).toBe('New Quiz')
    })
})

// DELETE /api/quizzes (bulk)

describe('DELETE /api/quizzes', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await DELETE(makeRequest({ ids: ['quiz-1'] }, 'DELETE'))
        expect(res.status).toBe(401)
    })

    it('returns 400 when ids is missing', async () => {
        asAuthenticated()
        const res = await DELETE(makeRequest({}, 'DELETE'))
        expect(res.status).toBe(400)
    })

    it('returns 200 on successful bulk delete', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findMany).mockResolvedValue([{ id: 'quiz-1', title: 'Q', offeringId: 'o1', active: true, shuffled: false, feedbackVisibility: 'full', fixedLength: 5, includedBlooms: '[]', createdAt: new Date(), updatedAt: new Date(), createdById: 'user-1' }])
        vi.mocked(prisma.quiz.deleteMany).mockResolvedValue({ count: 1 })
        const res = await DELETE(makeRequest({ ids: ['quiz-1'] }, 'DELETE'))
        expect(res.status).toBe(200)
    })
})

// PUT /api/quizzes/[id]

describe('PUT /api/quizzes/[id]', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await PUT(makeRequest({ title: 'Updated' }, 'PUT'), { params: Promise.resolve({ id: 'quiz-1' }) })
        expect(res.status).toBe(401)
    })

    it('returns 404 when quiz not found', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null)
        const res = await PUT(makeRequest({ title: 'Updated' }, 'PUT'), { params: Promise.resolve({ id: 'quiz-1' }) })
        expect(res.status).toBe(404)
    })

    it('returns 200 with updated quiz', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ ...mockQuiz, offering: { id: 'o1', courseId: 'c1', termId: 't1', display: null, createdAt: new Date() } } as never)
        vi.mocked(prisma.quiz.update).mockResolvedValue({ ...mockQuiz, title: 'Updated' })
        const res = await PUT(makeRequest({ title: 'Updated' }, 'PUT'), { params: Promise.resolve({ id: 'quiz-1' }) })
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.quiz.title).toBe('Updated')
    })
})

// DELETE /api/quizzes/[id]

describe('DELETE /api/quizzes/[id]', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await DELETEById(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'quiz-1' }) })
        expect(res.status).toBe(401)
    })

    it('returns 404 when quiz not found', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null)
        const res = await DELETEById(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'quiz-1' }) })
        expect(res.status).toBe(404)
    })

    it('returns 200 on successful delete', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.quiz.delete).mockResolvedValue(mockQuiz as never)
        const res = await DELETEById(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'quiz-1' }) })
        expect(res.status).toBe(200)
    })
})
