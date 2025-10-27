/**
 * API-related types for the AI Judge system
 * These types are used for API requests, responses, and data processing
 */

import type { Attachment, Verdict } from "./database-types";

// API request/response types
export interface EvaluationResult {
  verdict: Verdict;
  reasoning: string;
}

export interface EvaluationContext {
  questionText: string;
  questionType: string;
  answerData: Record<string, any>;
  attachments?: Attachment[];
}

export interface EvaluationWithMeta {
  evaluation_id: string;
  verdict: string | null;
  reasoning: string | null;
  created_at: string | null;
  
  // Answer meta
  answer_id: string;
  submission_id: string;
  question_template_id: string;
  answer_value: Record<string, any>;
  
  // Question template meta
  question_text: string;
  question_type: string | null;
  
  // Judge meta
  judge_id: string;
  judge_name: string;
  judge_provider: string;
  judge_model: string;
}

// Data processing types
export interface ParsedSubmissionData {
  submissions: Array<{
    submission_id: string;
    labeling_task_id: string | null;
    created_at: string | null;
  }>;
  question_templates: Array<{
    question_template_id: string;
    revision: number;
    question_text: string;
    question_type: string | null;
    created_at: string | null;
  }>;
  answers: Array<{
    answer_id: string;
    submission_id: string;
    question_template_id: string;
    question_revision: number;
    answer_value: Record<string, any>;
    created_at: string | null;
  }>;
  answer_queues: Array<{
    answer_id: string;
    queue_id: string;
  }>;
}

export interface ParseResult {
  success: boolean;
  data?: ParsedSubmissionData;
  errors: string[];
}

export interface SubmissionImportResult {
  success: boolean;
  createdCounts: {
    submissions: number;
    question_templates: number;
    answers: number;
  };
  errors: string[];
}

// API request types
export interface AddAnswersToQueueRequest {
  queueId: string;
  answerIds: string[];
}

export interface QueueRenameRequest {
  oldQueueId: string;
  newQueueId: string;
}

export interface QueueDeleteRequest {
  queueId: string;
}

export type QueueManagementAction = 
  | "add_answers_to_queue"
  | "remove_answers_from_queue"
  | "rename_queue"
  | "delete_queue";

// LLM Provider configuration
export interface LLMProviderInfo {
  name: string;
  displayName: string;
  models: string[];
  supportsAttachments: boolean;
  supportsVision: boolean;
}

export interface JudgeConfigMetadata {
  includedFields: {
    questionText: boolean;
    questionType: boolean;
    answerData: boolean;
    attachments: boolean;
  };
}

export const LLM_PROVIDERS: Record<import("./database-types").LLMProvider, LLMProviderInfo> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4o", "gpt-4o-mini"],
    supportsAttachments: true,
    supportsVision: true,
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic",
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
    supportsAttachments: true,
    supportsVision: true,
  },
  gemini: {
    name: "gemini",
    displayName: "Google Gemini",
    models: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
    supportsAttachments: true,
    supportsVision: true,
  },
};

// Answer-Judge API types
export interface AssignJudgeRequest {
  action: "assign_judge";
  answer_id: string;
  judge_id: string;
}

export interface UnassignJudgeRequest {
  action: "unassign_judge";
  answer_id: string;
  judge_id: string;
}

export interface UpdateJudgesRequest {
  action: "update_judges";
  answer_id: string;
  judge_ids: string[];
}

export interface BulkJudgeAssignmentRequest {
  action: "bulk_assign_judge";
  judge_id: string;
  answer_ids: string[];
}

export type AnswerJudgeActionRequest = 
  | AssignJudgeRequest 
  | UnassignJudgeRequest 
  | UpdateJudgesRequest
  | BulkJudgeAssignmentRequest;

export interface AnswerJudgeResponse {
  message: string;
  assigned_count?: number;
}

export interface AnswerJudgeWithDetails {
  answer_id: string;
  judge_id: string;
  answers: {
    answer_id: string;
    submission_id: string;
    question_template_id: string;
    answer_value: Record<string, any>; // any is supposed to be {choice, reasoning} but we can have other answer types so i used any
    question_templates: {
      question_template_id: string;
      question_text: string;
      question_type: string | null;
    };
  };
  judges: {
    judge_id: string;
    name: string;
    provider: string;
    model: string;
    prompt: string;
  };
}
