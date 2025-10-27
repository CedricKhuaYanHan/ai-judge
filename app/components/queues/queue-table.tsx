import { memo } from "react";
import type { QuestionTemplate } from "~/lib/types/database-types";
import type { Judge } from "~/lib/types/database-types";
import { QueueTableListView } from "./queue-table-views/queue-table-list-view";
import { QueueTableGroupView } from "./queue-table-views/queue-table-group-view";

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

interface QueueTableProps {
  answers: AnswerWithDetails[];
  allJudges: Judge[];
  onAssignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onUnassignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onRemoveFromQueue: (answerId: string) => Promise<void>;
  viewMode: "list" | "group";
}

export const QueueTable = memo(function QueueTable({
  answers,
  allJudges,
  onAssignJudge,
  onUnassignJudge,
  onRemoveFromQueue,
  viewMode,
}: QueueTableProps) {
  if (viewMode === "group") {
    return (
      <QueueTableGroupView
        answers={answers}
        allJudges={allJudges}
        onAssignJudge={onAssignJudge}
        onUnassignJudge={onUnassignJudge}
        onRemoveFromQueue={onRemoveFromQueue}
      />
    );
  }

  return (
    <QueueTableListView
      answers={answers}
      allJudges={allJudges}
      onAssignJudge={onAssignJudge}
      onUnassignJudge={onUnassignJudge}
      onRemoveFromQueue={onRemoveFromQueue}
    />
  );
});
