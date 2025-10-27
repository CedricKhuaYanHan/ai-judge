/**
 * Judge management page - Create and manage AI judges
 */

import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { JudgeForm } from "~/components/judges/judge-form";
import { JudgeList } from "~/components/judges/judge-list";
import type { Judge, LLMProvider } from "~/lib/types/database-types";
import type { JudgeWithStats } from "~/lib/types/ui-types";
import { supabase } from "~/lib/supabase";

interface LoaderData {
  judges: JudgeWithStats[];
  stats: {
    totalJudges: number;
    activeJudges: number;
    totalEvaluations: number;
    averagePassRate: number;
  };
}

export async function loader() {
  try {
    // Fetch judges directly from Supabase (server-side)
    const { data: judges, error: judgesError } = await supabase
      .from("judges")
      .select("judge_id, name, provider, model, prompt, is_active, created_at")
      .order("created_at", { ascending: false });

    if (judgesError) {
      console.error("Error fetching judges:", judgesError);
      throw new Error("Failed to fetch judges");
    }

    // Fetch evaluations separately to avoid complex joins
    let evaluations: any[] = [];
    try {
      const { data: evaluationsData, error: evaluationsError } = await supabase
        .from("evaluations")
        .select("evaluation_id, verdict, created_at, answer_id, judge_id");

      if (evaluationsError) {
        console.warn("Could not fetch evaluations:", evaluationsError.message);
      } else {
        evaluations = evaluationsData || [];
      }
    } catch (error) {
      console.warn(
        "Evaluations table may not exist or connection failed:",
        error
      );
      evaluations = [];
    }

    // Calculate stats for each judge
    const judgesWithStats: JudgeWithStats[] = judges.map((judge) => {
      // Get evaluations for this specific judge
      const judgeEvaluations = evaluations.filter(
        (e) => e.judge_id === judge.judge_id
      );

      const totalEvaluations = judgeEvaluations.length;
      const passCount = judgeEvaluations.filter(
        (e) => e.verdict === "pass"
      ).length;
      const passRate =
        totalEvaluations > 0 ? (passCount / totalEvaluations) * 100 : 0;

      return {
        judge_id: judge.judge_id,
        name: judge.name,
        provider: judge.provider as LLMProvider,
        model: judge.model,
        prompt: judge.prompt,
        is_active: judge.is_active,
        created_at: judge.created_at,
        totalEvaluations,
        passRate: Math.round(passRate * 100) / 100,
        lastUsed:
          judgeEvaluations.length > 0
            ? judgeEvaluations.sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              )[0].created_at || undefined
            : undefined,
      };
    });

    // Calculate overall stats
    const totalJudges = judges.length;
    const activeJudges = judges.filter(
      (judge) => judge.is_active === true
    ).length;
    const totalEvaluations = judgesWithStats.reduce(
      (sum, judge) => sum + judge.totalEvaluations,
      0
    );
    const averagePassRate =
      judgesWithStats.length > 0
        ? judgesWithStats.reduce((sum, judge) => sum + judge.passRate, 0) /
          judgesWithStats.length
        : 0;

    return {
      judges: judgesWithStats,
      stats: {
        totalJudges,
        activeJudges,
        totalEvaluations,
        averagePassRate,
      },
    };
  } catch (error) {
    console.error("Error in judges loader:", error);
    return {
      judges: [],
      stats: {
        totalJudges: 0,
        activeJudges: 0,
        totalEvaluations: 0,
        averagePassRate: 0,
      },
    };
  }
}

export default function JudgesPage() {
  const { judges, stats } = useLoaderData<LoaderData>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null);
  const fetcher = useFetcher();

  const handleCreateJudge = () => {
    setEditingJudge(null);
    setIsFormOpen(true);
  };

  const handleEditJudge = (judge: Judge) => {
    setEditingJudge(judge);
    setIsFormOpen(true);
  };

  const handleDeleteJudge = (judge: Judge) => {
    // The delete action is handled in the JudgeList component
    // This is just for any additional logic if needed
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingJudge(null);
    // React Router automatically revalidates after successful form submissions
  };

  const handleToggleActive = (judgeId: string, currentStatus: boolean) => {
    // Use fetcher to submit the toggle action to the API route
    fetcher.submit(
      {
        action: "toggle",
        judge_id: judgeId,
        is_active: (!currentStatus).toString(),
      },
      { method: "post", action: "/api/judges" }
    );
  };

  // Watch for successful fetcher submissions and close form
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setIsFormOpen(false);
      setEditingJudge(null);

      // Show success toast
      const message =
        fetcher.data.action === "create"
          ? "Judge created successfully!"
          : "Judge updated successfully!";
      toast.success(message);
    }

    if (fetcher.state === "idle" && fetcher.data?.error) {
      toast.error(fetcher.data.error);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Show loading indicator */}
      {fetcher.state !== "idle" && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
          Processing...
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Judges</h2>
          <p className="text-muted-foreground">
            Create and manage AI judges for evaluating submissions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreateJudge}>
            <Plus className="h-4 w-4 mr-2" />
            Create Judge
          </Button>
        </div>
      </div>

      {/* Judges List */}
      <JudgeList
        judges={judges}
        onDelete={handleDeleteJudge}
        onEdit={handleEditJudge}
        onToggleActive={handleToggleActive}
        activeJudgesCount={stats.activeJudges}
      />

      {/* Judge Form Modal */}
      <JudgeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingJudge(null);
        }}
        onSuccess={handleFormSuccess}
        editingJudge={editingJudge}
      />
    </div>
  );
}
