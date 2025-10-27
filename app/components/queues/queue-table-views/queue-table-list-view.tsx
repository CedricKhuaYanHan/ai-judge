import { memo } from "react";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import type { QuestionTemplate } from "~/lib/types/database-types";
import type { Judge } from "~/lib/types/database-types";
import { AnswerTableRow } from "./answer-table-row";

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

interface QueueTableListViewProps {
  answers: AnswerWithDetails[];
  allJudges: Judge[];
  onAssignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onUnassignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onRemoveFromQueue: (answerId: string) => Promise<void>;
}

export const QueueTableListView = memo(function QueueTableListView({
  answers,
  allJudges,
  onAssignJudge,
  onUnassignJudge,
  onRemoveFromQueue,
}: QueueTableListViewProps) {
  if (answers.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Answers in Queue</h3>
        <p className="text-muted-foreground">
          Import submission data to create answers in this queue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {answers.length} answer{answers.length !== 1 ? "s" : ""} in this queue
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Question</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[150px]">Answer</TableHead>
              <TableHead className="w-[150px]">Submission ID</TableHead>
              <TableHead className="w-[150px]">Judges Assigned</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {answers.map((answer) => (
              <AnswerTableRow
                key={answer.answer_id}
                answer={answer}
                allJudges={allJudges}
                onAssignJudge={onAssignJudge}
                onUnassignJudge={onUnassignJudge}
                onRemoveFromQueue={onRemoveFromQueue}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});
