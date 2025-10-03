import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Verify the user's session
    const token = request.cookies.get('session-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Fetch user's enrollments with course offerings
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: payload.userId,
      },
      include: {
        offering: {
          include: {
            course: true,
            term: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })


    // Transform the data to include a display name for each course offering
    const courseOfferings = enrollments.map((enrollment) => ({
      id: enrollment.offering.id,
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
      role: enrollment.offeringRole,
    }))

    return NextResponse.json({ courseOfferings })
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    )
  }
}
