/**
 * Evaluation orchestrator service for running AI judge evaluations
 * Handles the new schema with answer-based judge assignments
 */

import { supabase } from "~/lib/supabase";
import type { EvaluationContext, EvaluationResult } from "~/lib/types/api-types";
import { executeEvaluation } from "~/lib/services/evaluation-executor";
import { createProviderRateLimiter } from "~/lib/services/rate-limiter";
import type { 
  LLMProvider,
  Judge,
  Attachment
} from "~/lib/types/database-types";

interface EvaluationTask {
  answer_id: string;
  judge_id: string;
  answerData: any; // I would normally do a discriminated union here, but I don't have access to the types you use
  questionTemplateData: {
    question_template_id: string;
    questionType: string;
    questionText: string;
  };
}

interface EvaluationSummary {
  total: number;
  completed: number;
  failed: number;
  errors: Array<{ task: EvaluationTask; error: string }>;
}


/**
 * Main orchestration function to run evaluations for a queue
 */
export async function runEvaluations(queueId: string): Promise<EvaluationSummary> {
  try {
    // Fetch all required data
    const { answers, attachmentsByAnswer, tasks } = await fetchEvaluationData(queueId);
    
    if (tasks.length === 0) {
      return { total: 0, completed: 0, failed: 0, errors: [] };
    }

    // Execute evaluations
    return await executeEvaluations(tasks, attachmentsByAnswer);
  } catch (error) {
    console.error("Error in runEvaluations:", error);
    throw error;
  }
}

/**
 * Fetch all data needed for evaluations
 */
async function fetchEvaluationData(queueId: string) {
  // Fetch answers with question templates
  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select(`
      answer_id,
      submission_id,
      question_template_id,
      question_revision,
      answer_value,
      question_templates!inner(
        question_template_id,
        question_text,
        question_type
      ),
      answer_queues!inner(queue_id)
    `)
    .eq("answer_queues.queue_id", queueId);

  if (answersError) {
    throw new Error(`Failed to fetch answers: ${answersError.message}`);
  }

  if (!answers || answers.length === 0) {
    return { answers: [], attachmentsByAnswer: new Map(), tasks: [] };
  }

  // Fetch attachments
  const answerIds = answers.map(a => a.answer_id);
  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .in("answer_id", answerIds);

  const attachmentsByAnswer = new Map<string, Attachment[]>();
  (attachments || []).forEach(attachment => {
    const existing = attachmentsByAnswer.get(attachment.answer_id) || [];
    existing.push(attachment);
    attachmentsByAnswer.set(attachment.answer_id, existing);
  });

  // Build tasks
  const tasks = await buildEvaluationTasks(answers);

  return { answers, attachmentsByAnswer, tasks };
}

/**
 * Execute all evaluation tasks
 */
async function executeEvaluations(
  tasks: EvaluationTask[], 
  attachmentsByAnswer: Map<string, Attachment[]>
): Promise<EvaluationSummary> {
  const summary: EvaluationSummary = {
    total: tasks.length,
    completed: 0,
    failed: 0,
    errors: [],
  };

  // Group tasks by provider and fetch judges
  const tasksByProvider = await groupTasksByProvider(tasks);

  // Execute all providers in parallel
  const providerPromises = Array.from(tasksByProvider.entries()).map(async ([provider, providerTasks]) => {
    const rateLimiter = createProviderRateLimiter(provider);
    
    const promises = providerTasks.map(task => 
      rateLimiter(async () => {
        const judge = await getJudge(task.judge_id);
        const attachments = attachmentsByAnswer.get(task.answer_id) || [];
        
        const context: EvaluationContext = {
          questionText: task.questionTemplateData.questionText,
          questionType: task.questionTemplateData.questionType,
          answerData: task.answerData,
          attachments: attachments.map(att => ({
            attachment_id: att.attachment_id,
            answer_id: att.answer_id,
            url: att.url,
            type: att.type,
            created_at: att.created_at,
          })),
        };

        const result = await executeEvaluation(judge, context);
        await storeEvaluationResult(task.answer_id, task.judge_id, result);
        
        return { success: true, task };
      }).catch(error => {
        console.error(`Evaluation failed for answer ${task.answer_id} with judge ${task.judge_id}:`, error);
        return { success: false, task, error: error instanceof Error ? error.message : "Unknown error" };
      })
    );
    
    return await Promise.all(promises);
  });

  const allProviderResults = await Promise.all(providerPromises);
  
  // Aggregate results
  for (const providerResults of allProviderResults) {
    for (const result of providerResults) {
      if (result.success) {
        summary.completed++;
      } else {
        summary.failed++;
        summary.errors.push({
          task: result.task,
          error: 'error' in result ? result.error : 'Unknown error',
        });
      }
    }
  }

  return summary;
}

