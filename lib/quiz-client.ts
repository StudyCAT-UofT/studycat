/**
 * Client utility for interacting with quiz attempt endpoints
 */

interface InitAttemptRequest {
  quizId: string;
  concepts?: string[];
  priorMu?: number;
  priorSigma2?: number;
}

interface InitAttemptResponse {
  attemptId: string;
  quizId: string;
  enrollmentId: string;
  theta: Record<string, number>;
  nextItem?: {
    item_id: string;
    skill: string;
    stem: string;
    options: string[];
  };
  nextAction: string;
  startedAt: string;
}

interface StepAttemptRequest {
  attemptId: string;
  itemId: string;
  answerIndex: number;
  responseTimeMs?: number;
}

interface StepAttemptResponse {
  attemptId: string;
  theta: Record<string, number>;
  mastery: Record<string, boolean>;
  nextAction: string;
  nextItem?: {
    item_id: string;
    skill: string;
    stem: string;
    options: string[];
  };
  isFinished: boolean;
  feedback?: {
    correctAnswerIndex: number;
    selectedAnswerIndex: number;
    isCorrect: boolean;
    justification: string | null;
  };
}

export class QuizClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/quiz/attempt') {
    this.baseUrl = baseUrl;
  }

  async initAttempt(request: InitAttemptRequest): Promise<InitAttemptResponse> {
    const response = await fetch(`${this.baseUrl}/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to initialize quiz attempt');
    }

    return response.json();
  }

  async stepAttempt(request: StepAttemptRequest): Promise<StepAttemptResponse> {
    const response = await fetch(`${this.baseUrl}/step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process quiz step');
    }

    return response.json();
  }
}

export const quizClient = new QuizClient();

// Example usage:
/*
const client = new QuizClient();

// Initialize a quiz attempt
const initResponse = await client.initAttempt({
  quizId: 'quiz-123',
  concepts: ['Module1', 'Module2'], // optional
});

console.log('Quiz started:', initResponse);

// Answer a question
const stepResponse = await client.stepAttempt({
  attemptId: initResponse.attemptId,
  itemId: initResponse.nextItem?.item_id,
  answerIndex: 0, // 0 for A, 1 for B, etc.
  responseTimeMs: 5000, // optional
});

console.log('Next question:', stepResponse.nextItem);
console.log('Is finished:', stepResponse.isFinished);
*/
