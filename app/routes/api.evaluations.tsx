/**
 * API route for evaluations data
 * Handles fetching evaluations with metadata, pass rate stats, and filter options
 */

import { type ActionFunctionArgs } from "react-router";
import { supabase } from "~/lib/supabase";
import type { EvaluationWithMeta } from "~/lib/types/api-types";
import type { PassRateSummary, ResultsFilters } from "~/lib/types/ui-types";

// GET evaluations with filters
export async function getEvaluationsWithMeta(filters: ResultsFilters) {
  const query = supabase
    .from("evaluations")
    .select(
      `
      evaluation_id,
      verdict,
      reasoning,
      created_at,
      answer_id,
      judge_id,
      answers!inner(
        answer_id,
        submission_id,
        question_template_id,
        answer_value,
        question_templates!inner(
          question_template_id,
          question_text,
          question_type
        )
      ),
      judges!inner(
        judge_id,
        name,
        provider,
        model
      )
    `
    )
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters.judgeIds.length > 0) {
    query.in("judge_id", filters.judgeIds);
  }
  if (filters.questionTemplateIds.length > 0) {
    query.in("answers.question_template_id", filters.questionTemplateIds);
  }
  if (filters.verdict !== "all") {
    query.eq("verdict", filters.verdict);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch evaluations: ${error.message}`);
  }

  // Transform the nested data structure to flat EvaluationWithMeta
  const evaluations: EvaluationWithMeta[] =
    data?.map((item: any) => ({
      evaluation_id: item.evaluation_id,
      verdict: item.verdict,
      reasoning: item.reasoning,
      created_at: item.created_at,
      answer_id: item.answers.answer_id,
      submission_id: item.answers.submission_id,
      question_template_id: item.answers.question_template_id,
      answer_value: item.answers.answer_value,
      question_text: item.answers.question_templates.question_text,
      question_type: item.answers.question_templates.question_type,
      judge_id: item.judges.judge_id,
      judge_name: item.judges.name,
      judge_provider: item.judges.provider,
      judge_model: item.judges.model,
    })) || [];

  return evaluations;
}

// GET aggregate pass rate stats
export async function getPassRateStats(
  filters: ResultsFilters
): Promise<PassRateSummary> {
  const evaluations = await getEvaluationsWithMeta(filters);

  const totalEvaluations = evaluations.length;
  const passCount = evaluations.filter((e) => e.verdict === "pass").length;
  const failCount = evaluations.filter((e) => e.verdict === "fail").length;
  const inconclusiveCount = evaluations.filter(
    (e) => e.verdict === "inconclusive"
  ).length;
  const passRate =
    totalEvaluations > 0 ? (passCount / totalEvaluations) * 100 : 0;

  return {
    totalEvaluations,
    passCount,
    failCount,
    inconclusiveCount,
    passRate,
  };
}

// GET judges that have evaluations
export async function getJudgesForFilter() {
  const { data, error } = await supabase
    .from("evaluations")
    .select(
      `
      judges!inner(
        judge_id,
        name,
        provider,
        model
      )
    `
    )
    .not("judges.is_active", "is", false);

  if (error) {
    throw new Error(`Failed to fetch judges: ${error.message}`);
  }

  // Extract unique judges from the nested structure
  const uniqueJudges = new Map();
  data?.forEach((item: any) => {
    const judge = item.judges;
    if (judge && !uniqueJudges.has(judge.judge_id)) {
      uniqueJudges.set(judge.judge_id, {
        judge_id: judge.judge_id,
        name: judge.name,
        provider: judge.provider,
        model: judge.model,
      });
    }
  });

  return Array.from(uniqueJudges.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

// GET question templates that have evaluations
export async function getQuestionTemplatesForFilter() {
  const { data, error } = await supabase.from("evaluations").select(`
      answers!inner(
        question_templates!inner(
          question_template_id,
          question_text,
          question_type
        )
      )
    `);

  if (error) {
    throw new Error(`Failed to fetch question templates: ${error.message}`);
  }

  // Extract unique question templates from the nested structure
  const uniqueQuestions = new Map();
  data?.forEach((item: any) => {
    const question = item.answers?.question_templates;
    if (question && !uniqueQuestions.has(question.question_template_id)) {
      uniqueQuestions.set(question.question_template_id, {
        question_template_id: question.question_template_id,
        question_text: question.question_text,
        question_type: question.question_type,
      });
    }
  });

  return Array.from(uniqueQuestions.values()).sort((a, b) =>
    a.question_text.localeCompare(b.question_text)
  );
}

// Action function for React Router
export async function action({ request }: ActionFunctionArgs) {
  const { ApiHandler } = await import("~/lib/api-handler");

  return ApiHandler.handleFormAction(request, {
    getEvaluations: getEvaluationsAction,
    getPassRateStats: getPassRateStatsAction,
    getFilterOptions: getFilterOptionsAction,
  } as any);
}

async function getEvaluationsAction(formData: FormData) {
  const filters: ResultsFilters = {
    judgeIds: formData.get("judgeIds")
      ? JSON.parse(formData.get("judgeIds") as string)
      : [],
    questionTemplateIds: formData.get("questionTemplateIds")
      ? JSON.parse(formData.get("questionTemplateIds") as string)
      : [],
    verdict: (formData.get("verdict") as ResultsFilters["verdict"]) || "all",
  };

  const evaluations = await getEvaluationsWithMeta(filters);
  return evaluations;
}

async function getPassRateStatsAction(formData: FormData) {
  const filters: ResultsFilters = {
    judgeIds: formData.get("judgeIds")
      ? JSON.parse(formData.get("judgeIds") as string)
      : [],
    questionTemplateIds: formData.get("questionTemplateIds")
      ? JSON.parse(formData.get("questionTemplateIds") as string)
      : [],
    verdict: (formData.get("verdict") as ResultsFilters["verdict"]) || "all",
  };

  const stats = await getPassRateStats(filters);
  return stats;
}

async function getFilterOptionsAction(formData: FormData) {
  const [judges, questionTemplates] = await Promise.all([
    getJudgesForFilter(),
    getQuestionTemplatesForFilter(),
  ]);

  return { judges, questionTemplates };
}
