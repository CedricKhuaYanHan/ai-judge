import { memo, useRef } from "react";
import { TableCell, TableRow } from "~/components/ui/table";
import { QuestionTypeBadge } from "~/components/questions/question-type-badge";
import type { QuestionTemplate } from "~/lib/types/database-types";
import type { Judge } from "~/lib/types/database-types";
import {
  QuestionTextCell,
  AnswerValueCell,
  JudgeAssignmentCell,
  AnswerActionsCell,
  SubmissionIdWithAttachments,
  type SubmissionIdWithAttachmentsRef,
} from "./table-row-components";

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

interface AnswerTableRowProps {
  answer: AnswerWithDetails;
  allJudges: Judge[];
  onAssignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onUnassignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onRemoveFromQueue: (answerId: string) => Promise<void>;
}

export const AnswerTableRow = memo(function AnswerTableRow({
  answer,
  allJudges,
  onAssignJudge,
  onUnassignJudge,
  onRemoveFromQueue,
}: AnswerTableRowProps) {
  const attachmentCountRef = useRef<SubmissionIdWithAttachmentsRef>(null);

  const handleAttachmentChange = () => {
    attachmentCountRef.current?.refresh();
  };
  return (
    <TableRow>
      <QuestionTextCell question={answer.question_template} />

      <TableCell className="w-[100px]">
        <QuestionTypeBadge
          questionType={answer.question_template.question_type || "unknown"}
        />
      </TableCell>

      <AnswerValueCell answer={answer} />

      <SubmissionIdWithAttachments
        ref={attachmentCountRef}
        submissionId={answer.submission_id}
        answerId={answer.answer_id}
      />

      <JudgeAssignmentCell
        answer={answer}
        allJudges={allJudges}
        onAssignJudge={onAssignJudge}
        onUnassignJudge={onUnassignJudge}
      />

      <AnswerActionsCell
        answerId={answer.answer_id}
        onRemoveFromQueue={onRemoveFromQueue}
        onAttachmentChange={handleAttachmentChange}
      />
    </TableRow>
  );
});
