import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRevalidator, useNavigate } from "react-router";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AlertCircle, Plus } from "lucide-react";
import { supabase } from "~/lib/supabase";
import type { QuestionTemplate } from "~/lib/types/database-types";
import type { Judge, LLMProvider } from "~/lib/types/database-types";
import type { QueueWithAnswerCount } from "~/lib/types/ui-types";
import { QueueSelector } from "~/components/queues/queue-selector";
import { QueueActions } from "~/components/queues/queue-actions";
import { QueueTable } from "~/components/queues/queue-table";
import { toast } from "sonner";

interface AnswerWithDetails {
  answer_id: string;
  submission_id: string;
  question_template_id: string;
  question_revision: number;
  answer_value: Record<string, any>;
  created_at: string | null;
  question_template: QuestionTemplate;
  judges: Judge[];
}

interface QueueStats {
  totalAnswers: number;
  totalEvaluations: number;
  passCount: number;
  failCount: number;
  inconclusiveCount: number;
  passRate: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const selectedQueueId = url.searchParams.get("queue");

  console.log("Queues loader starting...");

  try {
    // Parallelize all database queries for faster loading
    const [
      answersResult,
      judgesResult,
      answerJudgesResult,
      answerQueuesResult,
      evaluationStatsResult,
    ] = await Promise.all([
      selectedQueueId
        ? (async () => {
            // First get answer IDs for the selected queue
            const { data: queueAnswers } = await supabase
              .from("answer_queues")
              .select("answer_id")
              .eq("queue_id", selectedQueueId);

            if (!queueAnswers || queueAnswers.length === 0) {
              return { data: [], error: null };
            }

            const answerIds = queueAnswers.map((aq) => aq.answer_id);

            // Then get the answers with their question templates
            return await supabase
              .from("answers")
              .select(
                `
                answer_id,
                submission_id,
                question_template_id,
                question_revision,
                answer_value,
                created_at,
                question_templates!inner(
                  question_template_id,
                  revision,
                  question_text,
                  question_type,
                  created_at
                )
              `
              )
              .in("answer_id", answerIds);
          })()
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("judges")
        .select(
          "judge_id, name, provider, model, prompt, is_active, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase.from("answer_judges").select("answer_id, judge_id"),
      supabase.from("answer_queues").select("answer_id, queue_id"),
      selectedQueueId
        ? supabase.rpc("get_evaluation_stats", {
            queue_id_param: selectedQueueId,
          })
        : Promise.resolve({ data: [], error: null }),
    ]);

    // Error handling
    if (answersResult.error) {
      console.error("Error fetching answers:", answersResult.error);
      throw new Error("Failed to fetch answers");
    }
    if (judgesResult.error) {
      console.error("Error fetching judges:", judgesResult.error);
      throw new Error("Failed to fetch judges");
    }
    if (answerJudgesResult.error) {
      console.error(
        "Error fetching answer-judge relationships:",
        answerJudgesResult.error
      );
      throw new Error("Failed to fetch answer-judge relationships");
    }
    if (answerQueuesResult.error) {
      console.error(
        "Error fetching answer-queue relationships:",
        answerQueuesResult.error
      );
      throw new Error("Failed to fetch answer-queue relationships");
    }

    const answers = answersResult.data || [];
    const judges = (judgesResult.data || []).map((judge) => ({
      ...judge,
      provider: judge.provider as LLMProvider,
      is_active: judge.is_active ?? false,
    }));
    const answerJudges = answerJudgesResult.data || [];
    const answerQueues = answerQueuesResult.data || [];

    console.log(
      `Fetched: ${answers.length} answers, ${judges.length} judges, ${answerJudges.length} answer-judge relationships, ${answerQueues.length} answer-queue relationships`
    );

    // Create a map of answer_id to judges
    const answerJudgeMap = new Map<string, Judge[]>();
    for (const aj of answerJudges) {
      const judge = judges.find((j) => j.judge_id === aj.judge_id);
      if (judge) {
        if (!answerJudgeMap.has(aj.answer_id)) {
          answerJudgeMap.set(aj.answer_id, []);
        }
        answerJudgeMap.get(aj.answer_id)!.push({
          ...judge,
          provider: judge.provider as LLMProvider,
          is_active: judge.is_active ?? false,
        });
      }
    }

    // Create a map of queue_id to answers for filtering
    const queueAnswerMap = new Map<string, string[]>();
    for (const aq of answerQueues) {
      if (!queueAnswerMap.has(aq.queue_id)) {
        queueAnswerMap.set(aq.queue_id, []);
      }
      queueAnswerMap.get(aq.queue_id)!.push(aq.answer_id);
    }

    // Get unique queue IDs with answer counts
    const uniqueQueues = Array.from(
      new Set(answerQueues.map((aq) => aq.queue_id))
    );

    const queuesWithCounts: QueueWithAnswerCount[] = uniqueQueues.map(
      (queueId) => ({
        queue_id: queueId,
        created_at: null,
        answerCount: queueAnswerMap.get(queueId)?.length || 0,
      })
    );

    // Transform answers with their question templates and assigned judges
    const answersWithDetails: AnswerWithDetails[] = answers.map((answer) => ({
      answer_id: answer.answer_id,
      submission_id: answer.submission_id,
      question_template_id: answer.question_template_id,
      question_revision: answer.question_revision,
      answer_value: answer.answer_value as Record<string, any>,
      created_at: answer.created_at,
      question_template: answer.question_templates,
      judges: answerJudgeMap.get(answer.answer_id) || [],
    }));

    // Get queue statistics
    let queueStats: QueueStats = {
      totalAnswers: 0,
      totalEvaluations: 0,
      passCount: 0,
      failCount: 0,
      inconclusiveCount: 0,
      passRate: 0,
    };

    if (
      selectedQueueId &&
      evaluationStatsResult.data &&
      evaluationStatsResult.data.length > 0
    ) {
      const stats = evaluationStatsResult.data[0];
      queueStats = {
        totalAnswers: answersWithDetails.length,
        totalEvaluations: stats.total_evaluations,
        passCount: stats.pass_count,
        failCount: stats.fail_count,
        inconclusiveCount: stats.inconclusive_count,
        passRate: stats.pass_rate,
      };
    } else if (selectedQueueId) {
      queueStats = {
        totalAnswers: answersWithDetails.length,
        totalEvaluations: 0,
        passCount: 0,
        failCount: 0,
        inconclusiveCount: 0,
        passRate: 0,
      };
    }

    console.log("Loader completed successfully");
    return {
      queues: queuesWithCounts,
      selectedQueueAnswers: answersWithDetails,
      judges: judges || [],
      selectedQueueId,
      queueStats,
    };
  } catch (error) {
    console.error("Loader error:", error);
    return {
      queues: [],
      selectedQueueAnswers: [],
      judges: [],
      selectedQueueId: null,
      queueStats: {
        totalAnswers: 0,
        totalEvaluations: 0,
        passCount: 0,
        failCount: 0,
        inconclusiveCount: 0,
        passRate: 0,
      },
    };
  }
}

export default function QueuesPage() {
  const { queues, selectedQueueAnswers, judges, selectedQueueId, queueStats } =
    useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "group">("list");

  const handleQueueSelect = (queueId: string | null) => {
    const url = new URL(window.location.href);
    if (queueId) {
      url.searchParams.set("queue", queueId);
    } else {
      url.searchParams.delete("queue");
    }
    navigate(url.pathname + url.search, { replace: true });
  };

  const handleRenameQueue = async (oldQueueId: string, newQueueId: string) => {
    try {
      const response = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename_queue",
          oldQueueId,
          newQueueId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename queue");
      }

      revalidator.revalidate();
    } catch (error) {
      console.error("Error renaming queue:", error);
      throw error;
    }
  };

