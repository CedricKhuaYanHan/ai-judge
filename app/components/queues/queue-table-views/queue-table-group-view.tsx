import { memo, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
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

interface QueueTableGroupViewProps {
  answers: AnswerWithDetails[];
  allJudges: Judge[];
  onAssignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onUnassignJudge: (answerId: string, judgeId: string) => Promise<void>;
  onRemoveFromQueue: (answerId: string) => Promise<void>;
}

export const QueueTableGroupView = memo(function QueueTableGroupView({
  answers,
  allJudges,
  onAssignJudge,
  onUnassignJudge,
  onRemoveFromQueue,
}: QueueTableGroupViewProps) {
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

  // Group answers by submission_id for group view
  const groupedAnswers = useMemo(() => {
    const groups = new Map<string, AnswerWithDetails[]>();
    answers.forEach((answer) => {
      if (!groups.has(answer.submission_id)) {
        groups.set(answer.submission_id, []);
      }
      groups.get(answer.submission_id)!.push(answer);
    });
    return groups;
  }, [answers]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {answers.length} answer{answers.length !== 1 ? "s" : ""} in this queue
        {groupedAnswers.size > 1 && (
          <span className="ml-2">
            across {groupedAnswers.size} submission
            {groupedAnswers.size !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <Accordion type="multiple" className="w-full">
        {Array.from(groupedAnswers.entries()).map(
          ([submissionId, submissionAnswers]) => (
            <AccordionItem key={submissionId} value={submissionId}>
              <AccordionTrigger data-value={submissionId} className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Submission {submissionId}</span>
                  <span className="text-sm text-muted-foreground">
                    ({submissionAnswers.length} answer
                    {submissionAnswers.length !== 1 ? "s" : ""})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent data-value={submissionId}>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[300px]">
                          Question
                        </TableHead>
                        <TableHead className="w-[120px]">Type</TableHead>
                        <TableHead className="min-w-[200px]">Answer</TableHead>
                        <TableHead className="w-[120px]">
                          Submission ID
                        </TableHead>
                        <TableHead className="min-w-[200px]">
                          Judges Assigned
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissionAnswers.map((answer) => (
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
              </AccordionContent>
            </AccordionItem>
          )
        )}
      </Accordion>
    </div>
  );
});
