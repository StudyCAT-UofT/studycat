import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/courses
 * 
 * Fetches all courses.
 * 
 * Returns:
 * - 200: Array of courses
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

        const courses = await prisma.course.findMany({
            orderBy: { code: 'asc' }
        })

        return NextResponse.json({ courses }, { status: 200 })
    } catch (error) {
        logger.error({ err: error }, 'Failed to fetch courses')
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
    }
}

/**
 * POST /api/admin/courses
 * 
 * Creates a new course.
 * 
 * Body:
 * - code (required)
 * - title (required)
 * 
 * Returns:
 * - 201: Created course
 * - 400: Missing fields
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

        if (!body.code || !body.title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const isValidCode = /^[a-zA-Z0-9]+$/.test(body.code);

        if (!isValidCode) {
            return NextResponse.json({ error: 'Course code must be alphanumeric (no spaces or symbols).' }, { status: 400 })
        }

        const course = await prisma.course.create({
            data: {
                code: body.code,
                title: body.title
            }
        })

        return NextResponse.json({ course }, { status: 201 })
    } catch (error) {
        logger.error({ err: error }, 'Failed to create course')
        return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
    }
}
