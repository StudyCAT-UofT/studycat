import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'

/**
 * GET /api/dashboard/stats
 * 
 * Fetches dashboard statistics for an instructor's course offering.
 * 
 * Query Parameters:
 * - courseOfferingId (required): The ID of the course offering
 * 
 * Returns:
 * - 200: Dashboard statistics including metrics and chart data
 * - 400: Missing course offering ID
 * - 401: Authentication required
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseOfferingId = searchParams.get('courseOfferingId')

    if (!courseOfferingId) {
      return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 })
    }

    // Get all student enrollments for this course offering
    const studentEnrollments = await prisma.enrollment.findMany({
      where: {
        offeringId: courseOfferingId,
        offeringRole: 'STUDENT',
      },
      select: {
        id: true,
      },
    })
    const totalStudents = studentEnrollments.length
    const studentEnrollmentIds = studentEnrollments.map(e => e.id)

    // Get all quizzes for this course offering
    const quizzes = await prisma.quiz.findMany({
      where: {
        offeringId: courseOfferingId,
      },
      include: {
        attempts: {
          where: {
            enrollmentId: { in: studentEnrollmentIds },
          },
          include: {
            responses: {
              include: {
                item: {
                  include: {
                    module: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    // Get all modules for this course offering
    const modules = await prisma.module.findMany({
      where: {
        offeringId: courseOfferingId,
      },
      select: {
        id: true,
        name: true,
      },
    })

    // Calculate metrics
    let totalScore = 0
    let totalScoreCount = 0
    let totalTimeMs = 0
    let totalTimeCount = 0
    const studentsWithAttempts = new Set<string>()
    const responsesByDate: Map<string, { correct: number; total: number }> = new Map()
    const responsesByModule: Map<string, { correct: number; total: number }> = new Map()

    // Initialize module map
    modules.forEach(module => {
      responsesByModule.set(module.id, { correct: 0, total: 0 })
    })

    quizzes.forEach(quiz => {
      const completedAttempts = quiz.attempts.filter(attempt => attempt.status === 'COMPLETED')

      completedAttempts.forEach(attempt => {
        studentsWithAttempts.add(attempt.enrollmentId)

        // Calculate score for this attempt
        const totalResponses = attempt.responses.length
        if (totalResponses > 0) {
          const correctResponses = attempt.responses.filter(r => r.isCorrect).length
          const score = (correctResponses / totalResponses) * 100
          totalScore += score
          totalScoreCount++

          // Calculate time for this attempt
          if (attempt.finishedAt && attempt.startedAt) {
            const timeMs = attempt.finishedAt.getTime() - attempt.startedAt.getTime()
            totalTimeMs += timeMs
            totalTimeCount++
          }

          // Group responses by date for time series
          attempt.responses.forEach(response => {
            const dateKey = response.answeredAt.toISOString().split('T')[0] // YYYY-MM-DD
            if (!responsesByDate.has(dateKey)) {
              responsesByDate.set(dateKey, { correct: 0, total: 0 })
            }
            const dateData = responsesByDate.get(dateKey)!
            dateData.total++
            if (response.isCorrect) {
              dateData.correct++
            }
          })

          // Group responses by module
          attempt.responses.forEach(response => {
            const moduleId = response.item.moduleId
            if (responsesByModule.has(moduleId)) {
              const moduleData = responsesByModule.get(moduleId)!
              moduleData.total++
              if (response.isCorrect) {
                moduleData.correct++
              }
            }
          })
        }
      })
    })

    // Calculate average quiz score
    // totalScore is already in percentage form (0-100), so just average and round to 2 decimal places
    const averageQuizScore = totalScoreCount > 0 ? Math.round((totalScore / totalScoreCount) * 100) / 100 : null

    // Calculate average time per quiz (in minutes)
    const averageTimeMinutes = totalTimeCount > 0 ? (totalTimeMs / totalTimeCount) / (1000 * 60) : null

    // Calculate % of students who have attempted a quiz
    const studentsAttemptedPercent = totalStudents > 0 
      ? Math.round(((studentsWithAttempts.size / totalStudents) * 100) * 100) / 100 
      : 0

    // Prepare time series data (% correct over time)
    const timeSeriesData = Array.from(responsesByDate.entries())
      .map(([date, data]) => ({
        date,
        percentCorrect: data.total > 0 ? Math.round((data.correct / data.total) * 100 * 100) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Prepare module data (% correct by module)
    const moduleData = modules.map(module => {
      const data = responsesByModule.get(module.id) || { correct: 0, total: 0 }
      return {
        module: module.name,
        percentCorrect: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      }
    })

    return NextResponse.json({
      metrics: {
        averageQuizScore,
        averageTimeMinutes,
        studentsAttemptedPercent,
      },
      charts: {
        timeSeries: timeSeriesData,
        byModule: moduleData,
      },
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}

