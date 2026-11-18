// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth', () => ({ getSession: vi.fn() }))

// Access control is covered by lib/authz.test.ts and app/api/authorization.test.ts
vi.mock('@/lib/authz', () => import('@/mocks/authz'))

vi.mock('@/lib/prisma', () => {
    const prisma = {
        // Interactive transactions run against the same mocked client
        $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
        $queryRaw: vi.fn(),
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
            count: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    }
    return { prisma }
})

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
const { signPresentedItem, verifyPresentedItem } = await import('@/lib/presented-item')

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
    _count: { responses: 0 },
    enrollment: { userId: 'user-1', thetas: [] },
}

/** A step request answering item-1, which the server presented as the attempt's first item. */
const stepBody = (overrides: object = {}) => ({
    attemptId: 'attempt-1',
    itemId: 'item-1',
    itemToken: signPresentedItem({ attemptId: 'attempt-1', itemId: 'item-1', position: 0 }),
    answerIndex: 0,
    ...overrides,
})

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
        const res = await initRoute(makeRequest({ quizId: 'quiz-1', offeringId: 'o1' }))
        expect(res.status).toBe(404)
    })

    it('returns 403 when user not enrolled as student', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(null)
        const res = await initRoute(makeRequest({ quizId: 'quiz-1', offeringId: 'o1' }))
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
        const res = await initRoute(makeRequest({ quizId: 'quiz-1', offeringId: 'o1' }))
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.attemptId).toBe('attempt-1')
    })

    it('returns a token for the first item, positioned after any existing responses', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(mockEnrollment as never)
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.attempt.update).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.response.count).mockResolvedValue(2)
        vi.mocked(fastApiClient.initAttempt).mockResolvedValue({
            attempt_id: 'attempt-1',
            theta: { 'mod-1': 0 },
            next_item: { item_id: 'item-3', skill: 'mod-1', stem: 'Test?', options: [] },
            next_action: 'CONTINUE',
        })

        const data = await (await initRoute(makeRequest({ quizId: 'quiz-1', offeringId: 'o1' }))).json()

        expect(prisma.response.count).toHaveBeenCalledWith({ where: { attemptId: 'attempt-1' } })
        expect(verifyPresentedItem(data.nextItemToken)).toEqual({ attemptId: 'attempt-1', itemId: 'item-3', position: 2 })
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
        const res = await initRoute(makeRequest({ quizId: 'quiz-1', offeringId: 'o1' }))
        expect(res.status).toBe(200)
        expect(prisma.attempt.create).toHaveBeenCalled()
    })

    it('ignores client-supplied concepts and prior, using the quiz modules and engine defaults', async () => {
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

        const res = await initRoute(makeRequest({
            quizId: 'quiz-1',
            offeringId: 'o1',
            concepts: ['mod-from-another-quiz'],
            priorMu: 10,
            priorSigma2: 0.0001,
        }))

        expect(res.status).toBe(200)
        expect(fastApiClient.initAttempt).toHaveBeenCalledWith({ attempt_id: 'attempt-1', concepts: ['mod-1'] })
    })

    it('returns 500 and cleans up attempt when FastAPI fails', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(mockEnrollment as never)
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.attempt.create).mockResolvedValue(mockAttempt as never)
        vi.mocked(fastApiClient.initAttempt).mockRejectedValue(new Error('FastAPI down'))
        vi.mocked(prisma.attempt.delete).mockResolvedValue(mockAttempt as never)
        const res = await initRoute(makeRequest({ quizId: 'quiz-1', offeringId: 'o1' }))
        expect(res.status).toBe(500)
        expect(prisma.attempt.delete).toHaveBeenCalledWith({ where: { id: 'attempt-1' } })
    })

    it('returns 500 but keeps a resumed attempt and its answers when FastAPI fails', async () => {
        asAuthenticated()
        vi.mocked(prisma.quiz.findFirst).mockResolvedValue(mockQuiz as never)
        vi.mocked(prisma.enrollment.findFirst).mockResolvedValue(mockEnrollment as never)
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(mockAttempt as never)
        vi.mocked(fastApiClient.initAttempt).mockRejectedValue(new Error('FastAPI down'))

        const res = await initRoute(makeRequest({ quizId: 'quiz-1', offeringId: 'o1' }))

        expect(res.status).toBe(500)
        expect(prisma.attempt.create).not.toHaveBeenCalled()
        expect(prisma.attempt.delete).not.toHaveBeenCalled()
    })
})

