/**
 * Submissions List Page
 * Displays all submissions with filtering, real-time updates, and import functionality
 */

import { useState, useEffect } from "react";
import { Link, useFetcher } from "react-router";
import {
  Plus,
  Upload,
  RefreshCw,
  Eye,
  Calendar,
  Play,
  Loader2,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { FileUpload } from "~/components/submissions/file-upload";
import { getQueues, getSubmissions } from "~/routes/api.import-submissions";
import { supabase } from "~/lib/supabase";
import type { ParsedSubmissionData } from "~/lib/types/api-types";
import { toast } from "sonner";

interface Submission {
  submission_id: string;
  labeling_task_id: string | null;
  created_at: string | null;
}

interface Queue {
  queue_id: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importing, setImporting] = useState(false);

  // Evaluation state
  const [showRunEvaluationsDialog, setShowRunEvaluationsDialog] =
    useState(false);
  const [selectedQueueForEvaluation, setSelectedQueueForEvaluation] =
    useState<string>("");
  const [evaluationStats, setEvaluationStats] = useState<{
    submissions: number;
    judgeAssignments: number;
    estimatedEvaluations: number;
  } | null>(null);

  const fetcher = useFetcher();

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("submissions-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "submissions",
        },
        (payload) => {
          console.log("New submission received:", payload);
          // Refresh the submissions list
          fetchSubmissions();
          toast.success("New submission received");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [queuesData, submissionsData] = await Promise.all([
        getQueues(),
        getSubmissions(),
      ]);

      setQueues(queuesData);
      setSubmissions(submissionsData as Submission[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const fetchSubmissions = async () => {
    try {
      const data = await getSubmissions();
      setSubmissions(data as Submission[]);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    }
  };

  const handleImport = async (data: ParsedSubmissionData) => {
    try {
      setImporting(true);

      // Send data to the API with action field
      const response = await fetch("/api/import-submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "import",
          parsedData: data,
        }),
      });

      const result = await response.json();

      // Log the full response for debugging
      console.log("Import API response:", result);
      console.log("HTTP status:", response.status);

      // Extract the actual import result from the nested data structure
      const importResult = result.data;

      if (importResult.success) {
        toast.success(
          `Successfully imported ${importResult.createdCounts.submissions} submissions, ` +
            `${importResult.createdCounts.question_templates} question templates, and ${importResult.createdCounts.answers} answers`
        );
        setShowImportDialog(false);
        fetchData(); // Refresh the data
      } else {
        // Show detailed error message
        const errorMsg =
          importResult.errors && importResult.errors.length > 0
            ? importResult.errors.join(", ")
            : "Import failed with no error details";
        console.error("Import failed:", errorMsg);
        toast.error(`Import failed: ${errorMsg}`);
      }
    } catch (err) {
      console.error("Import exception:", err);
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleImportError = (error: string) => {
    toast.error(error);
  };

  // Evaluation handlers
  const handleRunEvaluations = async (queueId: string) => {
    try {
      // Get evaluation stats for confirmation dialog
      const { data: answerJudges } = await supabase
        .from("answer_judges")
        .select("answer_id, judge_id");

      const judgeAssignments = answerJudges?.length || 0;
      const estimatedEvaluations = submissions.length * judgeAssignments;

      setEvaluationStats({
        submissions: submissions.length,
        judgeAssignments,
        estimatedEvaluations,
      });
      setSelectedQueueForEvaluation(queueId);
      setShowRunEvaluationsDialog(true);
    } catch (error) {
      toast.error("Failed to get evaluation stats");
    }
  };

  const confirmRunEvaluations = () => {
    if (!selectedQueueForEvaluation) return;

    const formData = new FormData();
    formData.append("queueId", selectedQueueForEvaluation);

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/run-evaluations",
    });

    setShowRunEvaluationsDialog(false);
  };

  // Handle evaluation results
  useEffect(() => {
    if (fetcher.data) {
      const data = fetcher.data as any;
      if (data.success) {
        toast.success(data.message);
        fetchData(); // Refresh submissions
      } else {
        toast.error(data.message);
      }
    }
  }, [fetcher.data]);

  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      searchTerm === "" ||
      submission.submission_id
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (submission.labeling_task_id &&
        submission.labeling_task_id
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-muted-foreground">
            Manage and view submission data
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search by submission or task..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              disabled={importing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchData(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions ({filteredSubmissions.length})</CardTitle>
          <CardDescription>All submissions in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                {searchTerm
                  ? "No submissions match your search"
                  : "No submissions found. Import some data to get started."}
              </div>
              {!searchTerm && (
                <Button onClick={() => setShowImportDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Import JSON Data
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submission ID</TableHead>
                  <TableHead>Task ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => {
                  return (
                    <TableRow key={submission.submission_id}>
                      <TableCell className="font-medium">
                        {submission.submission_id}
                      </TableCell>
                      <TableCell>
                        {submission.labeling_task_id ? (
                          <Badge variant="secondary">
                            {submission.labeling_task_id}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatDate(submission.created_at || "")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              to={`/dashboard/submissions/${submission.submission_id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Import Submission Data</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImportDialog(false)}
                >
                  ×
                </Button>
              </div>
              <FileUpload
                onDataParsed={handleImport}
                onError={handleImportError}
                disabled={importing}
              />
            </div>
          </div>
        </div>
      )}

      {/* Run Evaluations Dialog */}
      <Dialog
        open={showRunEvaluationsDialog}
        onOpenChange={setShowRunEvaluationsDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run AI Evaluations</DialogTitle>
            <DialogDescription>
              This will run AI judges on all submissions in the selected queue.
            </DialogDescription>
          </DialogHeader>

          {evaluationStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">
                    Queue: {selectedQueueForEvaluation}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {evaluationStats.submissions} submissions
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Judge Assignments</h4>
                  <p className="text-sm text-muted-foreground">
                    {evaluationStats.judgeAssignments} judge-question pairs
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Estimated Evaluations</h4>
                <p className="text-2xl font-bold text-primary">
                  {evaluationStats.estimatedEvaluations}
                </p>
                <p className="text-sm text-muted-foreground">
                  This may take several minutes to complete
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRunEvaluationsDialog(false)}
              disabled={fetcher.state === "submitting"}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRunEvaluations}
              disabled={fetcher.state === "submitting"}
            >
              {fetcher.state === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Evaluations
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
