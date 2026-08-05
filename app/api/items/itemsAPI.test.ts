// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        item: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            updateMany: vi.fn(),
            deleteMany: vi.fn(),
        },
        itemOption: {
            create: vi.fn(),
            deleteMany: vi.fn(),
        },
        module: { findFirst: vi.fn() },
        course: { findUnique: vi.fn() },
        $transaction: vi.fn(),
    },
}))

const { prisma } = await import('@/lib/prisma')
const { GET, POST, PATCH, DELETE } = await import('./route')
const { DELETE: DELETEById, PATCH: PATCHById, PUT: PUTById } = await import('./[id]/route')
const { GET: exportRoute } = await import('./export/route')

const makeRequest = (body: object, method = 'POST') =>
    new Request('http://localhost/api/items', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

const makeGetRequest = (params: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/items')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return new Request(url)
}

const validOptions = [
    { label: 'A', text: 'Option A', isCorrect: true },
    { label: 'B', text: 'Option B', isCorrect: false },
]

const mockItem = {
    id: 'item-1',
    courseId: 'course-1',
    moduleId: 'mod-1',
    externalQuestionId: 'Q1',
    bloom: 'REMEMBER',
    stem: 'What is 2+2?',
    reference: null,
    figureUrl: null,
    active: true,
    irtA: 1.0,
    irtB: 0.0,
    irtC: 0.5,
    attemptsCount: null,
    average: null,
    ptBi: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    options: [
        { id: 'opt-1', itemId: 'item-1', label: 'A', text: 'Option A', justification: null, isCorrect: true },
        { id: 'opt-2', itemId: 'item-1', label: 'B', text: 'Option B', justification: null, isCorrect: false },
    ],
    module: { id: 'mod-1', name: 'Module 1' },
}

// GET /api/items

describe('GET /api/items', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when courseId is missing', async () => {
        const res = await GET(makeGetRequest())
        expect(res.status).toBe(400)
    })

    it('returns 200 with active items', async () => {
        vi.mocked(prisma.item.findMany).mockResolvedValue([mockItem])
        const res = await GET(makeGetRequest({ courseId: 'course-1' }))
        const data = await res.json()
        expect(res.status).toBe(200)
        expect(data.items).toHaveLength(1)
        expect(data.items[0].stem).toBe('What is 2+2?')
    })

    it('returns 500 on database error', async () => {
        vi.mocked(prisma.item.findMany).mockRejectedValue(new Error('DB error'))
        const res = await GET(makeGetRequest({ courseId: 'course-1' }))
        expect(res.status).toBe(500)
    })
})

// POST /api/items

describe('POST /api/items', () => {
    beforeEach(() => vi.clearAllMocks())

    const validBody = {
        courseId: 'course-1',
        externalQuestionId: 'Q1',
        moduleId: 'mod-1',
        bloom: 'REMEMBER',
        stem: 'What is 2+2?',
        options: validOptions,
    }

    it('returns 400 when required fields are missing', async () => {
        const res = await POST(makeRequest({ courseId: 'course-1' }))
        expect(res.status).toBe(400)
    })

    it('returns 400 for invalid bloom category', async () => {
        const res = await POST(makeRequest({ ...validBody, bloom: 'INVALID' }))
        expect(res.status).toBe(400)
    })

    it('returns 400 when no option is marked correct', async () => {
        vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'course-1', code: 'CSC108', title: 'Intro', createdAt: new Date() })
        vi.mocked(prisma.module.findFirst).mockResolvedValue({ id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() })
        vi.mocked(prisma.item.findFirst).mockResolvedValue(null)
        const res = await POST(makeRequest({
            ...validBody,
            options: [
                { label: 'A', text: 'Option A', isCorrect: false },
                { label: 'B', text: 'Option B', isCorrect: false },
            ],
        }))
        expect(res.status).toBe(400)
    })

    it('returns 400 for duplicate option labels', async () => {
        vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'course-1', code: 'CSC108', title: 'Intro', createdAt: new Date() })
        vi.mocked(prisma.module.findFirst).mockResolvedValue({ id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() })
        vi.mocked(prisma.item.findFirst).mockResolvedValue(null)
        const res = await POST(makeRequest({
            ...validBody,
            options: [
                { label: 'A', text: 'Option A', isCorrect: true },
                { label: 'A', text: 'Option B', isCorrect: false },
            ],
        }))
        expect(res.status).toBe(400)
    })

    it('returns 400 for duplicate option texts', async () => {
        vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'course-1', code: 'CSC108', title: 'Intro', createdAt: new Date() })
        vi.mocked(prisma.module.findFirst).mockResolvedValue({ id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() })
        vi.mocked(prisma.item.findFirst).mockResolvedValue(null)
        const res = await POST(makeRequest({
            ...validBody,
            options: [
                { label: 'A', text: 'Same text', isCorrect: true },
                { label: 'B', text: 'Same text', isCorrect: false },
            ],
        }))
        expect(res.status).toBe(400)
    })

    it('returns 400 when externalQuestionId is duplicate in course', async () => {
        vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'course-1', code: 'CSC108', title: 'Intro', createdAt: new Date() })
        vi.mocked(prisma.module.findFirst).mockResolvedValue({ id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() })
        vi.mocked(prisma.item.findFirst).mockResolvedValue(mockItem)
        const res = await POST(makeRequest(validBody))
        expect(res.status).toBe(400)
    })

    it('returns 201 with created item', async () => {
        vi.mocked(prisma.course.findUnique).mockResolvedValue({ id: 'course-1', code: 'CSC108', title: 'Intro', createdAt: new Date() })
        vi.mocked(prisma.module.findFirst).mockResolvedValue({ id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() })
        vi.mocked(prisma.item.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma))
        vi.mocked(prisma.item.create).mockResolvedValue(mockItem)
        vi.mocked(prisma.itemOption.create).mockResolvedValue(mockItem.options[0])
        const res = await POST(makeRequest(validBody))
        expect(res.status).toBe(201)
        const data = await res.json()
        expect(data.item.stem).toBe('What is 2+2?')
    })
})

