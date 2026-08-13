import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/enrollments?offeringId=xxx
 * 
 * Returns all enrollments from a specific course offering.
 * 
 * Query:
 * - offeringId: The id of the course offering. 
 * 
 * Returns:
 * - 200: All enrollments from the specified course offering.
 * - 400: Missing offeringId
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 500: Server error
 */
export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
      await requireAdmin(session.userId)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const offeringId = searchParams.get('offeringId')

    if (!offeringId) {
      return NextResponse.json(
        { error: 'Missing offeringId' },
        { status: 400 }
      )
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { offeringId },
      include: {
        user: true,
      },
      orderBy: {
        user: { username: 'asc' },
      },
    })

    return NextResponse.json({ enrollments }, { status: 200 })
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch enrollments')
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    )
  }
}

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
        logger.error({ err: error }, 'Failed to create enrollment')
        return NextResponse.json({ error: 'Failed to create enrollment' }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/enrollments
 * 
 * Removes a user from a course offering.
 * 
 * Body:
 * - userId (required)
 * - offeringId (required)
 * 
 * Returns:
 * - 200: Deleted successfully
 * - 400: Missing required fields
 * - 401: Unauthorized
 * - 403: Forbidden
 * - 404: Enrollment not found
 * - 500: Server error
 */
export async function DELETE(req: Request) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
            await requireAdmin(session.userId)
        } catch {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await req.json()

        if (!body.userId || !body.offeringId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if enrollment exists
        const existing = await prisma.enrollment.findUnique({
            where: {
                userId_offeringId: {
                    userId: body.userId,
                    offeringId: body.offeringId
                }
            }
        })

        if (!existing) {
            return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
        }

        await prisma.enrollment.delete({
            where: {
                userId_offeringId: {
                    userId: body.userId,
                    offeringId: body.offeringId
                }
            }
        })

        return NextResponse.json({ message: 'Enrollment deleted' }, { status: 200 })

    } catch (error) {
        logger.error({ err: error }, 'Failed to delete enrollment')
        return NextResponse.json({ error: 'Failed to delete enrollment' }, { status: 500 })
    }
}
