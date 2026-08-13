import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

/**
 * GET /api/students
 * 
 * Fetches all students (enrollments with STUDENT role) for a specific course offering.
 * 
 * Query Parameters:
 * - courseOfferingId (required): The ID of the course offering to fetch students for
 * 
 * Returns:
 * - 200: Array of students with user information
 * - 400: Missing course offering ID
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

    const { searchParams } = new URL(request.url)
    const courseOfferingId = searchParams.get('courseOfferingId')

    // Validate required parameter
    if (!courseOfferingId) {
      return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 })
    }

    // Fetch all enrollments with STUDENT role for the specified course offering
    const enrollments = await prisma.enrollment.findMany({
      where: {
        offeringId: courseOfferingId,
        offeringRole: 'STUDENT'
      },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch quiz performance data for each student
    const studentsWithStats = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get all attempts for this enrollment in this course offering
        const attempts = await prisma.attempt.findMany({
          where: {
            enrollmentId: enrollment.id,
            quiz: {
              offeringId: courseOfferingId
            }
          },
          include: {
            responses: {
              select: {
                isCorrect: true
              }
            }
          },
          orderBy: {
            startedAt: 'desc'
          }
        })

        // Calculate stats
        const totalAttempts = attempts.length
        const completedAttempts = attempts.filter(a => a.status === 'COMPLETED')
        
        // Calculate average score from completed attempts
        let averageScore: number | null = null
        if (completedAttempts.length > 0) {
          const scores = completedAttempts.map(attempt => {
            const totalQuestions = attempt.responses.length
            if (totalQuestions === 0) return 0
            const correctAnswers = attempt.responses.filter((r: { isCorrect: boolean }) => r.isCorrect).length
            return (correctAnswers / totalQuestions) * 100
          })
          averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
        }

        // Get last activity date
        const lastActivity = attempts.length > 0 ? attempts[0].startedAt.toISOString() : null

        return {
          id: enrollment.id,
          userId: enrollment.userId,
          username: enrollment.user.username,
          givenName: ('givenName' in enrollment.user ? enrollment.user.givenName : '') || '',
          familyName: ('familyName' in enrollment.user ? enrollment.user.familyName : '') || '',
          enrolledAt: enrollment.createdAt.toISOString(),
          hidden: enrollment.hidden,
          totalAttempts,
          averageScore,
          lastActivity
        }
      })
    )

    const students = studentsWithStats

    return NextResponse.json({ students })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    logger.error({ err: error }, 'Error fetching students')
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/students
 * 
 * Creates new students for a course offering by creating users (if needed) and enrollments.
 * 
 * Body:
 * - courseOfferingId (required): The ID of the course offering
 * - students (required): Array of student objects with username, givenName (optional), familyName (optional)
 * 
 * Returns:
 * - 201: Created students with results
 * - 400: Missing required fields
 * - 401: Missing or invalid session token
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
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
    const { courseOfferingId, students } = body

    // Validate required fields
    if (!courseOfferingId) {
      return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 })
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: 'At least one student is required' }, { status: 400 })
    }

    // Filter out invalid students and trim whitespace
    const validStudents = students
      .map((student: { username?: string; givenName?: string; familyName?: string }) => ({
        username: (student.username || '').trim(),
        givenName: (student.givenName || '').trim(),
        familyName: (student.familyName || '').trim()
      }))
      .filter((student: { username: string; givenName: string; familyName: string }) => student.username.length > 0)

    if (validStudents.length === 0) {
      return NextResponse.json({ error: 'At least one valid student is required' }, { status: 400 })
    }

    // Verify course offering exists
    const courseOffering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId }
    })

    if (!courseOffering) {
      return NextResponse.json({ error: 'Course offering not found' }, { status: 404 })
    }

    const results = {
      created: [] as Array<{ username: string; userId: string; enrollmentId: string }>,
      alreadyExists: [] as string[],
      errors: [] as Array<{ username: string; error: string }>,
      missingNames: 0
    }

    // Process each student
    for (const student of validStudents) {
      try {
        const { username, givenName, familyName } = student
        
        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { username }
        })

        const hasMissingNames = !givenName && !familyName

        if (!user) {
          // Create new user with name fields
          user = await prisma.user.create({
            data: { 
              username,
              givenName: givenName || '',
              familyName: familyName || ''
            }
          })
        } else {
          // Update existing user with names if provided and not already set
          if ((givenName && !user.givenName) || (familyName && !user.familyName)) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                givenName: givenName || user.givenName,
                familyName: familyName || user.familyName
              }
            })
          }
        }

        // Check if enrollment already exists
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            userId_offeringId: {
              userId: user.id,
              offeringId: courseOfferingId
            }
          }
        })

        if (existingEnrollment) {
          results.alreadyExists.push(username)
          continue
        }

        // Create enrollment with STUDENT role
        const enrollment = await prisma.enrollment.create({
          data: {
            userId: user.id,
            offeringId: courseOfferingId,
            offeringRole: 'STUDENT'
          }
        })

        results.created.push({
          username,
          userId: user.id,
          enrollmentId: enrollment.id
        })

        // Track missing names only for successfully enrolled students
        if (hasMissingNames) {
          results.missingNames++
        }
      } catch (error) {
        // Handle individual student errors with detailed logging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error({ err: error, username: student.username }, 'Error processing student')
        results.errors.push({ username: student.username, error: errorMessage })
      }
    }

    return NextResponse.json({ results }, { status: 201 })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    logger.error({ err: error }, 'Error creating students')
    return NextResponse.json(
      { error: 'Failed to create students' },
      { status: 500 }
    )
  }
}

