import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        quiz: { findFirst: vi.fn() },
        enrollment: { findFirst: vi.fn() },
        attempt: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        item: { findUnique: vi.fn() },
        response: {
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    },
}))

vi.mock('@/lib/fastapi-client', () => ({
    fastApiClient: {
        initAttempt: vi.fn(),
        stepAttempt: vi.fn(),
    },
}))

vi.mock('@/utils/thetaToPerformance', () => ({
    thetaToPerformance: vi.fn(() => ({ level: 'developing', numericValue: 0.5 })),
}))

const { getSession } = await import('@/lib/auth')
const { prisma } = await import('@/lib/prisma')
const { fastApiClient } = await import('@/lib/fastapi-client')
const { POST: initRoute } = await import('./attempt/init/route')
const { POST: stepRoute } = await import('./attempt/step/route')
const { POST: feedbackRoute } = await import('./attempt/feedback/route')
const { POST: resultsRoute } = await import('./attempt/results/route')

const asAuthenticated = () =>
    vi.mocked(getSession).mockResolvedValue({ userId: 'user-1', username: 'testuser' })
const asUnauthenticated = () => vi.mocked(getSession).mockResolvedValue(null)

const makeRequest = (body: object): NextRequest =>
    new NextRequest('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

const mockQuiz = {
    id: 'quiz-1',
    title: 'Test Quiz',
    offeringId: 'o1',
    active: true,
    shuffled: false,
    feedbackVisibility: 'full',
    fixedLength: 5,
    includedBlooms: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 'user-1',
    offering: { id: 'o1', courseId: 'c1', termId: 't1', display: null, createdAt: new Date(), modules: [] },
    quizItems: [{ itemId: 'item-1', quizId: 'quiz-1', item: { id: 'item-1' } }],
    quizModules: [{ moduleId: 'mod-1', masteryThreshold: 0.8 }],
}

const mockEnrollment = {
    id: 'e1',
    userId: 'user-1',
    offeringId: 'o1',
    offeringRole: 'STUDENT',
    hidden: false,
    createdAt: new Date(),
}

const mockAttempt = {
    id: 'attempt-1',
    quizId: 'quiz-1',
    enrollmentId: 'e1',
    status: 'IN_PROGRESS',
    fixedLengthN: 5,
    startedAt: new Date(),
    finishedAt: null,
    engineVersion: null,
    engineMasteryAtFinish: null,
    scopeSnapshot: null,
    quiz: { id: 'quiz-1', title: 'Test Quiz', feedbackVisibility: 'full', quizModules: [], offering: { modules: [] } },
    responses: [],
    enrollment: { userId: 'user-1', thetas: [] },
}

const mockItem = {
    id: 'item-1',
    stem: 'What is 2+2?',
    options: [
        { id: 'opt-1', label: 'A', text: '4', isCorrect: true, justification: null },
        { id: 'opt-2', label: 'B', text: '3', isCorrect: false, justification: null },
        { id: 'opt-3', label: 'C', text: '5', isCorrect: false, justification: null },
        { id: 'opt-4', label: 'D', text: '22', isCorrect: false, justification: null },
        { id: 'opt-5', label: 'E', text: '6', isCorrect: false, justification: null },
    ],
    moduleId: 'mod-1',
    module: { id: 'mod-1', name: 'Module 1' },
    bloom: 'REMEMBER',
    figureUrl: null,
    reference: null,
}

// POST /api/quiz/attempt/init

describe('POST /api/quiz/attempt/init', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await initRoute(makeRequest({ quizId: 'quiz-1' }))
        expect(res.status).toBe(401)
    })

    it('returns 400 when quizId is missing', async () => {
        asAuthenticated()
        const res = await initRoute(makeRequest({}))
        expect(res.status).toBe(400)
    })

    it('returns 404 when quiz is not found or inactive', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(null)
        const res = await initRoute(makeRequest({ quizId: 'quiz-1' }))
        expect(res.status).toBe(404)
    })

    it('returns 403 when user not enrolled as student', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null)
        const res = await initRoute(makeRequest({ quizId: 'quiz-1' }))
        expect(res.status).toBe(403)
    })

    it('returns 200 with existing IN_PROGRESS attempt', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(mockEnrollment as never)
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.attempt.update).mockResolvedValue(mockAttempt as never)
        vi.mocked(fastApiClient.initAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            theta: { 'mod-1': 0 },
            next_item: { item_id: 'item-1', skill: 'mod-1', stem: 'Test?', options: [] },
            next_action: 'CONTINUE',
        })
        const res = await initRoute(makeRequest({ quizId: 'quiz-1' }))
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.attemptId).toBe('attempt-1')
    })

    it('returns 200 and creates new attempt when none exists', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(mockEnrollment as never)
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.attempt.create).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.attempt.update).mockResolvedValue(mockAttempt as never)
        vi.mocked(fastApiClient.initAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            theta: { 'mod-1': 0 },
            next_item: { item_id: 'item-1', skill: 'mod-1', stem: 'Test?', options: [] },
            next_action: 'CONTINUE',
        })
        const res = await initRoute(makeRequest({ quizId: 'quiz-1' }))
        expect(res.status).toBe(200)
        expect(prisma.attempt.create).toHaveBeenCalled()
    })

    it('returns 500 and cleans up attempt when FastAPI fails', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(mockEnrollment as never)
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.attempt.create).mockResolvedValue(mockAttempt as never)
        vi.mocked(fastApiClient.initAttempt).mockRejectedValue(new Error('FastAPI down'))
        vi.mocked(prisma.attempt.delete).mockResolvedValue(mockAttempt as never)
        const res = await initRoute(makeRequest({ quizId: 'quiz-1' }))
        expect(res.status).toBe(500)
        expect(prisma.attempt.delete).toHaveBeenCalledWith({ where: { id: 'attempt-1' } })
    })
})