  const handleDeleteQueue = async (queueId: string) => {
    try {
      const response = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_queue",
          queueId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete queue");
      }

      // Navigate away from deleted queue
      navigate("/dashboard/queues");
      revalidator.revalidate();
    } catch (error) {
      console.error("Error deleting queue:", error);
      throw error;
    }
  };

  const handleRemoveAnswer = async (queueId: string, answerId: string) => {
    try {
      const response = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove_answer",
          queueId,
          answerId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove answer from queue");
      }

      revalidator.revalidate();
    } catch (error) {
      console.error("Error removing answer from queue:", error);
      throw error;
    }
  };

  const handleAssignJudge = async (answerId: string, judgeId: string) => {
    try {
      const response = await fetch("/api/answer-judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_judge",
          answer_id: answerId,
          judge_id: judgeId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign judge");
      }

      revalidator.revalidate();
    } catch (error) {
      console.error("Error assigning judge:", error);
      throw error;
    }
  };

  const handleUnassignJudge = async (answerId: string, judgeId: string) => {
    try {
      const response = await fetch("/api/answer-judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unassign_judge",
          answer_id: answerId,
          judge_id: judgeId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to unassign judge");
      }

      revalidator.revalidate();
    } catch (error) {
      console.error("Error unassigning judge:", error);
      throw error;
    }
  };

  const handleRunEvaluations = async (queueId: string) => {
    try {
      const formData = new FormData();
      formData.append("queueId", queueId);

      const response = await fetch("/api/run-evaluations", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to run evaluations");
      }

      const result = await response.json();
      console.log("Evaluation result:", result);

      // Revalidate to get updated stats
      revalidator.revalidate();
    } catch (error) {
      console.error("Error running evaluations:", error);
      throw error;
    }
  };

  const handleBulkAssignJudge = async (
    judgeId: string,
    answerIds: string[]
  ) => {
    try {
      const response = await fetch("/api/answer-judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_assign_judge",
          judge_id: judgeId,
          answer_ids: answerIds,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to bulk assign judge");
      }

      const result = await response.json();
      console.log("Bulk assignment result:", result);

      // Show success toast
      toast.success("Judge Assigned Successfully", {
        description: result.message,
      });

      // Revalidate to get updated judge assignments
      revalidator.revalidate();
    } catch (error) {
      console.error("Error bulk assigning judge:", error);
      toast.error("Failed to Assign Judge", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Queue Management
          </h2>
          <p className="text-muted-foreground">
            Manage queues and their questions, assign judges, and run
            evaluations
          </p>
        </div>
        <QueueSelector
          queues={queues}
          selectedQueueId={selectedQueueId}
          onQueueSelect={handleQueueSelect}
          placeholder="Select a queue to manage..."
        />
      </div>

      {selectedQueueId ? (
        <>
          {/* Answers in Queue */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Answers in Queue</CardTitle>
                  <CardDescription>
                    Manage answers and assign judges for{" "}
                    <span className="font-bold">{selectedQueueId}</span>
                  </CardDescription>
                </div>
                <QueueActions
                  queueId={selectedQueueId}
                  onRenameQueue={handleRenameQueue}
                  onDeleteQueue={handleDeleteQueue}
                  onRunEvaluations={handleRunEvaluations}
                  onBulkAssignJudge={handleBulkAssignJudge}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  allAnswers={selectedQueueAnswers}
                  allJudges={judges}
                />
              </div>
            </CardHeader>
            <CardContent>
              <QueueTable
                answers={selectedQueueAnswers}
                allJudges={judges}
                onAssignJudge={handleAssignJudge}
                onUnassignJudge={handleUnassignJudge}
                onRemoveFromQueue={(answerId) =>
                  handleRemoveAnswer(selectedQueueId, answerId)
                }
                viewMode={viewMode}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Queue Selected</h3>
            <p className="text-muted-foreground text-center mb-4">
              Select a queue from the dropdown above to manage its questions and
              run evaluations.
            </p>
            {queues.length === 0 && (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  No queues found. Import submission data to create queues.
                </p>
                <Button asChild>
                  <a href="/dashboard/submissions">
                    <Plus className="mr-2 h-4 w-4" />
                    Import Submissions
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
