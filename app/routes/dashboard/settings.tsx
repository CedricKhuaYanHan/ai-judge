"use client";
import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { toast } from "sonner";
import { supabase } from "~/lib/supabase";
import {
  Database,
  Trash2,
  Database as DatabaseIcon,
  BarChart3,
} from "lucide-react";

interface DatabaseStats {
  submissions: number;
  questionTemplates: number;
  answers: number;
  evaluations: number;
  judges: number;
  attachments: number;
}

export default function Page() {
  const [stats, setStats] = useState<DatabaseStats>({
    submissions: 0,
    questionTemplates: 0,
    answers: 0,
    evaluations: 0,
    judges: 0,
    attachments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch counts from all tables
      const [
        submissionsResult,
        questionTemplatesResult,
        answersResult,
        evaluationsResult,
        judgesResult,
        attachmentsResult,
      ] = await Promise.all([
        supabase
          .from("submissions")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("question_templates")
          .select("*", { count: "exact", head: true }),
        supabase.from("answers").select("*", { count: "exact", head: true }),
        supabase
          .from("evaluations")
          .select("*", { count: "exact", head: true }),
        supabase.from("judges").select("*", { count: "exact", head: true }),
        supabase
          .from("attachments")
          .select("*", { count: "exact", head: true }),
      ]);

      setStats({
        submissions: submissionsResult.count || 0,
        questionTemplates: questionTemplatesResult.count || 0,
        answers: answersResult.count || 0,
        evaluations: evaluationsResult.count || 0,
        judges: judgesResult.count || 0,
        attachments: attachmentsResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching database stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setDeleting(true);
      toast.loading("Deleting all data...", { id: "delete-all-data" });

      // Delete in order to respect foreign key constraints
      await supabase.from("evaluations").delete().neq("evaluation_id", "");
      await supabase.from("attachments").delete().neq("attachment_id", "");
      await supabase.from("answer_judges").delete().neq("answer_id", "");
      await supabase.from("answer_queues").delete().neq("answer_id", "");
      await supabase.from("answers").delete().neq("answer_id", "");
      await supabase
        .from("question_templates")
        .delete()
        .neq("question_template_id", "");
      await supabase.from("submissions").delete().neq("submission_id", "");
      await supabase.from("judges").delete().neq("judge_id", "");

      // Refresh stats
      await fetchStats();

      toast.success("All data deleted successfully", {
        id: "delete-all-data",
        description: "Database has been cleared of all content",
      });
    } catch (error) {
      console.error("Error deleting data:", error);
      toast.error("Failed to delete data", {
        id: "delete-all-data",
        description: "Please try again or check the console for details",
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="space-y-6">
              {/* Database Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DatabaseIcon className="h-5 w-5" />
                    Database Statistics
                  </CardTitle>
                  <CardDescription>
                    Current data in your AI Judge database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {stats.submissions}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Submissions
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {stats.questionTemplates}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Question Templates
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {stats.answers}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Answers
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {stats.evaluations}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Evaluations
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {stats.judges}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Judges
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {stats.attachments}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Attachments
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Data Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Manage your database content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-destructive">
                          Delete All Data
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          This will permanently delete all submissions,
                          questions, evaluations, judges, and attachments from
                          your database. This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    disabled={loading || deleting}
                    onClick={handleDeleteAllData}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deleting ? "Deleting..." : "Delete All Data"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
