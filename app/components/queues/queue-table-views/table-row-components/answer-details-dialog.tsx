import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { QuestionTypeBadge } from "~/components/questions/question-type-badge";
import type { QuestionTemplate } from "~/lib/types/database-types";
import type { Judge } from "~/lib/types/database-types";
import { getFullAnswerDetails } from "./answer-formatters";

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

interface AnswerDetailsDialogProps {
  answer: AnswerWithDetails;
  children: React.ReactNode;
}

export function AnswerDetailsDialog({
  answer,
  children,
}: AnswerDetailsDialogProps) {
  const details = getFullAnswerDetails(
    answer.answer_value,
    answer.question_template.question_type || ""
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-6xl w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Answer Details
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Full answer details for submission{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              {answer.submission_id}
            </code>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-6">
            {/* Question Context */}
            <div className="border-l-4 border-blue-200 pl-4">
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Question:
              </h4>
              <p className="text-sm leading-relaxed">
                {answer.question_template.question_text}
              </p>
              <div className="mt-2">
                <QuestionTypeBadge
                  questionType={
                    answer.question_template.question_type || "unknown"
                  }
                />
              </div>
            </div>

            {/* Choice Section */}
            {details.choice && (
              <div className="space-y-2">
                <h4 className="font-semibold text-base text-foreground">
                  Selected Choice:
                </h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900 break-words">
                    {details.choice}
                  </p>
                </div>
              </div>
            )}

            {/* Reasoning Section */}
            {details.reasoning && (
              <div className="space-y-2">
                <h4 className="font-semibold text-base text-foreground">
                  Reasoning:
                </h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm leading-relaxed text-blue-900 whitespace-pre-wrap break-words">
                    {details.reasoning}
                  </p>
                </div>
              </div>
            )}

            {/* Full JSON Section */}
            <div className="space-y-2">
              <h4 className="font-semibold text-base text-foreground">
                Complete Answer Data:
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <pre className="text-xs leading-relaxed text-gray-800 whitespace-pre-wrap break-words overflow-x-auto">
                  {JSON.stringify(details.fullJson, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
