import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Prisma } from '@prisma/client'

export const runtime = 'nodejs'

/**
 * GET /api/quizzes
 * 
 * Fetches quizzes for a specific course offering with comprehensive statistics.
 * 
 * Query Parameters:
 * - courseOfferingId (required): The ID of the course offering to fetch quizzes for
 * - active (optional): Filter by active status. If true, only active quizzes. If false, only inactive quizzes. If omitted, all quizzes.
 * 
 * Returns:
 * - 200: Array of quizzes with statistics
 * - 400: Missing course offering ID
 * - 500: Server error
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseOfferingId = searchParams.get('courseOfferingId')
    const activeParam = searchParams.get('active')

    // Validate required parameter
    if (!courseOfferingId) {
      return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 })
    }

    // Build where clause based on active parameter
    const whereClause: Prisma.QuizWhereInput = {
      offeringId: courseOfferingId,
    }

    // Add active filter if specified
    if (activeParam !== null) {
      whereClause.active = activeParam === 'true'
    }

    // Fetch quizzes with related data for statistics calculation
    const quizzes = await prisma.quiz.findMany({
      where: whereClause,
      include: {
        // Include creator information for display
        createdBy: {
          select: {
            id: true,
            username: true
          }
        },
        // Include attempt data for statistics
        attempts: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            finishedAt: true,
            responses: {
              select: {
                isCorrect: true
              }
            }
          }
        },
        // Include quiz items to determine modules and question count
        quizItems: {
          include: {
            item: {
              select: {
                id: true,
                module: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                bloom: true
              }
            }
          }
        },
        quizModules: {
          select: {
            quizId: true,
            moduleId: true,
            masteryThreshold: true,
            module: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' } // Show newest quizzes first
      ]
    })

    // Transform quiz data and calculate comprehensive statistics
    const quizzesWithStats = quizzes.map(quiz => {
      // Filter for completed attempts to calculate meaningful statistics
      const completedAttempts = quiz.attempts.filter(attempt => attempt.status === 'COMPLETED')
      const totalAttempts = quiz.attempts.length
      
      // Calculate average score percentage for completed attempts only
      let averageScore = null
      if (completedAttempts.length > 0) {
        const totalCorrect = completedAttempts.reduce((sum, attempt) => {
          const correctResponses = attempt.responses.filter(response => response.isCorrect).length
          return sum + correctResponses
        }, 0)
        const totalResponses = completedAttempts.reduce((sum, attempt) => sum + attempt.responses.length, 0)
        averageScore = totalResponses > 0 ? (totalCorrect / totalResponses) * 100 : null
      }

      // Calculate completion rate (completed attempts / total attempts)
      const completionRate = totalAttempts > 0 ? (completedAttempts.length / totalAttempts) * 100 : null
      
      // Convert includedModuleIds to module names
      const includedModuleNames = quiz.quizModules.map(qm => qm.module.name)

      // Return standardized quiz object with calculated statistics
      return {
        id: quiz.id,
        title: quiz.title,
        description: null, // Not in current schema, but kept for API compatibility
        modules: includedModuleNames,
        module: includedModuleNames.length > 0 ? includedModuleNames[0] : 'Unknown', // Primary module for table display
        fixedLength: quiz.fixedLength,
        timeLimit: null, // Not in current schema, but kept for API compatibility
        maxAttempts: null, // Not in current schema, but kept for API compatibility
        isActive: quiz.active,
        dueDate: null, // Not in current schema, but kept for API compatibility
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString(),
        createdBy: quiz.createdBy?.username || 'Unknown',
        stats: {
          totalAttempts,
          averageScore,
          completionRate
        },
        includedModules: includedModuleNames,
        includedBlooms: quiz.includedBlooms,
        quizModules: quiz.quizModules
      }
    })

    return NextResponse.json({ quizzes: quizzesWithStats })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    console.error('Failed to fetch quizzes:', error)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}

/**
 * POST /api/quizzes
 * 
 * Creates a new quiz for a specific course offering.
 * 
 * Body:
 * - courseOfferingId (required): The ID of the course offering
 * - title (required): The quiz title
 * - includedModuleIds (required): Array of module IDs to include
 * - masteryThresholds (required): Array of mastery thresholds (same order as modules)
 * - active (optional): Whether the quiz is active (default: true)
 * - fixedLength (required): Number of questions in the quiz
 * 
 * Returns:
 * - 201: Created quiz
 * - 400: Missing required fields
 * - 500: Server error
 */
export async function POST(request: Request) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { courseOfferingId, title, includedModuleIds, masteryThresholds, active = true, fixedLength } = body

    // Validate required fields
    if (!courseOfferingId || !title || !includedModuleIds || !Array.isArray(includedModuleIds) || includedModuleIds.length === 0) {
      return NextResponse.json({ error: 'Course offering ID, title, and at least one module are required' }, { status: 400 })
    }

    if (!fixedLength || fixedLength < 1) {
      return NextResponse.json({ error: 'Fixed length must be at least 1' }, { status: 400 })
    }

    if (
      !masteryThresholds ||
      !Array.isArray(masteryThresholds) ||
      masteryThresholds.length !== includedModuleIds.length
    ) {
      return NextResponse.json(
        { error: 'masteryThresholds must be an array matching includedModuleIds length' },
        { status: 400 }
      )
    }

    // Verify the course offering exists
    const courseOffering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId }
    })

    if (!courseOffering) {
      return NextResponse.json({ error: 'Course offering not found' }, { status: 404 })
    }

    // Verify all modules exist and belong to the course offering
    const modules = await prisma.module.findMany({
      where: {
        id: { in: includedModuleIds },
        offeringId: courseOfferingId
      }
    })

    if (modules.length !== includedModuleIds.length) {
      return NextResponse.json({ error: 'One or more modules not found or do not belong to this course offering' }, { status: 400 })
    }

    // Create the quiz
    const quiz = await prisma.quiz.create({
      data: {
        title,
        offeringId: courseOfferingId,
        active,
        fixedLength,
        createdById: session.userId
      }
    })

    // Create QuizModule entries linking the quiz to modules
    const quizModulesData = includedModuleIds.map(
      (moduleId: string, index: number) => ({
        quizId: quiz.id,
        moduleId,
        masteryThreshold: masteryThresholds[index]
      })
    )

    await prisma.quizModule.createMany({
      data: quizModulesData
    })

    return NextResponse.json({ quiz }, { status: 201 })
  } catch (error) {
    console.error('Failed to create quiz:', error)
    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 })
  }
}

/**
 * DELETE /api/quizzes
 * 
 * Deletes multiple quizzes by their IDs.
 * 
 * Body:
 * - ids (required): Array of quiz IDs to delete
 * 
 * Returns:
 * - 200: Success
 * - 400: Missing or invalid IDs
 * - 500: Server error
 */
export async function DELETE(request: Request) {
  try {
    // Get the current user session
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { ids } = body

    // Validate required fields
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Quiz IDs are required' }, { status: 400 })
    }

    // Check if all quizzes exist
    const existingQuizzes = await prisma.quiz.findMany({
      where: { id: { in: ids } }
    })

    if (existingQuizzes.length !== ids.length) {
      return NextResponse.json({ error: 'One or more quizzes not found' }, { status: 404 })
    }

    // Delete the quizzes
    await prisma.quiz.deleteMany({
      where: { id: { in: ids } }
    })

    return NextResponse.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    console.error('Failed to delete quizzes:', error)
    return NextResponse.json({ error: 'Failed to delete quizzes' }, { status: 500 })
  }
}

