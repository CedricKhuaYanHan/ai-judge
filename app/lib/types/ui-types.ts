/**
 * UI-related types for the AI Judge system
 * These types are used for UI state management, component props, and user interactions
 */

import type { Judge, Answer, QuestionTemplate } from "./database-types";

// UI state and filters
export interface ResultsFilters {
  judgeIds: string[];
  questionTemplateIds: string[];
  verdict: 'all' | 'pass' | 'fail' | 'inconclusive';
}

export interface QueueStats {
  totalSubmissions: number;
  totalQuestionTemplates: number;
  totalAnswers: number;
  totalEvaluations: number;
  passRate: number;
  lastActivity?: string;
}

export interface PassRateSummary {
  totalEvaluations: number;
  passCount: number;
  failCount: number;
  inconclusiveCount: number;
  passRate: number; // percentage
}

// Component-specific types
export interface AnswerWithDetails {
  answer_id: string;
  submission_id: string;
  question_template_id: string;
  question_revision: number;
  answer_value: Record<string, any>;
  created_at: string | null;
  question_template: QuestionTemplate;
  judges: Judge[];
}

export interface JudgeWithStats extends Judge {
  totalEvaluations: number;
  passRate: number;
  lastUsed?: string;
}

export interface QueueWithAnswerCount {
  queue_id: string;
  created_at: string | null;
  answerCount: number;
}

// UI action types
export interface QueueManagementAction {
  action: "rename_queue" | "delete_queue" | "create_queue" | "add_answers" | "remove_answer";
  queueId: string;
  newName?: string;
  answerIds?: string[];
  answerId?: string;
}

export interface JudgeAssignment {
  judge_id: string;
  answer_id: string;
}
