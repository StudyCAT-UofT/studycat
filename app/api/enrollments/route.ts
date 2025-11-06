import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/enrollments
 * 
 * Fetches all course offerings that the authenticated user is enrolled in.
 * Returns detailed information about courses, terms, and user roles.
 * 
 * Authentication:
 * - Requires valid session token in cookies
 * 
 * Returns:
 * - 200: Array of course offerings with enrollment details
 * - 401: Missing or invalid session token
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Extract and validate session token from cookies
    const token = request.cookies.get('session-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    // Verify the token and extract user information
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Fetch all enrollments for the authenticated user with related data
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: payload.userId, // Filter by authenticated user
      },
      include: {
        // Include course offering details
        offering: {
          include: {
            course: true, // Course information (code, title, etc.)
            term: true,   // Term information (name, dates, etc.)
          },
        },
      },
      orderBy: {
        createdAt: 'desc', // Show most recent enrollments first
      },
    })

    // Transform enrollment data into a more usable format for the frontend
    const courseOfferings = enrollments.map((enrollment) => ({
      id: enrollment.offering.id,
      // Generate display name: use custom display or fallback to formatted string
      display: enrollment.offering.display || 
        `${enrollment.offering.course.code} - ${enrollment.offering.course.title} (${enrollment.offering.term.name})`,
      course: {
        id: enrollment.offering.course.id,
        code: enrollment.offering.course.code,
        title: enrollment.offering.course.title,
      },
      term: {
        id: enrollment.offering.term.id,
        name: enrollment.offering.term.name,
      },
      role: enrollment.offeringRole, // User's role in this offering (STUDENT, TA, INSTRUCTOR)
    }))

    return NextResponse.json({ courseOfferings })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    console.error('Error fetching enrollments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/enrollments
 * 
 * Deletes multiple enrollments by their IDs.
 * 
 * Body:
 * - enrollmentIds (required): Array of enrollment IDs to delete
 * 
 * Authentication:
 * - Requires valid session token in cookies
 * 
 * Returns:
 * - 200: Success with count of deleted enrollments
 * - 400: Missing or invalid enrollment IDs
 * - 401: Missing or invalid session token
 * - 500: Server error
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract and validate session token from cookies
    const token = request.cookies.get('session-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    // Verify the token and extract user information
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { enrollmentIds } = body

    // Validate required fields
    if (!enrollmentIds || !Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return NextResponse.json({ error: 'Enrollment IDs are required' }, { status: 400 })
    }

    // Validate that all IDs are strings
    if (!enrollmentIds.every(id => typeof id === 'string')) {
      return NextResponse.json({ error: 'All enrollment IDs must be strings' }, { status: 400 })
    }

    // Delete the enrollments
    const result = await prisma.enrollment.deleteMany({
      where: { id: { in: enrollmentIds } }
    })

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count 
    })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    console.error('Error deleting enrollments:', error)
    return NextResponse.json(
      { error: 'Failed to delete enrollments' },
      { status: 500 }
    )
  }
}
