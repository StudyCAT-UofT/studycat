/**
 * Client utility for interacting with quiz attempt endpoints
 */

import type {
  InitAttemptRequest,
  InitAttemptResponse,
  StepAttemptRequest,
  StepAttemptResponse,
  AttemptResultsResponse,
} from '@/types'

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

  async getResults(attemptId: string): Promise<AttemptResultsResponse> {
    const response = await fetch(`${this.baseUrl}/results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ attemptId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch quiz results');
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
