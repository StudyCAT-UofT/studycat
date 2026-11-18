import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fastApiClient, type FastAPIStepRequest } from '@/lib/fastapi-client';
import type { StepAttemptRequest, StepAttemptResponse } from '@/types';
import { logger } from '@/lib/logger';
import { requireSession } from '@/lib/authz';
import { isPresentedItem, signPresentedItem } from '@/lib/presented-item';
import { answerFeedbackFor, presentedItemFor, showsCorrectness, toFeedbackLevel } from '@/lib/feedback-visibility';


export const POST = async (request: NextRequest) => {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const body: StepAttemptRequest = await request.json();
    const { attemptId, itemId, itemToken, answerIndex, responseTimeMs } = body;

    // Validate required fields
    if (!attemptId || !itemId || !itemToken || answerIndex === undefined) {
      return NextResponse.json(
        { error: 'attemptId, itemId, itemToken, and answerIndex are required' },
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
        enrollment: { select: { userId: true } },
        _count: { select: { responses: true } },
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

    // Only the student who owns the attempt may answer in it
    if (attempt.enrollment.userId !== auth.session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only accept an answer to the item the server presented at this point in the attempt.
    // Otherwise a student could pick which items they answer (and so their ability estimate).
    // This is a fast path without a lock; it is repeated under a lock before recording.
    const position = attempt._count.responses;
    if (!isPresentedItem(itemToken, { attemptId: attempt.id, itemId, position })) {
      return NextResponse.json(
        { error: 'This question is not the one currently presented in this attempt', code: 'ITEM_NOT_PRESENTED' },
        { status: 409 }
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

    const numOptions = item.options.length;

    // Map answer index to option label (eg. 0=A, 1=B, 2=C, 3=D, etc.)
    const optionLabels = generateOptionLabels(numOptions);
    const selectedLabel = optionLabels[answerIndex];
    const isCorrect = selectedLabel === correctOption.label;

    // Find the selected option
    const selectedOption = item.options.find(opt => opt.label === selectedLabel);

    const correctAnswerIndex = optionLabels.indexOf(correctOption.label);
    if (correctAnswerIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid correct option label' },
        { status: 400 }
      );
    }

    // Record the response, re-checking the position while holding a row lock on the attempt.
    // The check above ran without a lock, so two concurrent requests carrying the same token
    // (e.g. a resubmission, or one request per option) could both pass it; the lock makes
    // them take turns, and every request after the first sees the new response count and
    // is rejected.
    const response = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Attempt" WHERE id = ${attempt.id}::uuid FOR UPDATE`;

      const lockedPosition = await tx.response.count({ where: { attemptId: attempt.id } });
      if (lockedPosition !== position) return null;

      return tx.response.create({
        data: {
          attemptId: attempt.id,
          itemId: itemId,
          selectedLabel: selectedLabel,
          itemOptionId: selectedOption?.id,
          isCorrect: isCorrect,
          responseTimeMs: responseTimeMs || 0,
          answeredAt: new Date(),
          askedAt: new Date(), // This should ideally be set when the question was first shown
        },
      });
    });

    if (!response) {
      return NextResponse.json(
        { error: 'This question has already been answered in this attempt', code: 'ITEM_NOT_PRESENTED' },
        { status: 409 }
      );
    }

    // Prepare request for FastAPI service
    const fastApiRequest: FastAPIStepRequest = {
      attempt_id: attempt.id,
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
    if (fastApiData.next_action === 'FINISH' || fastApiData.next_action === 'MASTERED') {
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

    // Return response to frontend, revealing only what the quiz's feedback setting allows
    const feedbackLevel = toFeedbackLevel(attempt.quiz.feedbackVisibility);
    return NextResponse.json({
      attemptId: attempt.id,
      // Theta and mastery move with each answer, so they would reveal whether it was correct
      theta: showsCorrectness(feedbackLevel) ? fastApiData.theta : null,
      mastery: showsCorrectness(feedbackLevel) ? fastApiData.mastery : null,
      nextAction: fastApiData.next_action,
      nextItem: presentedItemFor(feedbackLevel, fastApiData.next_item),
      // This answer is now recorded, so the next item is presented at position + 1
      nextItemToken: fastApiData.next_item
        ? signPresentedItem({ attemptId: attempt.id, itemId: fastApiData.next_item.item_id, position: position + 1 })
        : undefined,
      isFinished: fastApiData.next_action === 'FINISH',
      allMastered: fastApiData.next_action === 'MASTERED',
      feedback: answerFeedbackFor(feedbackLevel, {
        correctAnswerIndex: correctAnswerIndex,
        selectedAnswerIndex: answerIndex,
        isCorrect: isCorrect,
        justification: selectedOption?.justification || null,
      }),
    } satisfies StepAttemptResponse);

  } catch (error) {
    logger.error({ err: error }, 'Error processing quiz step');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

const generateOptionLabels = (count: number): string[] => {
  const labels: string[] = [];

  for (let i = 0; i < count; i++) {
    const letter = String.fromCharCode(65 + i);
    labels.push(letter);
  }

  return labels;
};
