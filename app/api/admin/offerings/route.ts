import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/offerings
 * 
 * Fetches all course offerings.
 * 
 * Returns:
 * - 200: An array of all course offerings
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 500: Server error
 */
export async function GET() {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        try {
            await requireAdmin(session.userId)
        } catch {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const offerings = await prisma.courseOffering.findMany({
            include: {
                course: true,
                term: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ offerings }, { status: 200 })
    } catch (error) {
        console.error('Failed to fetch offerings:', error)
        return NextResponse.json({ error: 'Failed to fetch offerings' }, { status: 500 })
    }
}

/**
 * POST /api/admin/offerings
 * 
 * Creates a new course offering.
 * 
 * Body:
 * - courseId (required)
 * - termId (required)
 * - display (optional)
 * 
 * Returns:
 * - 201: Created offering
 * - 400: Missing required fields
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 500: Server error
 */
export async function POST(req: Request) {
    try {
        const session = await getSession()
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        try {
            await requireAdmin(session.userId)
        } catch {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()

        if (!body.courseId || !body.termId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const offering = await prisma.courseOffering.create({
            data: {
                courseId: body.courseId,
                termId: body.termId,
                display: body.display ?? null
            }
        })

        return NextResponse.json({ offering }, { status: 201 })
    } catch (error) {
        console.error('Failed to create offering:', error)
        return NextResponse.json({ error: 'Failed to create offering' }, { status: 500 })
    }
}