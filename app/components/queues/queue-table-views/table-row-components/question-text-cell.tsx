import { TableCell } from "~/components/ui/table";
import type { QuestionTemplate } from "~/lib/types/database-types";

interface QuestionTextCellProps {
  question: QuestionTemplate;
}

export function QuestionTextCell({ question }: QuestionTextCellProps) {
  const truncatedText =
    question.question_text.length > 40
      ? `${question.question_text.substring(0, 40)}...`
      : question.question_text;

  return (
    <TableCell className="w-[200px]">
      <p
        className="text-sm font-medium truncate"
        title={question.question_text}
      >
        {truncatedText}
      </p>
    </TableCell>
  );
}
