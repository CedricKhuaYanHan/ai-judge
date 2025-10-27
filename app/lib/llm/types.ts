/**
 * Common LLM types and interfaces for the AI Judge system
 */

import type { LLMProvider } from "~/lib/types/database-types";
import type {
  EvaluationContext,
  EvaluationResult,
} from "~/lib/types/api-types";

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  context: EvaluationContext;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  result: EvaluationResult;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProviderInterface {
  name: string;
  evaluate(request: LLMRequest): Promise<LLMResponse>;
  supportsAttachments: boolean;
  supportsVision: boolean;
  validateModel(model: string): boolean;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface EvaluationPrompt {
  systemPrompt: string;
  userPrompt: string;
  context: EvaluationContext;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
}
