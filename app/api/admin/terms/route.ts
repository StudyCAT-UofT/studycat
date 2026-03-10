import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/terms
 * 
 * Fetches all terms.
 * 
 * Returns:
 * - 200: An array of all terms
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

        const terms = await prisma.term.findMany({
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ terms }, { status: 200 })
    } catch (error) {
        console.error('Failed to fetch terms:', error)
        return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 })
    }
}

/**
 * POST /api/admin/terms
 * 
 * Creates a new term.
 * 
 * Body:
 * - name (required)
 * - startDate (optional)
 * - endDate (optional)
 * 
 * Returns:
 * - 201: Created term
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

        if (!body.name) {
            return NextResponse.json({ error: 'Missing term name' }, { status: 400 })
        }

        const term = await prisma.term.create({
            data: {
                name: body.name,
                startDate: body.startDate ? new Date(body.startDate) : undefined,
                endDate: body.endDate ? new Date(body.endDate) : undefined
            }
        })

        return NextResponse.json({ term }, { status: 201 })
    } catch (error) {
        console.error('Failed to create term:', error)
        return NextResponse.json({ error: 'Failed to create term' }, { status: 500 })
    }
}
