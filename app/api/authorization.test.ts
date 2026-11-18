// @vitest-environment node
/**
 * Access-control matrix for the API routes, using the real lib/authz helpers.
 *
 * Each protected handler is called as:
 *   - an anonymous visitor            -> 401
 *   - a user with no role in the course, and staff of a DIFFERENT course -> 403
 *   - a student of the course, for staff-only routes                     -> 403
 * and every denial must leave the database untouched.
 *
 * The target records all live in course c1 / offering o1.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type Role = 'STUDENT' | 'TA' | 'INSTRUCTOR'
type Enrollment = { offeringId: string; courseId: string; role: Role }

const SESSION = { userId: 'caller', username: 'caller' }

// Who the caller is, set per test
const caller = vi.hoisted(() => ({
  loggedIn: true,
  isAdmin: false,
  enrollments: [] as { offeringId: string; courseId: string; role: string }[],
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => (caller.loggedIn ? SESSION : null)),
  verifyToken: vi.fn(() => (caller.loggedIn ? SESSION : null)),
}))

vi.mock('@/lib/fastapi-client', () => ({
  fastApiClient: { initAttempt: vi.fn(), stepAttempt: vi.fn() },
}))

vi.mock('@/lib/prisma', () => {
  const model = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  })
  return {
    prisma: {
      user: model(),
      enrollment: model(),
      courseOffering: model(),
      course: model(),
      module: model(),
      item: model(),
      itemOption: model(),
      quiz: model(),
      quizModule: model(),
      attempt: model(),
      response: model(),
      theta: model(),
      $transaction: vi.fn(),
    },
  }
})

const { prisma } = await import('@/lib/prisma')

const usersRoute = await import('./users/route')
const itemsRoute = await import('./items/route')
const itemRoute = await import('./items/[id]/route')
const exportRoute = await import('./items/export/route')
const uploadRoute = await import('./upload/route')
const modulesRoute = await import('./modules/route')
const dataAttemptRoute = await import('./data/attempt/route')
const dataQuestionRoute = await import('./data/question/route')
const dataThetaRoute = await import('./data/theta/route')
const quizzesRoute = await import('./quizzes/route')
const quizRoute = await import('./quizzes/[id]/route')
const studentsRoute = await import('./students/route')
const enrollmentsRoute = await import('./enrollments/route')
const stepRoute = await import('./quiz/attempt/step/route')
const resultsRoute = await import('./quiz/attempt/results/route')

// ─── Request builders ──────────────────────────────────────────────────────────

const BASE = 'http://localhost'

const req = (path: string, method = 'GET', body?: object) =>
  new NextRequest(`${BASE}${path}`, {
    method,
    headers: {
      ...(caller.loggedIn ? { Cookie: 'session-token=t' } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

const uploadReq = () => {
  const form = new FormData()
  form.append('courseId', 'c1')
  form.append('offeringId', 'o1')
  form.append('file', new File(['question_id\n'], 'bank.csv', { type: 'text/csv' }))
  return new Request(`${BASE}/api/upload`, { method: 'POST', body: form })
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

const itemBody = {
  courseId: 'c1',
  externalQuestionId: 'Q1',
  moduleId: 'm1',
  bloom: 'REMEMBER',
  stem: 'What?',
  options: [{ label: 'A', text: 'x', isCorrect: true }],
}

const quizBody = {
  courseOfferingId: 'o1',
  title: 'Quiz',
  includedModuleIds: ['m1'],
  masteryThresholds: [0.5],
  fixedLength: 5,
}

// ─── Route table ───────────────────────────────────────────────────────────────

type Case = { name: string; call: () => Promise<Response>; staffOnly: boolean }

const cases: Case[] = [
  // Admin-only
  { name: 'GET /api/users', call: () => usersRoute.GET(), staffOnly: true },
  { name: 'POST /api/users', call: () => usersRoute.POST(req('/api/users', 'POST', { username: 'x' })), staffOnly: true },

  // Question bank
  { name: 'GET /api/items', call: () => itemsRoute.GET(req('/api/items?courseId=c1')), staffOnly: true },
  { name: 'POST /api/items', call: () => itemsRoute.POST(req('/api/items', 'POST', itemBody)), staffOnly: true },
  {
    name: 'PATCH /api/items',
    call: () => itemsRoute.PATCH(req('/api/items', 'PATCH', { ids: ['i1'], active: false })),
    staffOnly: true,
  },
  { name: 'DELETE /api/items', call: () => itemsRoute.DELETE(req('/api/items', 'DELETE', { ids: ['i1'] })), staffOnly: true },
  {
    name: 'PATCH /api/items/[id]',
    call: () => itemRoute.PATCH(req('/api/items/i1', 'PATCH', { active: false }), params('i1')),
    staffOnly: true,
  },
  {
    name: 'PUT /api/items/[id]',
    call: () => itemRoute.PUT(req('/api/items/i1', 'PUT', itemBody), params('i1')),
    staffOnly: true,
  },
  {
    name: 'DELETE /api/items/[id]',
    call: () => itemRoute.DELETE(req('/api/items/i1', 'DELETE'), params('i1')),
    staffOnly: true,
  },
  { name: 'GET /api/items/export', call: () => exportRoute.GET(req('/api/items/export?courseId=c1')), staffOnly: true },
  { name: 'POST /api/upload', call: () => uploadRoute.POST(uploadReq()), staffOnly: true },
  { name: 'GET /api/modules', call: () => modulesRoute.GET(req('/api/modules?courseOfferingId=o1')), staffOnly: true },

  // Analytics
  { name: 'GET /api/data/attempt', call: () => dataAttemptRoute.GET(req('/api/data/attempt?quizId=q1')), staffOnly: true },
  { name: 'GET /api/data/question', call: () => dataQuestionRoute.GET(req('/api/data/question?quizId=q1')), staffOnly: true },
  {
    name: 'GET /api/data/theta',
    call: () => dataThetaRoute.GET(req('/api/data/theta?courseOfferingId=o1')),
    staffOnly: true,
  },

  // Quizzes
  {
    name: 'GET /api/quizzes',
    call: () => quizzesRoute.GET(req('/api/quizzes?courseOfferingId=o1')),
    staffOnly: false, // students may list (active) quizzes
  },
  { name: 'POST /api/quizzes', call: () => quizzesRoute.POST(req('/api/quizzes', 'POST', quizBody)), staffOnly: true },
  {
    name: 'DELETE /api/quizzes',
    call: () => quizzesRoute.DELETE(req('/api/quizzes', 'DELETE', { ids: ['q1'] })),
    staffOnly: true,
  },
  {
    name: 'PUT /api/quizzes/[id]',
    call: () => quizRoute.PUT(req('/api/quizzes/q1', 'PUT', { title: 'Renamed' }), params('q1')),
    staffOnly: true,
  },
  {
    name: 'DELETE /api/quizzes/[id]',
    call: () => quizRoute.DELETE(req('/api/quizzes/q1', 'DELETE'), params('q1')),
    staffOnly: true,
  },

  // Roster
  {
    name: 'GET /api/students',
    call: () => studentsRoute.GET(req('/api/students?courseOfferingId=o1')),
    staffOnly: true,
  },
  {
    name: 'POST /api/students',
    call: () =>
      studentsRoute.POST(req('/api/students', 'POST', { courseOfferingId: 'o1', students: [{ username: 'mallory' }] })),
    staffOnly: true,
  },
  {
    name: 'DELETE /api/enrollments',
    call: () => enrollmentsRoute.DELETE(req('/api/enrollments', 'DELETE', { enrollmentIds: ['e1'] })),
    staffOnly: true,
  },
  {
    name: 'PATCH /api/enrollments',
    call: () => enrollmentsRoute.PATCH(req('/api/enrollments', 'PATCH', { enrollmentIds: ['e1'], hidden: true })),
    staffOnly: true,
  },

  // Another student's attempt (attempt a1 belongs to "victim")
  {
    name: 'POST /api/quiz/attempt/step',
    call: () => stepRoute.POST(req('/api/quiz/attempt/step', 'POST', { attemptId: 'a1', itemId: 'i1', itemToken: 't', answerIndex: 0 })),
    staffOnly: true,
  },
  {
    name: 'POST /api/quiz/attempt/results',
    call: () => resultsRoute.POST(req('/api/quiz/attempt/results', 'POST', { attemptId: 'a1' })),
    staffOnly: true,
  },
]

// ─── Database fixtures ─────────────────────────────────────────────────────────

/** Every write method on the mocked client, so denials can assert nothing was written. */
const writeMocks = () => {
  const writes = ['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert']
  const models = Object.values(prisma as unknown as Record<string, Record<string, unknown>>)
  const fns = models.flatMap((m) =>
    typeof m === 'object' && m ? writes.map((w) => m[w]).filter(Boolean) : [],
  )
  return [...fns, (prisma as unknown as { $transaction: unknown }).$transaction] as ReturnType<typeof vi.fn>[]
}

