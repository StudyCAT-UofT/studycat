import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fastApiClient, type FastAPIStepRequest } from '@/lib/fastapi-client';

interface StepAttemptRequest {
  attemptId: string;
  itemId?: string;
  answerIndex?: number;
  responseTimeMs?: number;
}


export const POST = async (request: NextRequest) => {
  try {
    const body: StepAttemptRequest = await request.json();
    const { attemptId, itemId, answerIndex, responseTimeMs } = body;

    // Validate required fields
    if (!attemptId) {
      return NextResponse.json(
        { error: 'attemptId is required' },
        { status: 400 }
      );
    }

    // Verify attempt exists and is in progress
    const attempt = await prisma.attempt.findFirst({
      where: {
        id: attemptId,
        status: 'IN_PROGRESS',
      },
      include: {
        quiz: true,
        responses: {
          orderBy: {
            answeredAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: 'Attempt not found or not in progress' },
        { status: 404 }
      );
    }

    // Prepare request for FastAPI service
    const fastApiRequest: FastAPIStepRequest = {
      attempt_id: attemptId,
      item_id: itemId,
      answer_index: answerIndex,
      response_time_ms: responseTimeMs,
    };

    // Call FastAPI service
    let fastApiData;
    try {
      fastApiData = await fastApiClient.stepAttempt(fastApiRequest);
    } catch (error) {
      return NextResponse.json(
        { error: `FastAPI service error: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Update attempt based on response
    if (fastApiData.next_action === 'FINISH') {
      await prisma.attempt.update({
        where: { id: attempt.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          engineMasteryAtFinish: fastApiData.mastery,
        },
      });
    }

    // Update the last response with mastery snapshot if this was a response
    if (itemId && answerIndex !== undefined && answerIndex >= 0) {
      const lastResponse = await prisma.response.findFirst({
        where: { attemptId: attempt.id },
        orderBy: { answeredAt: 'desc' },
      });

      if (lastResponse) {
        await prisma.response.update({
          where: { id: lastResponse.id },
          data: {
            engineMasterySnapshot: fastApiData.mastery,
          },
        });
      }
    }

    // Return response to frontend
    return NextResponse.json({
      attemptId: attempt.id,
      theta: fastApiData.theta,
      mastery: fastApiData.mastery,
      nextAction: fastApiData.next_action,
      nextItem: fastApiData.next_item,
      isFinished: fastApiData.next_action === 'FINISH',
    });

  } catch (error) {
    console.error('Error processing quiz step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
