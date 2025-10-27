/**
 * API route for running AI judge evaluations
 * Handles validation and orchestrates evaluation execution
 */

import { type ActionFunctionArgs } from "react-router";
import { supabase } from "~/lib/supabase";
import { ApiHandler } from "~/lib/api-handler";
import { runEvaluations } from "~/lib/services/evaluation-orchestrator";

interface RunEvaluationsResponse {
  success: boolean;
  summary: {
    total: number;
    completed: number;
    failed: number;
    errors: Array<{ task: any; error: string }>;
  };
  message: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const queueId = formData.get("queueId") as string;

    if (!queueId) {
      return ApiHandler.errorResponse("Queue ID is required", 400);
    }

    // 1. Check if queue has answers
    const { data: answers, error: answersError } = await supabase
      .from("answer_queues")
      .select("answer_id")
      .eq("queue_id", queueId);

    if (answersError) {
      return ApiHandler.errorResponse(
        `Failed to check answers for queue: ${answersError.message}`,
        500
      );
    }

    if (!answers || answers.length === 0) {
      return ApiHandler.errorResponse("No answers found for this queue", 400);
    }

    // 2. Check if answers have assigned judges
    const { data: answerJudges, error: answerJudgesError } = await supabase
      .from("answer_judges")
      .select("answer_id, judge_id");

    if (answerJudgesError) {
      return ApiHandler.errorResponse(
        `Failed to check judge assignments: ${answerJudgesError.message}`,
        500
      );
    }

    if (!answerJudges || answerJudges.length === 0) {
      return ApiHandler.errorResponse(
        "No judges assigned to any answers. Please assign judges to answers first.",
        400
      );
    }

    // 3. Run evaluations
    console.log(
      `Starting evaluations for queue ${queueId} with ${answers.length} answers`
    );

    const summary = await runEvaluations(queueId);

    const response: RunEvaluationsResponse = {
      success: true,
      summary,
      message: `Evaluations completed: ${summary.completed}/${summary.total} successful, ${summary.failed} failed`,
    };

    console.log("Evaluation summary:", summary);

    return ApiHandler.successResponse(response);
  } catch (error) {
    console.error("Error in run evaluations action:", error);
    return ApiHandler.errorResponse(
      error instanceof Error ? error.message : "An unexpected error occurred",
      500
    );
  }
}