const setUpFixtures = (targetEnrollmentRole: Role = 'STUDENT') => {
  vi.mocked(prisma.user.findUnique).mockImplementation((async () => ({ isAdmin: caller.isAdmin })) as never)

  // Authorization queries filter by the caller's userId; other enrollment lookups are
  // the target enrollment e1 (a member of o1).
  vi.mocked(prisma.enrollment.findMany).mockImplementation((async (args: {
    where: { userId?: string; offeringRole?: { in: string[] } }
    select?: { offering?: unknown }
  }) => {
    if (args?.where?.userId === SESSION.userId) {
      const roles = args.where.offeringRole?.in ?? []
      const mine = caller.enrollments.filter((e) => roles.includes(e.role))
      return args.select?.offering
        ? mine.map((e) => ({ offering: { courseId: e.courseId } }))
        : mine.map((e) => ({ offeringId: e.offeringId }))
    }
    return [{ id: 'e1', offeringId: 'o1', offeringRole: targetEnrollmentRole }]
  }) as never)

  vi.mocked(prisma.item.findUnique).mockResolvedValue({ id: 'i1', courseId: 'c1', options: [] } as never)
  vi.mocked(prisma.item.findMany).mockResolvedValue([{ id: 'i1', courseId: 'c1' }] as never)
  vi.mocked(prisma.quiz.findUnique).mockResolvedValue({
    id: 'q1',
    offeringId: 'o1',
    quizModules: [],
  } as never)
  vi.mocked(prisma.quiz.findMany).mockResolvedValue([{ id: 'q1', offeringId: 'o1' }] as never)
  vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({ id: 'o1', courseId: 'c1' } as never)
  vi.mocked(prisma.attempt.findFirst).mockResolvedValue({
    id: 'a1',
    status: 'IN_PROGRESS',
    quiz: {},
    enrollment: { userId: 'victim' },
    responses: [],
  } as never)
  vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
    id: 'a1',
    enrollment: { userId: 'victim', offeringId: 'o1' },
    quiz: { feedbackVisibility: 'full' },
    responses: [],
  } as never)
}