// POST /api/quiz/attempt/step

describe('POST /api/quiz/attempt/step', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when required fields are missing', async () => {
        const res = await stepRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(400)
    })

    it('returns 404 when attempt not found or not in progress', async () => {
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null)
        const res = await stepRoute(makeRequest({ attemptId: 'attempt-1', itemId: 'item-1', answerIndex: 0 }))
        expect(res.status).toBe(404)
    })

    it('returns 200 with next item from FastAPI', async () => {
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem as never)
        vi.mocked(prisma.response.create).mockResolvedValue({
            id: 'resp-1',
            attemptId: 'attempt-1',
            itemId: 'item-1',
            selectedLabel: 'A',
            isCorrect: true,
            responseTimeMs: 1000,
            answeredAt: new Date(),
            askedAt: new Date(),
            itemOptionId: 'opt-1',
            engineMasterySnapshot: null,
        })
        vi.mocked(fastApiClient.stepAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            theta: { 'mod-1': 0.5 },
            mastery: { 'mod-1': true },
            next_action: 'CONTINUE',
            next_item: { item_id: 'item-2', skill: 'mod-1', stem: 'Next?', options: [] },
        })
        vi.mocked(prisma.attempt.update).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.response.update).mockResolvedValue({} as never)
        const res = await stepRoute(makeRequest({ attemptId: 'attempt-1', itemId: 'item-1', answerIndex: 0 }))
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.feedback.isCorrect).toBe(true)
    })

    it('marks attempt COMPLETED when FastAPI returns FINISH', async () => {
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem as never)
        vi.mocked(prisma.response.create).mockResolvedValue({ id: 'resp-1', itemOptionId: 'opt-1' } as never)
        vi.mocked(fastApiClient.stepAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            theta: { 'mod-1': 1.0 },
            mastery: { 'mod-1': true },
            next_action: 'FINISH',
        })
        vi.mocked(prisma.attempt.update).mockResolvedValue({ ...mockAttempt, status: 'COMPLETED' } as never)
        vi.mocked(prisma.response.update).mockResolvedValue({} as never)
        const res = await stepRoute(makeRequest({ attemptId: 'attempt-1', itemId: 'item-1', answerIndex: 0 }))
        expect(res.status).toBe(200)
        expect(prisma.attempt.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
        )
    })
})

// POST /api/quiz/attempt/feedback

describe('POST /api/quiz/attempt/feedback', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 401 when unauthenticated', async () => {
        asUnauthenticated()
        const res = await feedbackRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(401)
    })

    it('returns 400 when attemptId is missing', async () => {
        asAuthenticated()
        const res = await feedbackRoute(makeRequest({}))
        expect(res.status).toBe(400)
    })

    it('returns 404 when attempt not found', async () => {
        asAuthenticated()
        vi.mocked(prisma.attempt.findUnique).mockResolvedValue(null)
        const res = await feedbackRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(404)
    })

    it('returns 403 when user does not own the attempt', async () => {
        asAuthenticated()
        vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
            ...mockAttempt,
            enrollment: { userId: 'other-user', thetas: [] },
        } as never)
        const res = await feedbackRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(403)
    })

    it('returns 200 with feedback data', async () => {
        asAuthenticated()
        vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
            ...mockAttempt,
            status: 'COMPLETED',
            finishedAt: new Date(),
            enrollment: { userId: 'user-1', thetas: [] },
            quiz: {
                id: 'quiz-1',
                title: 'Test Quiz',
                feedbackVisibility: 'full',
                quizModules: [],
                offering: { modules: [] },
            },
            responses: [],
        } as never)
        const res = await feedbackRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.attemptId).toBe('attempt-1')
        expect(data.quizTitle).toBe('Test Quiz')
    })
})

// POST /api/quiz/attempt/results

describe('POST /api/quiz/attempt/results', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when attemptId is missing', async () => {
        const res = await resultsRoute(makeRequest({}))
        expect(res.status).toBe(400)
    })

    it('returns 404 when attempt not found', async () => {
        vi.mocked(prisma.attempt.findUnique).mockResolvedValue(null)
        const res = await resultsRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(404)
    })

    it('returns 200 with correct/total counts', async () => {
        vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
            ...mockAttempt,
            responses: [
                { id: 'r1', itemId: 'item-1', selectedLabel: 'A', isCorrect: true, answeredAt: new Date() },
                { id: 'r2', itemId: 'item-1', selectedLabel: 'B', isCorrect: false, answeredAt: new Date() },
            ],
        } as never)
        const res = await resultsRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.totalQuestions).toBe(2)
        expect(data.correctAnswers).toBe(1)
        expect(data.percentage).toBe(50)
    })
})
