import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/data/attempt
 * 
 * Returns JSON containing user attempts for a given quiz.
 * 
 * Query Parameters: 
 *  - quizID (required): The ID of the quiz to fetch attempts from
 * 
 * Returns:
 * - 200: JSON containing quizId, count (number of attempts), and attempts 
 *        (object containing userId, score, and questions (list of questions 
 *        answered in order of when they appeared))
 * - 400: Missing course offering ID
 * - 500: Server error
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const quizId = searchParams.get('quizId');

        // Validate required parameter
        if (!quizId) {
            return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
        }

        // Get quiz to find course offering
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            select: { offeringId: true },
        });

        if (!quiz) {
            return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }

        // Get total number of students enrolled in the course offering
        const totalStudents = await prisma.enrollment.count({
            where: {
                offeringId: quiz.offeringId,
                offeringRole: 'STUDENT',
            },
        });

        const attempts = await prisma.attempt.findMany({
            where: {
                quizId,
                status: 'COMPLETED', // AttemptStatus.COMPLETED
            },
            include: {
                enrollment: {
                    include: {
                        user: {
                            select: { id: true, username: true },
                        },
                    },
                },
                responses: {
                    include: {
                        item: {
                            select: { id: true, externalQuestionId: true, stem: true },
                        },
                    },
                    orderBy: { askedAt: 'asc' },
                },
            },
            orderBy: { startedAt: 'asc' },
        });

        // Transform data
        const data = attempts.map((attempt) => {
            const total = attempt.responses.length
            const correctCount = attempt.responses.reduce(
                (acc, r) => acc + (r.isCorrect ? 1 : 0),
                0
            )

            const scorePct = total > 0 ? (correctCount / total) * 100 : 0

            // Build question data
            const questions = attempt.responses.map((r) => ({
                questionId: r.item?.externalQuestionId ?? r.itemId,
                stem: r.item?.stem ?? '(no text)',
                isCorrect: r.isCorrect,
            }))

            return {
                userId: attempt.enrollment?.userId ?? '',
                username: attempt.enrollment?.user?.username ?? '',
                score: scorePct,
                questions,
                startedAt: attempt.startedAt.toISOString(),
            }
        });

        return NextResponse.json(
            {
                quizId,
                count: data.length,
                totalStudents,
                attempts: data,
            },
            { status: 200 }
        )
    } catch (error) {
        // Log error for debugging while keeping client response generic
        console.error('Failed to fetch attempts:', error)
        return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 })
    }
}