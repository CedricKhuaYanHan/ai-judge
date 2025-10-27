/**
 * JSON Parser Service for AI Judge System
 * Handles parsing and validation of submission data from JSON files
 */

import { z } from "zod";
import type { 
  Submission, 
  QuestionTemplate,
  Answer,
} from "~/lib/types/database-types";
import type {
  ParsedSubmissionData,
  ParseResult 
} from "~/lib/types/api-types";


// Validation schemas
const QuestionTypeSchema = z.enum([
  "text", 
  "multiple_choice", 
  "rating", 
  "boolean", 
  "file_upload",
  "single_choice_with_reasoning"
]);

const QuestionDataSchema = z.object({
  id: z.string(),
  questionType: QuestionTypeSchema,
  questionText: z.string(),
  metadata: z.record(z.any()).optional().default({})
});

const SubmissionQuestionSchema = z.object({
  rev: z.number().optional().default(1),
  data: QuestionDataSchema
});

const SubmissionSchema = z.object({
  id: z.string(),
  queueId: z.string(),
  labelingTaskId: z.string().optional(),
  createdAt: z.union([z.string(), z.number()]).transform((val) => {
    if (typeof val === 'number') {
      return new Date(val).toISOString();
    }
    return val;
  }),
  questions: z.array(SubmissionQuestionSchema).optional().default([]),
  answers: z.record(z.any()).optional().default({})
});

const ImportDataSchema = z.array(SubmissionSchema);

/**
 * Parse and validate JSON submission data, separating question templates from answers
 */
export function parseSubmissionData(jsonData: unknown): ParseResult {
  try {
    // Handle both single object and array formats
    let dataToValidate = jsonData;
    if (Array.isArray(jsonData)) {
      dataToValidate = jsonData;
    } else if (typeof jsonData === 'object' && jsonData !== null) {
      // If it's a single object, wrap it in an array
      dataToValidate = [jsonData];
    }
    
    const validatedData = ImportDataSchema.parse(dataToValidate);
    const submissions: Submission[] = [];
    const questionTemplates: QuestionTemplate[] = [];
    const answers: Answer[] = [];
    const answerQueues: Array<{ answer_id: string; queue_id: string }> = [];
    const questionTemplateSet = new Set<string>();

    for (const submission of validatedData) {
      // Create submission with labeling_task_id
      submissions.push({
        submission_id: submission.id,
        labeling_task_id: submission.labelingTaskId || null,
        created_at: submission.createdAt
      });

      // Extract unique question templates
      for (const submissionQuestion of submission.questions || []) {
        const questionData = submissionQuestion.data;
        
        if (!questionTemplateSet.has(questionData.id)) {
          questionTemplateSet.add(questionData.id);
          questionTemplates.push({
            question_template_id: questionData.id,
            revision: submissionQuestion.rev || 1,
            question_text: questionData.questionText,
            question_type: questionData.questionType,
            created_at: new Date().toISOString()
          });
        }
      }

      // Create answers linking submissions to question templates
      for (const [questionId, answerData] of Object.entries(submission.answers || {})) {
        // Find the question template revision for this question
        const questionTemplate = questionTemplates.find(qt => qt.question_template_id === questionId);
        if (questionTemplate) {
          const answerId = crypto.randomUUID();
          answers.push({
            answer_id: answerId,
            submission_id: submission.id,
            question_template_id: questionId,
            question_revision: questionTemplate.revision,
            answer_value: answerData,
            created_at: new Date().toISOString()
          });
          
          // Create answer-queue relationship
          answerQueues.push({
            answer_id: answerId,
            queue_id: submission.queueId
          });
        }
      }
    }

    return {
      success: true,
      data: { submissions, question_templates: questionTemplates, answers, answer_queues: answerQueues },
      errors: []
    };

  } catch (error) {
    const errors: string[] = [];
    
    if (error instanceof z.ZodError) {
      for (const issue of error.issues) {
        const path = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
        errors.push(`${issue.message}${path}`);
      }
    } else if (error instanceof Error) {
      errors.push(error.message);
    } else {
      errors.push('Unknown parsing error occurred');
    }

    return {
      success: false,
      errors
    };
  }
}

/**
 * Validate JSON file content before parsing
 */
export function validateJsonFile(content: string): { valid: boolean; error?: string } {
  try {
    JSON.parse(content);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON format'
    };
  }
}

/**
 * Get import statistics
 */
export function getImportStats(data: ParsedSubmissionData): {
  submissionCount: number;
  questionTemplateCount: number;
  answerCount: number;
  queueIds: string[];
} {
  // Extract unique queue IDs from answer_queues relationships
  const queueIds = [...new Set(data.answer_queues.map(aq => aq.queue_id))];
  
  return {
    submissionCount: data.submissions.length,
    questionTemplateCount: data.question_templates.length,
    answerCount: data.answers.length,
    queueIds
  };
}