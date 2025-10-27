import { useState, useMemo } from "react";
import { TableCell } from "~/components/ui/table";
import { JudgeAssignmentBadges } from "~/components/judges/judge-assignment-badges";
import type { QuestionTemplate } from "~/lib/types/database-types";
import type { Judge } from "~/lib/types/database-types";

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

interface JudgeAssignmentCellProps {
  answer: AnswerWithDetails;
  allJudges: Judge[];
  onAssignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onUnassignJudge: (answerId: string, judgeId: string) => Promise<void>;
}

export function JudgeAssignmentCell({
  answer,
  allJudges,
  onAssignJudge,
  onUnassignJudge,
}: JudgeAssignmentCellProps) {
  const handleAssignJudge = async (answerId: string, judgeId: string) => {
    await onAssignJudge(answerId, judgeId);
  };

  const handleUnassignJudge = async (answerId: string, judgeId: string) => {
    await onUnassignJudge(answerId, judgeId);
  };

  return (
    <TableCell className="w-[150px]">
      <JudgeAssignmentBadges
        answerId={answer.answer_id}
        assignedJudges={answer.judges}
        allJudges={allJudges}
        onAssignJudge={handleAssignJudge}
        onUnassignJudge={handleUnassignJudge}
        maxVisible={2}
        buttonText=""
        className="flex-wrap break-words"
      />
    </TableCell>
  );
}
