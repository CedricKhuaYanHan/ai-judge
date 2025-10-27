/**
 * Results Page
 * Displays evaluation results with filtering and aggregate statistics
 */

import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { supabase } from "~/lib/supabase";
import { toast } from "sonner";
import { EvaluationsTable } from "~/components/results/evaluations-table";
import { ReasoningDialog } from "~/components/results/reasoning-dialog";
import type { EvaluationWithMeta } from "~/lib/types/api-types";
import type {
  PassRateSummary as PassRateSummaryType,
  ResultsFilters as ResultsFiltersType,
} from "~/lib/types/ui-types";

export default function ResultsPage() {
  const [filters, setFilters] = useState<ResultsFiltersType>({
    judgeIds: [],
    questionTemplateIds: [],
    verdict: "all",
  });
  const [evaluations, setEvaluations] = useState<EvaluationWithMeta[]>([]);
  const [passRateStats, setPassRateStats] =
    useState<PassRateSummaryType | null>(null);
  const [allJudges, setAllJudges] = useState<
    Array<{ judge_id: string; name: string; provider: string }>
  >([]);
  const [allQuestions, setAllQuestions] = useState<
    Array<{ question_template_id: string; question_text: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvaluation, setSelectedEvaluation] =
    useState<EvaluationWithMeta | null>(null);

  const fetcher = useFetcher();

  // Load filter options on mount
  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Load evaluations when filters change
  useEffect(() => {
    loadEvaluations();
  }, [filters]);

  // Real-time subscription for new evaluations
  useEffect(() => {
    const subscription = supabase
      .channel("evaluations-results")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "evaluations",
        },
        () => {
          loadEvaluations(); // Refresh on new evaluation
          toast.success("New evaluation received");
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [filters]);

  async function loadFilterOptions() {
    try {
      const formData = new FormData();
      formData.append("action", "getFilterOptions");

      const response = await fetch("/api/evaluations", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setAllJudges(result.data.judges);
        setAllQuestions(result.data.questionTemplates);
      } else {
        console.error("Failed to load filter options:", result.error);
        toast.error("Failed to load filter options");
      }
    } catch (error) {
      console.error("Error loading filter options:", error);
      toast.error("Failed to load filter options");
    }
  }

  async function loadEvaluations() {
    try {
      setLoading(true);

      // Load evaluations
      const evaluationsFormData = new FormData();
      evaluationsFormData.append("action", "getEvaluations");
      evaluationsFormData.append("judgeIds", JSON.stringify(filters.judgeIds));
      evaluationsFormData.append(
        "questionTemplateIds",
        JSON.stringify(filters.questionTemplateIds)
      );
      evaluationsFormData.append("verdict", filters.verdict);

      const evaluationsResponse = await fetch("/api/evaluations", {
        method: "POST",
        body: evaluationsFormData,
      });

      const evaluationsResult = await evaluationsResponse.json();

      if (evaluationsResult.success) {
        setEvaluations(evaluationsResult.data);
      } else {
        console.error("Failed to load evaluations:", evaluationsResult.error);
        toast.error("Failed to load evaluations");
      }

      // Load pass rate stats
      const statsFormData = new FormData();
      statsFormData.append("action", "getPassRateStats");
      statsFormData.append("judgeIds", JSON.stringify(filters.judgeIds));
      statsFormData.append(
        "questionTemplateIds",
        JSON.stringify(filters.questionTemplateIds)
      );
      statsFormData.append("verdict", filters.verdict);

      const statsResponse = await fetch("/api/evaluations", {
        method: "POST",
        body: statsFormData,
      });

      const statsResult = await statsResponse.json();

      if (statsResult.success) {
        setPassRateStats(statsResult.data);
      } else {
        console.error("Failed to load pass rate stats:", statsResult.error);
        toast.error("Failed to load pass rate stats");
      }
    } catch (error) {
      console.error("Error loading evaluations:", error);
      toast.error("Failed to load evaluations");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Results</h2>
          <p className="text-muted-foreground">
            View and analyze evaluation results
          </p>
        </div>

        {/* Evaluation Results Summary */}
        {passRateStats && (
          <div className="flex items-center gap-6">
            {/* Pass Rate */}
            <div className="text-center p-3 bg-blue-50 rounded-lg w-24">
              <div className="text-xl font-bold text-primary">
                {passRateStats.passRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Pass Rate</div>
            </div>

            {/* Breakdown */}
            <div className="flex gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg w-24">
                <div className="text-xl font-bold text-green-700">
                  {passRateStats.passCount}
                </div>
                <div className="text-xs text-green-600">Pass</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg w-24">
                <div className="text-xl font-bold text-red-700">
                  {passRateStats.failCount}
                </div>
                <div className="text-xs text-red-600">Fail</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg w-24">
                <div className="text-xl font-bold text-gray-700">
                  {passRateStats.inconclusiveCount}
                </div>
                <div className="text-xs text-gray-600">Inconclusive</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Evaluations Table */}
      <Card>
        <CardContent className="p-6">
          <EvaluationsTable
            evaluations={evaluations}
            loading={loading}
            onViewReasoning={setSelectedEvaluation}
            allJudges={allJudges}
            allQuestions={allQuestions}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </CardContent>
      </Card>

      {/* Reasoning Dialog */}
      <ReasoningDialog
        evaluation={selectedEvaluation}
        open={!!selectedEvaluation}
        onClose={() => setSelectedEvaluation(null)}
      />
    </div>
  );
}