const become = (opts: { loggedIn?: boolean; isAdmin?: boolean; enrollments?: Enrollment[] }) => {
  caller.loggedIn = opts.loggedIn ?? true
  caller.isAdmin = opts.isAdmin ?? false
  caller.enrollments = opts.enrollments ?? []
}

beforeEach(() => {
  vi.clearAllMocks()
  setUpFixtures()
})

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('anonymous visitors', () => {
  it.each(cases)('$name returns 401 and writes nothing', async ({ call }) => {
    become({ loggedIn: false })
    const res = await call()
    expect(res.status).toBe(401)
    for (const write of writeMocks()) expect(write).not.toHaveBeenCalled()
  })
})

describe('users with no role in the course (staff of a different course)', () => {
  it.each(cases)('$name returns 403 and writes nothing', async ({ call }) => {
    become({ enrollments: [{ offeringId: 'o2', courseId: 'c2', role: 'INSTRUCTOR' }] })
    const res = await call()
    expect(res.status).toBe(403)
    for (const write of writeMocks()) expect(write).not.toHaveBeenCalled()
  })
})

describe('students of the course', () => {
  const student = () => become({ enrollments: [{ offeringId: 'o1', courseId: 'c1', role: 'STUDENT' }] })

  it.each(cases.filter((c) => c.staffOnly))('$name returns 403 and writes nothing', async ({ call }) => {
    student()
    const res = await call()
    expect(res.status).toBe(403)
    for (const write of writeMocks()) expect(write).not.toHaveBeenCalled()
  })

  it('GET /api/quizzes only lists active quizzes, even when asking for inactive ones', async () => {
    student()
    vi.mocked(prisma.quiz.findMany).mockResolvedValue([])

    const res = await quizzesRoute.GET(req('/api/quizzes?courseOfferingId=o1&active=false'))

    expect(res.status).toBe(200)
    expect(prisma.quiz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { offeringId: 'o1', active: true } }),
    )
  })
})

