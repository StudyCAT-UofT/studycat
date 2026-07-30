import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as xlsx from 'xlsx'

vi.mock('@/lib/prisma', () => ({
    prisma: {
        course: { findUnique: vi.fn() },
        courseOffering: { findUnique: vi.fn() },
        item: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            updateMany: vi.fn()
        },
        itemOption: {
            create: vi.fn(),
            update: vi.fn(),
            deleteMany: vi.fn(),
        },
        module: { findFirst: vi.fn(), create: vi.fn() },
        $transaction: vi.fn(),
    },
}))

vi.mock('xlsx', () => ({
    read: vi.fn(),
    utils: {
        sheet_to_json: vi.fn(),
    },
}))

const { POST } = await import('./route')

describe('POST /api/upload', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('Sheet Validation', () => {
        it('returns 400 when Content-Type is not multipart/form-data', async () => {
            const res = await POST(
                new Request('http://localhost/api/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ courseId: 'c1' }),
                })
            )
            expect(res.status).toBe(400)
        })

        it('returns 400 when courseId is missing', async () => {
            const formData = new FormData()
            formData.append('offeringId', 'o1')
            const res = await POST(
                new Request('http://localhost/api/upload', {
                    method: 'POST',
                    body: formData,
                })
            )
            expect(res.status).toBe(400)
        })

        it('returns 400 when offeringId is missing', async () => {
            const formData = new FormData()
            formData.append('courseId', 'c1')
            const res = await POST(
                new Request('http://localhost/api/upload', {
                    method: 'POST',
                    body: formData,
                })
            )
            expect(res.status).toBe(400)
        })

        it('returns 400 when file is missing', async () => {
            const formData = new FormData()
            formData.append('courseId', 'c1')
            formData.append('offeringId', 'o1')
            const res = await POST(
                new Request('http://localhost/api/upload', {
                    method: 'POST',
                    body: formData,
                })
            )
            expect(res.status).toBe(400)
        })
    })

    describe('Character Limits Validation', () => {
        beforeEach(() => {
            vi.mocked(xlsx.read).mockReturnValue({ 
                SheetNames: ['Questions'], 
                Sheets: { Questions: {} } 
            } as xlsx.WorkBook)
        })

        it('skips the row when the question stem exceeds 16,161 characters', async () => {
            const formData = new FormData()
            formData.append('courseId', 'c1')
            formData.append('offeringId', 'o1')
            formData.append('file', new File(['dummy'], 'test.xlsx'))

            vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
                {
                    lecture: 'Module 1',
                    question_id: '001',
                    question: 'A'.repeat(16162),
                    category: 'REMEMBER',
                    answer_a: 'Valid',
                    answer_b: 'Valid',
                    correct_answer: 'A'
                }
            ])

            const res = await POST(
                new Request('http://localhost/api/upload ', { method: 'POST', body: formData })
            )
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.details[0]).toEqual(expect.objectContaining({
                externalQuestionId: '001',
                status: 'skipped: question stem exceeds allowed character limit'
            }))
        })

        it('skips the row when an answer option text exceeds 5,000 characters', async () => {
            const formData = new FormData()
            formData.append('courseId', 'c1')
            formData.append('offeringId', 'o1')
            formData.append('file', new File(['dummy'], 'test.xlsx'))

            vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
                {
                    lecture: 'Module 1',
                    question_id: '002',
                    question: 'Valid question stem',
                    category: 'REMEMBER',
                    answer_a: 'A'.repeat(5001),
                    answer_b: 'Valid',
                    correct_answer: 'B'
                }
            ])

            const res = await POST(
                new Request('http://localhost/api/upload', { method: 'POST', body: formData })
            )
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.details[0]).toEqual(expect.objectContaining({
                externalQuestionId: '002',
                status: 'skipped: option A text exceeds the allowed character limit (5000 characters)'
            }))
        })

        it('skips the row when an answer justification exceeds 16,384 characters', async () => {
            const formData = new FormData()
            formData.append('courseId', 'c1')
            formData.append('offeringId', 'o1')
            formData.append('file', new File(['dummy'], 'test.xlsx'))

            vi.mocked(xlsx.utils.sheet_to_json).mockReturnValue([
                {
                    lecture: 'Module 1',
                    question_id: '003',
                    question: 'Valid question stem',
                    category: 'REMEMBER',
                    answer_a: 'Valid text',
                    answer_justification_a: 'Valid justification',
                    answer_b: 'Valid text 2',
                    answer_justification_b: 'B'.repeat(16385),
                    correct_answer: 'A'
                }
            ])

            const res = await POST(
                new Request('http://localhost/api/upload', { method: 'POST', body: formData })
            )
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.details[0]).toEqual(expect.objectContaining({
                externalQuestionId: '003',
                status: 'skipped: option B justification exceeds the allowed character limit (16384 characters)'
            }))
        })
    })
})
