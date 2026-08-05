// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        quiz: { findUnique: vi.fn() },
        item: { findMany: vi.fn() },
        attempt: {
            findMany: vi.fn(),
            count: vi.fn(),
            groupBy: vi.fn(),
        },
        enrollment: { count: vi.fn() },
        theta: { findMany: vi.fn() },
        response: { groupBy: vi.fn() },
    },
}))

const { prisma } = await import('@/lib/prisma')
const { GET: getAttemptData } = await import('./attempt/route')
const { GET: getThetaData } = await import('./theta/route')
const { GET: getQuestionData } = await import('./question/route')

const makeRequest = (params: Record<string, string> = {}, base = 'http://localhost') => {
    const url = new URL(base)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return new Request(url)
}

// GET /api/data/attempt

describe('GET /api/data/attempt', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when quizId is missing', async () => {
        const res = await getAttemptData(makeRequest())
        expect(res.status).toBe(400)
    })

    it('returns 404 when quiz not found', async () => {
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue(null)
        const res = await getAttemptData(makeRequest({ quizId: 'quiz-1' }))
        expect(res.status).toBe(404)
    })

    it('returns 200 with attempt stats', async () => {
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue({ id: 'quiz-1', offeringId: 'o1' } as never)
        vi.mocked(prisma.enrollment.count).mockResolvedValue(10)
        vi.mocked(prisma.attempt.count).mockResolvedValue(5)
        vi.mocked(prisma.attempt.groupBy).mockResolvedValue([{ enrollmentId: 'e1' }] as never)
        vi.mocked(prisma.attempt.findMany).mockResolvedValue([
            {
                id: 'attempt-1',
                enrollmentId: 'e1',
                startedAt: new Date(),
                status: 'COMPLETED',
                enrollment: { userId: 'user-1', user: { id: 'user-1', username: 'alice' } },
                responses: [
                    { isCorrect: true, item: { externalQuestionId: 'Q1', stem: 'Question?' }, itemId: 'item-1' },
                ],
            } as never,
        ])
        const res = await getAttemptData(makeRequest({ quizId: 'quiz-1' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.quizId).toBe('quiz-1')
        expect(data.totalStudents).toBe(10)
        expect(data.attempts).toHaveLength(1)
    })
})

// GET /api/data/theta

describe('GET /api/data/theta', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when courseOfferingId is missing', async () => {
        const res = await getThetaData(makeRequest())
        expect(res.status).toBe(400)
    })

    it('returns 200 with theta data excluding hidden students', async () => {
        vi.mocked(prisma.theta.findMany).mockResolvedValue([
            {
                id: 't1',
                enrollmentId: 'e1',
                moduleId: 'mod-1',
                value: 0.5,
                updatedAt: new Date(),
                module: { id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() },
                enrollment: {
                    userId: 'user-1',
                    hidden: false,
                    user: { id: 'user-1', username: 'alice', givenName: 'Alice', familyName: 'Smith', isAdmin: false, createdAt: new Date() },
                },
            } as never,
        ])
        const res = await getThetaData(makeRequest({ courseOfferingId: 'o1' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.courseOfferingId).toBe('o1')
        expect(data.studentCount).toBe(1)
        expect(data.avgThetaList).toHaveLength(1)
        expect(data.avgThetaList[0].avgTheta).toBe(0.5)
    })

    it('returns 200 with empty data when no thetas', async () => {
        vi.mocked(prisma.theta.findMany).mockResolvedValue([])
        const res = await getThetaData(makeRequest({ courseOfferingId: 'o1' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.studentCount).toBe(0)
        expect(data.avgThetaList).toHaveLength(0)
    })
})

// GET /api/data/question

describe('GET /api/data/question', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when quizId is missing', async () => {
        const res = await getQuestionData(makeRequest())
        expect(res.status).toBe(400)
    })

    it('returns 200 with empty items when quiz has no modules', async () => {
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
            id: 'quiz-1',
            quizModules: [],
        } as never)
        vi.mocked(prisma.item.findMany).mockResolvedValue([])
        const res = await getQuestionData(makeRequest({ quizId: 'quiz-1' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.count).toBe(0)
        expect(data.items).toHaveLength(0)
    })

    it('returns 200 with per-question stats', async () => {
        vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
            id: 'quiz-1',
            quizModules: [{ module: { id: 'mod-1' } }],
        } as never)
        vi.mocked(prisma.item.findMany)
            .mockResolvedValueOnce([{ id: 'item-1' }] as never)   // quizItems
            .mockResolvedValueOnce([{                               // itemsMeta (no attempts)
                id: 'item-1',
                externalQuestionId: 'Q1',
                stem: 'What is 2+2?',
                module: { id: 'mod-1', name: 'Module 1' },
                options: [{ id: 'opt-1', label: 'A', text: '4', isCorrect: true }],
            }] as never)
        vi.mocked(prisma.attempt.findMany).mockResolvedValue([])  // no attempts → empty stats path
        const res = await getQuestionData(makeRequest({ quizId: 'quiz-1' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.count).toBe(1)
        expect(data.items[0].stem).toBe('What is 2+2?')
    })
})
