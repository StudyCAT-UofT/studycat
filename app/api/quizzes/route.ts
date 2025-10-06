import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseOfferingId = searchParams.get('courseOfferingId')

    if (!courseOfferingId) {
      return NextResponse.json({ error: 'Course offering ID is required' }, { status: 400 })
    }

    const quizzes = await prisma.quiz.findMany({
      where: {
        offeringId: courseOfferingId,
        active: true
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true
          }
        },
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
        quizItems: {
          include: {
            item: {
              select: {
                id: true,
                module: true,
                bloom: true
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    })

    // Calculate statistics for each quiz
    const quizzesWithStats = quizzes.map(quiz => {
      const completedAttempts = quiz.attempts.filter(attempt => attempt.status === 'COMPLETED')
      const totalAttempts = quiz.attempts.length
      
      // Calculate average score for completed attempts
      let averageScore = null
      if (completedAttempts.length > 0) {
        const totalCorrect = completedAttempts.reduce((sum, attempt) => {
          const correctResponses = attempt.responses.filter(response => response.isCorrect).length
          return sum + correctResponses
        }, 0)
        const totalResponses = completedAttempts.reduce((sum, attempt) => sum + attempt.responses.length, 0)
        averageScore = totalResponses > 0 ? (totalCorrect / totalResponses) * 100 : null
      }

      // Calculate completion rate
      const completionRate = totalAttempts > 0 ? (completedAttempts.length / totalAttempts) * 100 : null

      // Get unique modules from quiz items
      const modules = [...new Set(quiz.quizItems.map(qi => qi.item.module))]

      return {
        id: quiz.id,
        title: quiz.title,
        description: null, // Not in schema, but keeping for compatibility
        modules: modules,
        module: modules.length > 0 ? modules[0] : 'Unknown', // Primary module for display
        fixedLength: quiz.fixedLength,
        timeLimit: null, // Not in schema, but keeping for compatibility
        maxAttempts: null, // Not in schema, but keeping for compatibility
        isActive: quiz.active,
        dueDate: null, // Not in schema, but keeping for compatibility
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString(),
        createdBy: quiz.createdBy?.username || 'Unknown',
        stats: {
          totalAttempts,
          averageScore,
          completionRate
        },
        includedModules: quiz.includedModules,
        includedBlooms: quiz.includedBlooms
      }
    })

    return NextResponse.json({ quizzes: quizzesWithStats })
  } catch (e) {
    console.error('Failed to fetch quizzes:', e)
    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}

