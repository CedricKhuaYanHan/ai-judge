/**
 * Database-related types for the AI Judge system
 * These types directly correspond to database tables and their relationships
 */

// Core database entities
export interface Submission {
  submission_id: string;
  labeling_task_id: string | null;
  created_at: string | null;
}

export interface QuestionTemplate {
  question_template_id: string;
  revision: number;
  question_text: string;
  question_type: string | null;
  created_at: string | null;
}

export interface Answer {
  answer_id: string;
  submission_id: string;
  question_template_id: string;
  question_revision: number;
  answer_value: Record<string, any>;
  created_at: string | null;
}

export interface Judge {
  judge_id: string;
  name: string;
  provider: LLMProvider;
  model: string;
  prompt: string;
  is_active: boolean | null;
  created_at: string | null;
}

export interface Evaluation {
  evaluation_id: string;
  answer_id: string;
  judge_id: string;
  verdict: string | null;
  reasoning: string | null;
  created_at: string | null;
}

export interface Attachment {
  attachment_id: string;
  answer_id: string;
  url: string;
  type?: string | null;
  file_size?: number | null;
  created_at: string | null;
}

// Junction tables
export interface AnswerQueue {
  answer_id: string;
  queue_id: string;
}

export interface AnswerJudge {
  answer_id: string;
  judge_id: string;
}

// Enums
export type LLMProvider = "openai" | "anthropic" | "gemini";
export type Verdict = "pass" | "fail" | "inconclusive";

// Extended types
export interface JudgeWithStats extends Judge {
  totalEvaluations?: number;
  passCount?: number;
  failCount?: number;
  inconclusiveCount?: number;
  passRate?: number;
}
