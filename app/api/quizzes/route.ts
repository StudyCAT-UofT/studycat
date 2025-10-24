import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/quizzes
 * 
 * Fetches all active quizzes for a specific course offering with comprehensive statistics.
 * 
 * Query Parameters:
 * - courseOfferingId (required): The ID of the course offering to fetch quizzes for
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

    // Validate required parameter
    if (!courseOfferingId) {
      return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 })
    }

    // Fetch quizzes with related data for statistics calculation
    const quizzes = await prisma.quiz.findMany({
      where: {
        offeringId: courseOfferingId,
        active: true // Only fetch active quizzes
      },
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
        // Include offering to access modules for includedModuleIds
        offering: {
          include: {
            modules: {
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

      // Extract unique modules from quiz items for display
      const modules = Array.from(new Set(quiz.quizItems.map(qi => qi.item.module.name)))

      // Create a mapping of module IDs to names for includedModuleIds
      const moduleIdToName = new Map(quiz.offering.modules.map(module => [module.id, module.name]))
      
      // Convert includedModuleIds to module names
      const includedModuleNames = quiz.includedModuleIds
        .map(moduleId => moduleIdToName.get(moduleId))
        .filter(name => name !== undefined) // Filter out any undefined names

      // Return standardized quiz object with calculated statistics
      return {
        id: quiz.id,
        title: quiz.title,
        description: null, // Not in current schema, but kept for API compatibility
        modules: modules,
        module: modules.length > 0 ? modules[0] : 'Unknown', // Primary module for table display
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
        includedBlooms: quiz.includedBlooms
      }
    })

    return NextResponse.json({ quizzes: quizzesWithStats })
  } catch (error) {
    // Log error for debugging while keeping client response generic
    console.error('Failed to fetch quizzes:', error)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}