describe('course staff', () => {
  const instructor = () => become({ enrollments: [{ offeringId: 'o1', courseId: 'c1', role: 'INSTRUCTOR' }] })

  it('GET /api/quizzes honours the active filter for staff', async () => {
    instructor()
    vi.mocked(prisma.quiz.findMany).mockResolvedValue([])

    const res = await quizzesRoute.GET(req('/api/quizzes?courseOfferingId=o1&active=false'))

    expect(res.status).toBe(200)
    expect(prisma.quiz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { offeringId: 'o1', active: false } }),
    )
  })

  it('GET /api/items returns the question bank to staff', async () => {
    instructor()
    vi.mocked(prisma.item.findMany).mockResolvedValue([])
    const res = await itemsRoute.GET(req('/api/items?courseId=c1'))
    expect(res.status).toBe(200)
  })

  it.each([
    ['DELETE', () => enrollmentsRoute.DELETE(req('/api/enrollments', 'DELETE', { enrollmentIds: ['e1'] }))],
    ['PATCH', () => enrollmentsRoute.PATCH(req('/api/enrollments', 'PATCH', { enrollmentIds: ['e1'], hidden: true }))],
  ])('%s /api/enrollments cannot change instructor or TA enrollments', async (_method, call) => {
    become({ enrollments: [{ offeringId: 'o1', courseId: 'c1', role: 'TA' }] })
    setUpFixtures('INSTRUCTOR')

    const res = await call()

    expect(res.status).toBe(403)
    expect(prisma.enrollment.deleteMany).not.toHaveBeenCalled()
    expect(prisma.enrollment.updateMany).not.toHaveBeenCalled()
  })

  it('POST /api/upload rejects an offering that belongs to a different course', async () => {
    instructor()
    vi.mocked(prisma.courseOffering.findUnique).mockResolvedValue({ id: 'o1', courseId: 'c-other' } as never)

    const res = await uploadRoute.POST(uploadReq())

    expect(res.status).toBe(404)
    for (const write of writeMocks()) expect(write).not.toHaveBeenCalled()
  })

  it('POST /api/quiz/attempt/results lets staff of the offering view a student attempt', async () => {
    instructor()
    const res = await resultsRoute.POST(req('/api/quiz/attempt/results', 'POST', { attemptId: 'a1' }))
    expect(res.status).toBe(200)
  })
})

describe('the attempt owner', () => {
  it('POST /api/quiz/attempt/results returns the student their own results', async () => {
    become({ enrollments: [{ offeringId: 'o1', courseId: 'c1', role: 'STUDENT' }] })
    vi.mocked(prisma.attempt.findUnique).mockResolvedValue({
      id: 'a1',
      enrollment: { userId: SESSION.userId, offeringId: 'o1' },
      quiz: { feedbackVisibility: 'full' },
      responses: [],
    } as never)

    const res = await resultsRoute.POST(req('/api/quiz/attempt/results', 'POST', { attemptId: 'a1' }))

    expect(res.status).toBe(200)
  })
})
