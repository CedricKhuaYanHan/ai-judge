import { Badge } from "~/components/ui/badge";

/**
 * Get the color classes for a question type badge
 */
export function getQuestionTypeColor(type: string): string {
  switch (type) {
    case "text":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "multiple_choice":
      return "bg-green-100 text-green-800 border-green-200";
    case "rating":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "boolean":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "file_upload":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "single_choice_with_reasoning":
      return "bg-pink-100 text-pink-800 border-pink-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

interface QuestionTypeBadgeProps {
  questionType: string;
  className?: string;
}

/**
 * A badge component that displays question types with consistent styling
 */
export function QuestionTypeBadge({
  questionType,
  className,
}: QuestionTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`${getQuestionTypeColor(questionType || "unknown")} ${
        className || ""
      }`}
    >
      {questionType}
    </Badge>
  );
}
