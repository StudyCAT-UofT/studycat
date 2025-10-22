import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fastApiClient, type FastAPIInitRequest } from '@/lib/fastapi-client';
import { getSession } from '@/lib/auth';

interface InitAttemptRequest {
  quizId: string;
  concepts?: string[];
  priorMu?: number;
  priorSigma2?: number;
}


export const POST = async (request: NextRequest) => {
  try {
    const body: InitAttemptRequest = await request.json();
    const { quizId, concepts, priorMu, priorSigma2 } = body;

    // Get user from session
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.userId;

    // Validate required fields
    if (!quizId) {
      return NextResponse.json(
        { error: 'quizId is required' },
        { status: 400 }
      );
    }

    // Verify quiz exists and is active
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        active: true,
      },
      include: {
        offering: true,
        quizItems: {
          include: {
            item: true,
          },
        },
      },
    });

    // Get module names for the FastAPI service
    const moduleNames = await prisma.module.findMany({
      where: {
        id: { in: quiz?.includedModuleIds || [] }
      },
      select: {
        name: true
      }
    });

    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found or inactive' },
        { status: 404 }
      );
    }

    // Verify user is enrolled in the course offering
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        offeringId: quiz.offeringId,
        offeringRole: 'STUDENT',
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'User not enrolled as student in this course offering' },
        { status: 403 }
      );
    }

    // Create attempt in database
    console.log('Creating attempt for enrollment:', enrollment.id, 'and quiz:', quizId);
    const attempt = await prisma.attempt.create({
      data: {
        quiz: {
          connect: { id: quizId }
        },
        enrollment: {
          connect: { id: enrollment.id }
        },
        fixedLengthN: quiz.fixedLength,
        status: 'IN_PROGRESS',
        scopeSnapshot: {
          includedModuleIds: quiz.includedModuleIds,
          includedBlooms: quiz.includedBlooms,
          eligibleItemIds: quiz.quizItems.map(qi => qi.itemId),
        },
      },
    });

    // Prepare request for FastAPI service
    const fastApiRequest: FastAPIInitRequest = {
      attempt_id: attempt.id,
      concepts: concepts || moduleNames.map(m => m.name),
      prior_mu: priorMu,
      prior_sigma2: priorSigma2,
    };

    // Call FastAPI service
    let fastApiData;
    try {
      fastApiData = await fastApiClient.initAttempt(fastApiRequest);
    } catch (error) {
      // If FastAPI call fails, clean up the attempt
      await prisma.attempt.delete({
        where: { id: attempt.id },
      });

      return NextResponse.json(
        { error: `FastAPI service error: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Update attempt with engine version if provided
    await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        engineVersion: '1.0', // You might want to get this from FastAPI response
      },
    });

    // Return response to frontend
    return NextResponse.json({
      attemptId: attempt.id,
      quizId,
      enrollmentId: enrollment.id,
      theta: fastApiData.theta,
      nextItem: fastApiData.next_item,
      nextAction: fastApiData.next_action,
      startedAt: attempt.startedAt,
    });

  } catch (error) {
    console.error('Error initializing quiz attempt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