// POST /api/quiz/attempt/step

describe('POST /api/quiz/attempt/step', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // No responses recorded yet when the attempt row is locked
        vi.mocked(prisma.response.count).mockResolvedValue(0)
    })

    it('returns 400 when required fields are missing', async () => {
        const res = await stepRoute(makeRequest({ attemptId: 'attempt-1' }))
        expect(res.status).toBe(400)
    })

    it('returns 404 when attempt not found or not in progress', async () => {
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(null)
        const res = await stepRoute(makeRequest(stepBody()))
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
        const res = await stepRoute(makeRequest(stepBody()))
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data.feedback.isCorrect).toBe(true)
        // The next item is presented after the answer just recorded
        expect(verifyPresentedItem(data.nextItemToken)).toEqual({ attemptId: 'attempt-1', itemId: 'item-2', position: 1 })
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
        const res = await stepRoute(makeRequest(stepBody()))
        expect(res.status).toBe(200)
        expect(prisma.attempt.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) })
        )
    })

    it('returns 400 when itemToken is missing', async () => {
        const res = await stepRoute(makeRequest(stepBody({ itemToken: undefined })))
        expect(res.status).toBe(400)
        expect(prisma.response.create).not.toHaveBeenCalled()
    })

    const presentedItem1 = signPresentedItem({ attemptId: 'attempt-1', itemId: 'item-1', position: 0 })

    it.each([
        ['an item other than the one presented', { itemId: 'easy-item' }, 0],
        ['an item with a token from another attempt', {
            itemToken: signPresentedItem({ attemptId: 'attempt-2', itemId: 'item-1', position: 0 }),
        }, 0],
        ['again, with the token used for an earlier answer', { itemToken: presentedItem1 }, 1],
        ['an item with a forged token', { itemToken: 'eyJhIjoiYXR0ZW1wdC0xIn0.not-a-signature' }, 0],
    ])('returns 409 and records nothing when answering %s', async (_name, overrides, responsesSoFar) => {
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(
            { ...mockAttempt, _count: { responses: responsesSoFar } } as never,
        )
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem as never)

        const res = await stepRoute(makeRequest(stepBody(overrides)))

        expect(res.status).toBe(409)
        expect((await res.json()).code).toBe('ITEM_NOT_PRESENTED')
        expect(prisma.response.create).not.toHaveBeenCalled()
        expect(fastApiClient.stepAttempt).not.toHaveBeenCalled()
    })

    it('locks the attempt row, then re-counts responses, before recording the answer', async () => {
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem as never)
        vi.mocked(prisma.response.create).mockResolvedValue({ id: 'resp-1' } as never)
        vi.mocked(fastApiClient.stepAttempt).mockResolvedValue({
            attempt_id: 'attempt-1', theta: {}, mastery: {}, next_action: 'FINISH',
        })

        await stepRoute(makeRequest(stepBody()))

        expect(prisma.$transaction).toHaveBeenCalledTimes(1)
        const [sql, ...values] = vi.mocked(prisma.$queryRaw).mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]]
        expect(sql.join('?')).toMatch(/SELECT id FROM "Attempt" WHERE id = \?::uuid FOR UPDATE/)
        expect(values).toEqual(['attempt-1'])
        expect(prisma.response.count).toHaveBeenCalledWith({ where: { attemptId: 'attempt-1' } })

        const lockedAt = vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0]
        const countedAt = vi.mocked(prisma.response.count).mock.invocationCallOrder[0]
        const createdAt = vi.mocked(prisma.response.create).mock.invocationCallOrder[0]
        expect(lockedAt).toBeLessThan(countedAt)
        expect(countedAt).toBeLessThan(createdAt)
    })

    it('returns 409 and records nothing when a concurrent request answered first', async () => {
        // The unlocked check saw no responses, but by the time the lock is held a
        // concurrent request with the same token has recorded one
        vi.mocked(prisma.attempt.findFirst).mockResolvedValue(mockAttempt as never)
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem as never)
        vi.mocked(prisma.response.count).mockResolvedValue(1)

        const res = await stepRoute(makeRequest(stepBody()))

        expect(res.status).toBe(409)
        expect((await res.json()).code).toBe('ITEM_NOT_PRESENTED')
        expect(prisma.response.create).not.toHaveBeenCalled()
        expect(fastApiClient.stepAttempt).not.toHaveBeenCalled()
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
