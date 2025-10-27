import { TableCell } from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { ChevronDown } from "lucide-react";
import { AnswerDetailsDialog } from "./answer-details-dialog";
import { formatAnswerValue, shouldShowExpansion } from "./answer-formatters";
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

interface AnswerValueCellProps {
  answer: AnswerWithDetails;
}

export function AnswerValueCell({ answer }: AnswerValueCellProps) {
  const questionType = answer.question_template.question_type || "";
  const formattedValue = formatAnswerValue(answer.answer_value, questionType);
  const showExpansion = shouldShowExpansion(answer.answer_value, questionType);

  const truncatedValue =
    formattedValue.length > 20
      ? `${formattedValue.substring(0, 20)}...`
      : formattedValue;

  return (
    <TableCell className="w-[150px]">
      <div className="flex items-center gap-2">
        <span className="truncate text-sm flex-1" title={formattedValue}>
          {truncatedValue}
        </span>
        {showExpansion && (
          <AnswerDetailsDialog answer={answer}>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors flex-shrink-0"
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Details
            </Button>
          </AnswerDetailsDialog>
        )}
      </div>
    </TableCell>
  );
}