/**
 * Group tasks by provider for rate limiting
 */
async function groupTasksByProvider(tasks: EvaluationTask[]): Promise<Map<string, EvaluationTask[]>> {
  const tasksByProvider = new Map<string, EvaluationTask[]>();

  for (const task of tasks) {
    const judge = await getJudge(task.judge_id);
    const provider = judge.provider;
    
    if (!tasksByProvider.has(provider)) {
      tasksByProvider.set(provider, []);
    }
    tasksByProvider.get(provider)!.push(task);
  }

  return tasksByProvider;
}

/**
 * Get judge data (with caching)
 */
interface CachedJudge {
  judge: Judge;
  timestamp: number;
}

const judgeCache = new Map<string, CachedJudge>();
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL

async function getJudge(judgeId: string): Promise<Judge> {
  // DISABLED CACHING: Always fetch fresh from database
  // This prevents stale prompts when judges are updated during testing
  
  const { data: judge, error: judgeError } = await supabase
    .from("judges")
    .select("*")
    .eq("judge_id", judgeId)
    .single();

  if (judgeError || !judge) {
    throw new Error(`Failed to fetch judge ${judgeId}: ${judgeError?.message}`);
  }

  const judgeData = {
    ...judge,
    provider: judge.provider as LLMProvider,
  };
  
  return judgeData;
}

/**
 * Clear judge cache (useful for testing or after judge updates)
 */
export function clearJudgeCache(judgeId?: string) {
  if (judgeId) {
    judgeCache.delete(judgeId);
  } else {
    judgeCache.clear();
  }
}

/**
 * Build evaluation tasks from answers
 */
async function buildEvaluationTasks(answers: any[]): Promise<EvaluationTask[]> {
  const tasks: EvaluationTask[] = [];
  
  // Get unique answer IDs
  const answerIds = answers.map(a => a.answer_id);
  
  // Fetch judges for these specific answers
  const { data: answerJudges, error: judgesError } = await supabase
    .from("answer_judges")
    .select(`
      answer_id,
      judges!inner(
        judge_id,
        name,
        provider,
        model,
        prompt,
        is_active
      )
    `)
    .in("answer_id", answerIds)
    .eq("judges.is_active", true);

  if (judgesError) {
    throw new Error(`Failed to fetch judges: ${judgesError.message}`);
  }

  if (!answerJudges || answerJudges.length === 0) {
    return [];
  }


  // Create tasks for each answer-judge combination
  for (const answer of answers) {
    const relevantJudges = answerJudges.filter(
      aj => aj.answer_id === answer.answer_id
    );
    
    for (const answerJudge of relevantJudges) {
      tasks.push({
        answer_id: answer.answer_id,
        judge_id: answerJudge.judges.judge_id,
        answerData: answer.answer_value,
        questionTemplateData: {
          question_template_id: answer.question_templates.question_template_id,
          questionType: answer.question_templates.question_type || "text",
          questionText: answer.question_templates.question_text,
        },
      });
    }
  }

  return tasks;
}

/**
 * Store evaluation result in database
 */
async function storeEvaluationResult(
  answerId: string,
  judgeId: string,
  result: EvaluationResult
): Promise<void> {
  const { error } = await supabase
    .from("evaluations")
    .insert({
      evaluation_id: crypto.randomUUID(),
      answer_id: answerId,
      judge_id: judgeId,
      verdict: result.verdict,
      reasoning: result.reasoning,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to store evaluation result: ${error.message}`);
  }
}
