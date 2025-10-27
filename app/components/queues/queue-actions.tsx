import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Edit, Trash2, Play, Loader2, List, Users } from "lucide-react";
import { toast } from "sonner";
import { BulkJudgeAssignmentDialog } from "~/components/judges/bulk-judge-assignment-dialog";
import type { Judge } from "~/lib/types/database-types";

interface AnswerWithDetails {
  answer_id: string;
  submission_id: string;
  question_template_id: string;
  question_revision: number;
  answer_value: Record<string, any>;
  created_at: string | null;
  question_template: {
    question_template_id: string;
    revision: number;
    question_text: string;
    question_type: string | null;
    created_at: string | null;
  };
  judges: Judge[];
}

interface QueueActionsProps {
  queueId: string;
  onRenameQueue: (oldQueueId: string, newQueueId: string) => Promise<void>;
  onDeleteQueue: (queueId: string) => Promise<void>;
  onRunEvaluations: (queueId: string) => Promise<void>;
  onBulkAssignJudge: (judgeId: string, answerIds: string[]) => Promise<void>;
  viewMode: "list" | "group";
  onViewModeChange: (mode: "list" | "group") => void;
  allAnswers: AnswerWithDetails[];
  allJudges: Judge[];
}

export function QueueActions({
  queueId,
  onRenameQueue,
  onDeleteQueue,
  onRunEvaluations,
  onBulkAssignJudge,
  viewMode,
  onViewModeChange,
  allAnswers,
  allJudges,
}: QueueActionsProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [isRunningEvaluations, setIsRunningEvaluations] = useState(false);

  const handleRename = async () => {
    if (!newQueueName.trim()) return;

    try {
      await onRenameQueue(queueId, newQueueName.trim());
      setRenameDialogOpen(false);
      setNewQueueName("");
    } catch (error) {
      console.error("Failed to rename queue:", error);
    }
  };

  const handleRunEvaluations = async () => {
    setIsRunningEvaluations(true);
    try {
      await onRunEvaluations(queueId);
      toast.success("Evaluations Completed", {
        description: "Go to results page to view the evaluations.",
      });
    } catch (error) {
      console.error("Failed to run evaluations:", error);
      toast.error("Failed to run evaluations", {
        description: "Please try again.",
      });
    } finally {
      setIsRunningEvaluations(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* View Mode Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onViewModeChange(viewMode === "list" ? "group" : "list")}
        className="flex items-center gap-2"
      >
        {viewMode === "list" ? (
          <>
            <Users className="h-4 w-4" />
            Group By Submission
          </>
        ) : (
          <>
            <List className="h-4 w-4" />
            List View
          </>
        )}
      </Button>

      {/* Bulk Assign Judges */}
      <BulkJudgeAssignmentDialog
        queueId={queueId}
        allAnswers={allAnswers}
        allJudges={allJudges}
        onBulkAssign={onBulkAssignJudge}
      />

      {/* Rename Queue Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Rename
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Queue</DialogTitle>
            <DialogDescription>
              Enter a new name for the queue "{queueId}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">New Queue Name</Label>
              <Input
                id="new-name"
                value={newQueueName}
                onChange={(e) => setNewQueueName(e.target.value)}
                placeholder="Enter new queue name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newQueueName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Queue Alert */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Queue</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the queue "{queueId}"? This will
              remove all questions from this queue but won't delete the
              questions themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDeleteQueue(queueId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Run Evaluations Button */}
      <Button
        onClick={handleRunEvaluations}
        size="sm"
        className="bg-green-600 hover:bg-green-700 text-white"
        disabled={isRunningEvaluations}
      >
        {isRunningEvaluations ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-2" />
        )}
        {isRunningEvaluations ? "Running..." : "Run Evaluations"}
      </Button>
    </div>
  );
}
