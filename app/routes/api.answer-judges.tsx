/**
 * API Route for Managing Answer-Judge Assignments
 * Handles CRUD operations for answer-judge relationships
 */

import { type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { supabase } from "~/lib/supabase";
import { ApiHandler } from "~/lib/api-handler";
import type {
  AssignJudgeRequest,
  UnassignJudgeRequest,
  UpdateJudgesRequest,
  BulkJudgeAssignmentRequest,
  AnswerJudgeResponse,
  AnswerJudgeWithDetails,
} from "~/lib/types/api-types";

// API Route Loader Function for GET requests
export async function loader({ request }: LoaderFunctionArgs) {
  return ApiHandler.handleLoader(async () => {
    const url = new URL(request.url);
    const answerId = url.searchParams.get("answer_id");
    const judgeId = url.searchParams.get("judge_id");

    let query = supabase.from("answer_judges").select(`
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
        judges!inner(judge_id, name, provider, model, prompt)
      `);

    if (answerId) {
      query = query.eq("answer_id", answerId);
    }
    if (judgeId) {
      query = query.eq("judge_id", judgeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(
        `Failed to fetch answer-judge relationships: ${error.message}`
      );
    }

    return {
      answerJudges: (data || []) as AnswerJudgeWithDetails[],
      errors: [],
    };
  });
}

// API Route Action Function
export async function action({ request }: ActionFunctionArgs) {
  const methodCheck = ApiHandler.checkMethod(request, ["POST"]);
  if (methodCheck) return methodCheck;

  return ApiHandler.handleJsonAction(request, {
    assign_judge: assignJudge,
    unassign_judge: unassignJudge,
    update_judges: updateJudges,
    bulk_assign_judge: bulkAssignJudge,
  });
}

async function assignJudge(
  body: AssignJudgeRequest
): Promise<AnswerJudgeResponse> {
  const { answer_id, judge_id } = body;

  const { error } = await supabase
    .from("answer_judges")
    .insert({ answer_id, judge_id });

  if (error) {
    throw new Error(`Failed to assign judge: ${error.message}`);
  }

  return { message: "Judge assigned successfully" };
}

async function unassignJudge(
  body: UnassignJudgeRequest
): Promise<AnswerJudgeResponse> {
  const { answer_id, judge_id } = body;

  const { error } = await supabase
    .from("answer_judges")
    .delete()
    .eq("answer_id", answer_id)
    .eq("judge_id", judge_id);

  if (error) {
    throw new Error(`Failed to unassign judge: ${error.message}`);
  }

  return { message: "Judge unassigned successfully" };
}

async function updateJudges(
  body: UpdateJudgesRequest
): Promise<AnswerJudgeResponse> {
  const { answer_id, judge_ids } = body;

  // First, remove all existing assignments for this answer
  const { error: deleteError } = await supabase
    .from("answer_judges")
    .delete()
    .eq("answer_id", answer_id);

  if (deleteError) {
    throw new Error(
      `Failed to remove existing assignments: ${deleteError.message}`
    );
  }

  // Then, add new assignments if any
  if (judge_ids.length > 0) {
    const assignments = judge_ids.map((judge_id: string) => ({
      answer_id,
      judge_id,
    }));

    const { error: insertError } = await supabase
      .from("answer_judges")
      .insert(assignments);

    if (insertError) {
      throw new Error(`Failed to assign judges: ${insertError.message}`);
    }
  }

  return { message: `Updated judges for answer ${answer_id}` };
}

async function bulkAssignJudge(
  body: BulkJudgeAssignmentRequest
): Promise<AnswerJudgeResponse> {
  const { judge_id, answer_ids } = body;

  if (answer_ids.length === 0) {
    return { message: "No answers to assign", assigned_count: 0 };
  }

  // Check which answers already have this judge assigned
  const { data: existingAssignments, error: checkError } = await supabase
    .from("answer_judges")
    .select("answer_id")
    .eq("judge_id", judge_id)
    .in("answer_id", answer_ids);

  if (checkError) {
    throw new Error(
      `Failed to check existing assignments: ${checkError.message}`
    );
  }

  const existingAnswerIds = new Set(
    existingAssignments?.map((a) => a.answer_id) || []
  );
  const newAnswerIds = answer_ids.filter((id) => !existingAnswerIds.has(id));

  if (newAnswerIds.length === 0) {
    return {
      message: "All selected answers already have this judge assigned",
      assigned_count: 0,
    };
  }

  // Batch insert new assignments
  const assignments = newAnswerIds.map((answer_id: string) => ({
    answer_id,
    judge_id,
  }));

  const { error: insertError } = await supabase
    .from("answer_judges")
    .insert(assignments);

  if (insertError) {
    throw new Error(
      `Failed to assign judge to answers: ${insertError.message}`
    );
  }

  return {
    message: `Successfully assigned judge to ${newAnswerIds.length} answer${
      newAnswerIds.length !== 1 ? "s" : ""
    }`,
    assigned_count: newAnswerIds.length,
  };
}
