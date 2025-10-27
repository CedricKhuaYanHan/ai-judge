/**
 * Submission Detail Page
 * Shows detailed view of a single submission with all questions and answers
 */

import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
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
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Separator } from "~/components/ui/separator";
import { getSubmissionDetails } from "~/routes/api.import-submissions";
import { QuestionTypeBadge } from "~/components/questions/question-type-badge";
import { JudgeAssignmentBadges } from "~/components/judges/judge-assignment-badges";
import { AttachmentList } from "~/components/submissions/attachment-list";
import { supabase } from "~/lib/supabase";
import type { Judge, Attachment } from "~/lib/types/database-types";

interface SubmissionDetail {
  submission_id: string;
  labeling_task_id: string | null;
  created_at: string | null;
  answers: Array<{
    answer_id: string;
    question_template_id: string;
    question_revision: number;
    answer_value: any;
    created_at: string | null;
    question_templates: {
      question_template_id: string;
      question_text: string;
      question_type: string | null;
    };
  }>;
}

interface AnswerWithJudges {
  answer_id: string;
  question_template_id: string;
  question_revision: number;
  answer_value: any;
  created_at: string | null;
  question_templates: {
    question_template_id: string;
    question_text: string;
    question_type: string | null;
  };
  assigned_judges: Judge[];
  attachments: Attachment[];
}

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [answersWithJudges, setAnswersWithJudges] = useState<
    AnswerWithJudges[]
  >([]);
  const [allJudges, setAllJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSubmissionDetails(id);
    }
  }, [id]);

  const fetchSubmissionDetails = async (submissionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSubmissionDetails(submissionId);
      setSubmission(data as SubmissionDetail);

      // Fetch all judges and judge assignments for each answer
      await Promise.all([
        fetchAllJudges(),
        fetchJudgeAssignments(data.answers),
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch submission details"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAllJudges = async () => {
    try {
      const { data, error } = await supabase
        .from("judges")
        .select(
          "judge_id, name, provider, model, prompt, is_active, created_at"
        )
        .order("name");

      if (error) {
        throw new Error(`Failed to fetch judges: ${error.message}`);
      }

      setAllJudges(
        (data || []).map((judge) => ({
          ...judge,
          provider: judge.provider as any, // Cast to LLMProvider
          is_active: judge.is_active ?? false,
        }))
      );
    } catch (err) {
      console.error("Error fetching judges:", err);
    }
  };

  const fetchJudgeAssignments = async (
    answers: SubmissionDetail["answers"]
  ) => {
    try {
      const answersWithJudges: AnswerWithJudges[] = [];

      for (const answer of answers) {
        // Fetch judges assigned to this answer
        const { data: judgeAssignments, error } = await supabase
          .from("answer_judges")
          .select(
            `
            judge_id,
            judges!inner(
              judge_id,
              name,
              provider,
              model,
              is_active,
              created_at
            )
          `
          )
          .eq("answer_id", answer.answer_id);

        if (error) {
          console.error(
            `Error fetching judges for answer ${answer.answer_id}:`,
            error
          );
        }

        const assignedJudges: Judge[] =
          judgeAssignments?.map((assignment: any) => ({
            judge_id: assignment.judges.judge_id,
            name: assignment.judges.name,
            provider: assignment.judges.provider,
            model: assignment.judges.model,
            prompt: "", // Not needed for display
            is_active: assignment.judges.is_active,
            created_at: assignment.judges.created_at,
          })) || [];

        // Fetch attachments for this answer
        const { data: attachments, error: attachmentsError } = await supabase
          .from("attachments")
          .select("*")
          .eq("answer_id", answer.answer_id)
          .order("created_at", { ascending: false });

        if (attachmentsError) {
          console.error(
            `Error fetching attachments for answer ${answer.answer_id}:`,
            attachmentsError
          );
        }

        answersWithJudges.push({
          ...answer,
          assigned_judges: assignedJudges,
          attachments: attachments || [],
        });
      }

      setAnswersWithJudges(answersWithJudges);
    } catch (err) {
      console.error("Error fetching judge assignments:", err);
      // Don't set error state for judge assignments, just log it
    }
  };

  const handleJudgesUpdated = () => {
    if (submission) {
      fetchJudgeAssignments(submission.answers);
    }
  };

  const handleAssignJudge = async (answerId: string, judgeId: string) => {
    try {
      const response = await fetch("/api/answer-judges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "assign_judge",
          answer_id: answerId,
          judge_id: judgeId,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to assign judge");
      }

      // Refresh judge assignments
      handleJudgesUpdated();
    } catch (err) {
      console.error("Error assigning judge:", err);
    }
  };

  const handleUnassignJudge = async (answerId: string, judgeId: string) => {
    try {
      const response = await fetch("/api/answer-judges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unassign_judge",
          answer_id: answerId,
          judge_id: judgeId,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to unassign judge");
      }

      // Refresh judge assignments
      handleJudgesUpdated();
    } catch (err) {
      console.error("Error unassigning judge:", err);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("attachmentId", attachmentId);

      const response = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to delete attachment");
      }

      // Refresh attachments for all answers
      if (submission) {
        fetchJudgeAssignments(submission.answers);
      }
    } catch (error) {
      console.error("Error deleting attachment:", error);
      throw error;
    }
  };

  const handleAttachmentsUpdated = () => {
    // Refresh attachments for all answers
    if (submission) {
      fetchJudgeAssignments(submission.answers);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case "text":
        return <FileText className="h-4 w-4" />;
      case "multiple_choice":
        return <CheckCircle className="h-4 w-4" />;
      case "rating":
        return <AlertCircle className="h-4 w-4" />;
      case "boolean":
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-4">
          <div className="h-32 w-full bg-muted animate-pulse rounded" />
          <div className="h-64 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard/submissions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Alert variant="destructive">
          <AlertDescription>{error || "Submission not found"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/dashboard/submissions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Submission Details</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">
              Submission ID: {submission.submission_id}
            </Badge>
            <Badge variant="secondary">
              Task ID: {submission.labeling_task_id || "N/A"}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(submission.created_at || "")}
            </Badge>
          </div>
        </div>
      </div>

      {/* Questions and Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Questions & Answers ({submission.answers.length})
          </CardTitle>
          <CardDescription>
            All questions and answers for this submission
          </CardDescription>
        </CardHeader>
        <CardContent>
          {answersWithJudges.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No questions found for this submission
            </div>
          ) : (
            <div className="space-y-6">
              {answersWithJudges.map((answer, index) => (
                <div key={answer.answer_id} className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-3">
                      {/* Question Row */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="text-lg font-medium">
                            {answer.question_templates.question_text}
                          </div>
                          <div className="flex items-center gap-2">
                            <QuestionTypeBadge
                              questionType={
                                answer.question_templates.question_type ||
                                "text"
                              }
                            />
                            <Badge variant="outline" className="text-xs">
                              Rev {answer.question_revision}
                            </Badge>
                          </div>
                        </div>

                        {/* Right side: Judge Assignments */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Judge Assignments */}
                          <JudgeAssignmentBadges
                            answerId={answer.answer_id}
                            assignedJudges={answer.assigned_judges}
                            allJudges={allJudges}
                            onAssignJudge={handleAssignJudge}
                            onUnassignJudge={handleUnassignJudge}
                          />
                        </div>
                      </div>

                      {/* Answer */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Answer</label>
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Answer {index + 1}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(answer.created_at || "")}
                            </span>
                          </div>
                          <div className="text-sm">
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(answer.answer_value, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>

                      {/* Attachments */}
                      {answer.attachments && answer.attachments.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">
                            Attachments
                          </label>
                          <div className="p-3 bg-muted rounded-lg">
                            <AttachmentList
                              attachments={answer.attachments}
                              onDelete={handleDeleteAttachment}
                              onRefresh={handleAttachmentsUpdated}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {index < answersWithJudges.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
