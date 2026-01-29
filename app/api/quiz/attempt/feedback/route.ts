import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { thetaToPerformance } from '@/utils/thetaToPerformance';
import type { FeedbackData, ModulePerformance, DetailedQuestionReview } from '@/types';

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { attemptId } = body;

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
    if (!attemptId) {
      return NextResponse.json(
        { error: 'attemptId is required' },
        { status: 400 }
      );
    }

    // Fetch attempt with all related data
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            offering: {
              include: {
                modules: true,
              },
            },
            quizModules: {
              select: { moduleId: true }
            }
          },
        },
        enrollment: {
          include: {
            thetas: {
              include: {
                module: true,
              },
            },
          },
        },
        responses: {
          include: {
            item: {
              include: {
                module: true,
                options: {
                  orderBy: {
                    label: 'asc',
                  },
                },
              },
            },
          },
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

    // Verify user owns this attempt
    if (attempt.enrollment.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Calculate performance summary
    const questionsAttempted = attempt.responses.length;
    const questionsCorrect = attempt.responses.filter(r => r.isCorrect).length;
    const questionsIncorrect = questionsAttempted - questionsCorrect;
    const percentage = questionsAttempted > 0 
      ? Math.round((questionsCorrect / questionsAttempted) * 100) 
      : 0;

    // Calculate total time
    const totalTimeMs = attempt.finishedAt 
      ? new Date(attempt.finishedAt).getTime() - new Date(attempt.startedAt).getTime()
      : Date.now() - new Date(attempt.startedAt).getTime();

    // Get module IDs included in this quiz
    const includedModuleIds = attempt.quiz.quizModules.map(qm => qm.moduleId) || [];

    // Build module performance data
    const modulePerformanceMap = new Map<string, {
      moduleId: string;
      moduleName: string;
      theta: number;
      questionsAttempted: number;
      questionsCorrect: number;
    }>();

    // Initialize modules from quiz scope
    for (const moduleId of includedModuleIds) {
      const m = attempt.quiz.offering.modules.find(m => m.id === moduleId);
      if (m) {
        modulePerformanceMap.set(moduleId, {
          moduleId: moduleId,
          moduleName: m.name,
          theta: 0, // Default, will be updated from theta data
          questionsAttempted: 0,
          questionsCorrect: 0,
        });
      }
    }

    // Add theta values from enrollment
    for (const theta of attempt.enrollment.thetas) {
      if (modulePerformanceMap.has(theta.moduleId)) {
        const moduleData = modulePerformanceMap.get(theta.moduleId)!;
        moduleData.theta = theta.value;
      }
    }

    // Count questions per module from responses
    for (const response of attempt.responses) {
      const moduleId = response.item.moduleId;
      if (modulePerformanceMap.has(moduleId)) {
        const moduleData = modulePerformanceMap.get(moduleId)!;
        moduleData.questionsAttempted++;
        if (response.isCorrect) {
          moduleData.questionsCorrect++;
        }
      }
    }

    // Convert to ModulePerformance array with performance levels
    const modulePerformance: ModulePerformance[] = Array.from(modulePerformanceMap.values()).map(mod => {
      // If no questions were attempted in this module, still show performance based on overall theta
      // but mark it clearly in the UI
      const performance = thetaToPerformance(mod.theta);
      return {
        moduleId: mod.moduleId,
        moduleName: mod.moduleName,
        theta: mod.theta,
        performanceLevel: performance.level,
        performanceValue: performance.numericValue,
        questionsAttempted: mod.questionsAttempted,
        questionsCorrect: mod.questionsCorrect,
      };
    });

    // Build detailed question review
    const optionLabels = ['A', 'B', 'C', 'D'] as const;
    const questions: DetailedQuestionReview[] = attempt.responses.map((response, index) => {
      const correctOption = response.item.options.find(opt => opt.isCorrect);
      const correctAnswerIndex = correctOption 
        ? optionLabels.indexOf(correctOption.label as typeof optionLabels[number])
        : 0;
      
      const selectedAnswerIndex = optionLabels.indexOf(response.selectedLabel as typeof optionLabels[number]);

      return {
        questionNumber: index + 1,
        itemId: response.itemId,
        moduleId: response.item.moduleId,
        moduleName: response.item.module.name,
        bloomLevel: response.item.bloom,
        stem: response.item.stem,
        figureUrl: response.item.figureUrl,
        reference: response.item.reference,
        selectedAnswerIndex,
        correctAnswerIndex,
        isCorrect: response.isCorrect,
        options: response.item.options.map(opt => ({
          label: opt.label,
          text: opt.text,
          justification: opt.justification,
          isCorrect: opt.isCorrect,
        })),
        answeredAt: response.answeredAt.toISOString(),
        responseTimeMs: response.responseTimeMs,
      };
    });

    // Determine if student can continue
    let canContinue = false;
    let continueReason: FeedbackData['continueReason'] = null;

    if (attempt.status === 'COMPLETED') {
      canContinue = false;
      continueReason = 'completed';
    } else if (questionsAttempted === 0) {
      canContinue = true;
      continueReason = 'not_started';
    } else if (questionsAttempted < attempt.fixedLengthN) {
      canContinue = true;
      continueReason = 'in_progress';
    } else if (questionsAttempted >= attempt.fixedLengthN) {
      // Reached the fixed length - can continue since quizzes have no hard limit
      canContinue = true;
      continueReason = 'reached_limit';
    }

    const feedbackData: FeedbackData = {
      attemptId: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quiz.title,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      finishedAt: attempt.finishedAt?.toISOString() || null,
      totalTimeMs,
      questionsAttempted,
      questionsCorrect,
      questionsIncorrect,
      percentage,
      fixedLength: attempt.fixedLengthN,
      modulePerformance,
      questions,
      canContinue,
      continueReason,
    };

    return NextResponse.json(feedbackData);

  } catch (error) {
    console.error('Error fetching attempt feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

