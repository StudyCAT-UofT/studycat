/**
 * Client utility for communicating with the FastAPI service
 */

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000/v1';

export interface FastAPIInitRequest {
  attempt_id: string;
  concepts?: string[];
  prior_mu?: number;
  prior_sigma2?: number;
}

export interface FastAPIInitResponse {
  attempt_id: string;
  theta: Record<string, number>;
  next_item?: {
    item_id: string;
    skill: string;
    stem: string;
    options: string[];
  };
  next_action: string;
}

export interface FastAPIStepRequest {
  attempt_id: string;
  response_id: string;
  item_id?: string;
  answer_index?: number;
  response_time_ms?: number;
}

export interface FastAPIStepResponse {
  attempt_id: string;
  theta: Record<string, number>;
  mastery: Record<string, boolean>;
  next_action: string;
  next_item?: {
    item_id: string;
    skill: string;
    stem: string;
    options: string[];
  };
}

export class FastAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = FASTAPI_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('FastAPI health check failed:', error);
      return false;
    }
  }

  async initAttempt(request: FastAPIInitRequest): Promise<FastAPIInitResponse> {
    const response = await fetch(`${this.baseUrl}/attempts/${request.attempt_id}/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modules: request.concepts,
        prior_mu: request.prior_mu,
        prior_sigma2: request.prior_sigma2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FastAPI init attempt failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async stepAttempt(request: FastAPIStepRequest): Promise<FastAPIStepResponse> {
    const response = await fetch(`${this.baseUrl}/attempts/${request.attempt_id}/step`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        response_id: request.response_id,
        item_id: request.item_id,
        answer_index: request.answer_index,
        response_time_ms: request.response_time_ms,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FastAPI step attempt failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }
}

export const fastApiClient = new FastAPIClient();
