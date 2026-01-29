import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fastApiClient, type FastAPIStepRequest } from '@/lib/fastapi-client';
import type { StepAttemptRequest } from '@/types';


export const POST = async (request: NextRequest) => {
  try {
    const body: StepAttemptRequest = await request.json();
    const { attemptId, itemId, answerIndex, responseTimeMs } = body;

    // Validate required fields
    if (!attemptId || !itemId || answerIndex === undefined) {
      return NextResponse.json(
        { error: 'attemptId, itemId, and answerIndex are required' },
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

    // Get the item to determine correctness
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { options: true },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Determine the correct answer
    const correctOption = item.options.find(opt => opt.isCorrect);
    if (!correctOption) {
      return NextResponse.json(
        { error: 'Item has no correct option' },
        { status: 400 }
      );
    }

    // Map answer index to option label (0=A, 1=B, 2=C, 3=D)
    const optionLabels = ['A', 'B', 'C', 'D'] as const;
    const selectedLabel = optionLabels[answerIndex] as 'A' | 'B' | 'C' | 'D';
    const isCorrect = selectedLabel === correctOption.label;

    // Find the selected option
    const selectedOption = item.options.find(opt => opt.label === selectedLabel);
    
    // Find the correct answer index
    const correctAnswerIndex = optionLabels.indexOf(correctOption.label as typeof optionLabels[number]);
    if (correctAnswerIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid correct option label' },
        { status: 400 }
      );
    }

    // Create response record
    const response = await prisma.response.create({
      data: {
        attemptId: attemptId,
        itemId: itemId,
        selectedLabel: selectedLabel,
        itemOptionId: selectedOption?.id,
        isCorrect: isCorrect,
        responseTimeMs: responseTimeMs || 0,
        answeredAt: new Date(),
        askedAt: new Date(), // This should ideally be set when the question was first shown
      },
    });

    // Prepare request for FastAPI service
    const fastApiRequest: FastAPIStepRequest = {
      attempt_id: attemptId,
      response_id: response.id,
      item_id: itemId,
      answer_index: answerIndex,
      response_time_ms: responseTimeMs,
    };

    // Call FastAPI service
    let fastApiData;
    try {
      fastApiData = await fastApiClient.stepAttempt(fastApiRequest);
    } catch (error) {
      // If FastAPI call fails, clean up the response record we just created
      await prisma.response.delete({
        where: { id: response.id },
      });
      
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
          engineMasteryAtFinish: JSON.stringify(fastApiData.mastery),
        },
      });
    }

    // The FastAPI service should have already updated the response with the mastery snapshot
    // But let's ensure it's set in case there was an issue
    await prisma.response.update({
      where: { id: response.id },
      data: {
        engineMasterySnapshot: JSON.stringify(fastApiData.mastery),
      },
    });

    // Return response to frontend
    return NextResponse.json({
      attemptId: attempt.id,
      theta: fastApiData.theta,
      mastery: fastApiData.mastery,
      nextAction: fastApiData.next_action,
      nextItem: fastApiData.next_item,
      isFinished: fastApiData.next_action === 'FINISH',
      feedback: {
        correctAnswerIndex: correctAnswerIndex,
        selectedAnswerIndex: answerIndex,
        isCorrect: isCorrect,
        justification: selectedOption?.justification || null,
      },
    });

  } catch (error) {
    console.error('Error processing quiz step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
