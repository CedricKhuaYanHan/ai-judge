/**
 * Reasoning Dialog Component
 * Modal to show full reasoning text with evaluation context
 */

import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { EvaluationWithMeta } from "~/lib/types/api-types";
import { formatAnswerValue } from "~/components/queues/queue-table-views/table-row-components/answer-formatters";

interface ReasoningDialogProps {
  evaluation: EvaluationWithMeta | null;
  open: boolean;
  onClose: () => void;
}

export function ReasoningDialog({
  evaluation,
  open,
  onClose,
}: ReasoningDialogProps) {
  if (!evaluation) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Evaluation Reasoning</DialogTitle>
          <DialogDescription>
            {evaluation.judge_name} • {evaluation.verdict}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Question</h4>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              {evaluation.question_text}
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Judge Details</h4>
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Judge:</strong> {evaluation.judge_name}
              </p>
              <p>
                <strong>Provider:</strong> {evaluation.judge_provider}
              </p>
              <p>
                <strong>Model:</strong> {evaluation.judge_model}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Answer</h4>
            <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
              {formatAnswerValue(
                evaluation.answer_value,
                evaluation.question_type || ""
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Verdict</h4>
            <Badge className={getVerdictColor(evaluation.verdict)}>
              {evaluation.verdict || "N/A"}
            </Badge>
          </div>

          <div>
            <h4 className="font-medium mb-2">Reasoning</h4>
            <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md max-h-60 overflow-y-auto">
              {evaluation.reasoning || "No reasoning provided"}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Submission</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Submission ID:</strong> {evaluation.submission_id}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Created:</strong> {formatDate(evaluation.created_at)}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Utility functions
function getVerdictColor(verdict: string | null): string {
  switch (verdict) {
    case "pass":
      return "bg-green-100 text-green-800 border-green-200";
    case "fail":
      return "bg-red-100 text-red-800 border-red-200";
    case "inconclusive":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function formatDate(date: string | null): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
