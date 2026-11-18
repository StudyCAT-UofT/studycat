import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireOfferingRole, requireSession, STAFF_ROLES } from '@/lib/authz';
import { showsCorrectness, toFeedbackLevel } from '@/lib/feedback-visibility';

export const POST = async (request: NextRequest) => {
  try {
    const session = await requireSession();
    if (!session.ok) return session.response;

    const body = await request.json();
    const { attemptId } = body;

    // Validate required fields
    if (!attemptId) {
      return NextResponse.json(
        { error: 'attemptId is required' },
        { status: 400 }
      );
    }

    // Fetch attempt with responses
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        enrollment: { select: { userId: true, offeringId: true } },
        quiz: { select: { feedbackVisibility: true } },
        responses: {
          orderBy: {
            answeredAt: 'asc',
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found' },
        { status: 404 }
      );
    }

    // The attempt's owner, or staff of its offering, may view the results
    const isOwner = attempt.enrollment.userId === session.session.userId;
    if (!isOwner) {
      const auth = await requireOfferingRole(attempt.enrollment.offeringId, STAFF_ROLES);
      if (!auth.ok) return auth.response;
    }

    // Staff see everything; the student sees per-question correctness only if the quiz's
    // feedback setting shows it (the overall score is always shown)
    const showPerQuestionCorrectness = !isOwner || showsCorrectness(toFeedbackLevel(attempt.quiz.feedbackVisibility));

    // Calculate statistics
    const totalQuestions = attempt.responses.length;
    const correctAnswers = attempt.responses.filter(r => r.isCorrect).length;
    const percentage = totalQuestions > 0 
      ? Math.round((correctAnswers / totalQuestions) * 100) 
      : 0;

    return NextResponse.json({
      attemptId: attempt.id,
      totalQuestions,
      correctAnswers,
      percentage,
      responses: attempt.responses.map(r => ({
        id: r.id,
        itemId: r.itemId,
        selectedLabel: r.selectedLabel,
        isCorrect: showPerQuestionCorrectness ? r.isCorrect : null,
        answeredAt: r.answeredAt,
      })),
    });

  } catch (error) {
    logger.error({ err: error }, 'Error fetching attempt results');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
