import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export const POST = async (request: NextRequest) => {
  try {
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
        isCorrect: r.isCorrect,
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
