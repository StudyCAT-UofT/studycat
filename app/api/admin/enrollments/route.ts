import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/enrollments
 * 
 * Assigns a user to a course offering.
 * 
 * Body:
 * - userId (required)
 * - offeringId (required)
 * - offeringRole (required) -> STUDENT | INSTRUCTOR | TA
 * 
 * Returns:
 * - 201: Created enrollment
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

        if (!body.userId || !body.offeringId || !body.offeringRole) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const enrollment = await prisma.enrollment.create({
            data: {
                userId: body.userId,
                offeringId: body.offeringId,
                offeringRole: body.offeringRole
            }
        })

        return NextResponse.json({ enrollment }, { status: 201 })
    } catch (error) {
        console.error('Failed to create enrollment:', error)
        return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
    }
}