// PATCH /api/items (bulk active status)

describe('PATCH /api/items', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when ids is missing', async () => {
        const res = await PATCH(makeRequest({ active: true }, 'PATCH'))
        expect(res.status).toBe(400)
    })

    it('returns 400 when active is not a boolean', async () => {
        const res = await PATCH(makeRequest({ ids: ['item-1'], active: 'yes' }, 'PATCH'))
        expect(res.status).toBe(400)
    })

    it('returns 200 on successful bulk update', async () => {
        vi.mocked(prisma.item.updateMany).mockResolvedValue({ count: 2 })
        const res = await PATCH(makeRequest({ ids: ['item-1', 'item-2'], active: false }, 'PATCH'))
        expect(res.status).toBe(200)
    })
})

// DELETE /api/items (bulk)

describe('DELETE /api/items', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when ids is missing', async () => {
        const res = await DELETE(makeRequest({}, 'DELETE'))
        expect(res.status).toBe(400)
    })

    it('returns 200 on successful bulk delete', async () => {
        vi.mocked(prisma.item.deleteMany).mockResolvedValue({ count: 1 })
        const res = await DELETE(makeRequest({ ids: ['item-1'] }, 'DELETE'))
        expect(res.status).toBe(200)
    })
})

// DELETE /api/items/[id]

describe('DELETE /api/items/[id]', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 404 when item not found', async () => {
        vi.mocked(prisma.item.findUnique).mockResolvedValue(null)
        const res = await DELETEById(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(404)
    })

    it('returns 200 on successful delete', async () => {
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem)
        vi.mocked(prisma.item.delete).mockResolvedValue(mockItem)
        const res = await DELETEById(makeRequest({}, 'DELETE'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(200)
    })
})

// PATCH /api/items/[id]

describe('PATCH /api/items/[id]', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when active is not a boolean', async () => {
        const res = await PATCHById(makeRequest({ active: 'yes' }, 'PATCH'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(400)
    })

    it('returns 404 when item not found', async () => {
        vi.mocked(prisma.item.findUnique).mockResolvedValue(null)
        const res = await PATCHById(makeRequest({ active: false }, 'PATCH'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(404)
    })

    it('returns 200 with updated item', async () => {
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem)
        vi.mocked(prisma.item.update).mockResolvedValue({ ...mockItem, active: false })
        const res = await PATCHById(makeRequest({ active: false }, 'PATCH'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(200)
    })
})

// PUT /api/items/[id]

describe('PUT /api/items/[id]', () => {
    beforeEach(() => vi.clearAllMocks())

    const validUpdateBody = {
        externalQuestionId: 'Q1',
        moduleId: 'mod-1',
        bloom: 'REMEMBER',
        stem: 'Updated stem',
        options: validOptions,
    }

    it('returns 400 when required fields are missing', async () => {
        const res = await PUTById(makeRequest({ bloom: 'REMEMBER' }, 'PUT'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(400)
    })

    it('returns 400 for invalid bloom category', async () => {
        const res = await PUTById(makeRequest({ ...validUpdateBody, bloom: 'INVALID' }, 'PUT'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(400)
    })

    it('returns 404 when item not found', async () => {
        vi.mocked(prisma.item.findUnique).mockResolvedValue(null)
        const res = await PUTById(makeRequest(validUpdateBody, 'PUT'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(404)
    })

    it('returns 400 when no option is marked correct', async () => {
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem)
        vi.mocked(prisma.module.findFirst).mockResolvedValue({ id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() })
        vi.mocked(prisma.item.findFirst).mockResolvedValue(null)
        const res = await PUTById(makeRequest({
            ...validUpdateBody,
            options: [
                { label: 'A', text: 'Option A', isCorrect: false },
                { label: 'B', text: 'Option B', isCorrect: false },
            ],
        }, 'PUT'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(400)
    })

    it('returns 200 with updated item', async () => {
        vi.mocked(prisma.item.findUnique).mockResolvedValue(mockItem)
        vi.mocked(prisma.module.findFirst).mockResolvedValue({ id: 'mod-1', name: 'Module 1', offeringId: 'o1', createdAt: new Date() })
        vi.mocked(prisma.item.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma))
        vi.mocked(prisma.item.update).mockResolvedValue({ ...mockItem, stem: 'Updated stem' })
        vi.mocked(prisma.itemOption.deleteMany).mockResolvedValue({ count: 2 })
        vi.mocked(prisma.itemOption.create).mockResolvedValue(mockItem.options[0])
        const res = await PUTById(makeRequest(validUpdateBody, 'PUT'), { params: Promise.resolve({ id: 'item-1' }) })
        expect(res.status).toBe(200)
    })
})

// GET /api/items/export

describe('GET /api/items/export', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns 400 when courseId is missing', async () => {
        const res = await exportRoute(new Request('http://localhost/api/items/export'))
        expect(res.status).toBe(400)
    })

    it('returns 200 with Content-Disposition header for xlsx', async () => {
        vi.mocked(prisma.item.findMany).mockResolvedValue([mockItem])
        const res = await exportRoute(new Request('http://localhost/api/items/export?courseId=course-1'))
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Disposition')).toContain('attachment')
    })
})
