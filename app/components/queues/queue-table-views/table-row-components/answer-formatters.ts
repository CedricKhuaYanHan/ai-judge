/**
 * Utility functions for formatting answer values and determining display behavior
 */

export function formatAnswerValue(
  answerValue: Record<string, any>,
  questionType: string
): string {
  if (questionType === "single_choice_with_reasoning") {
    return answerValue.choice;
  } else if (questionType === "multiple_choice") {
    return answerValue.choice;
  } else if (questionType === "text") {
    return (
      answerValue.answer ||
      answerValue.text ||
      answerValue.choice ||
      "No answer"
    );
  } else if (questionType === "boolean") {
    return answerValue.answer ? "Yes" : "No";
  } else if (questionType === "rating") {
    return `${answerValue.answer}/5`;
  } else {
    return "Answer";
  }
}

export function hasReasoning(
  answerValue: Record<string, any>,
  questionType: string
): boolean {
  if (
    questionType === "single_choice_with_reasoning" ||
    questionType === "multiple_choice"
  ) {
    return answerValue.reasoning && answerValue.reasoning.trim() !== "";
  }
  return false;
}

export function shouldShowExpansion(
  answerValue: Record<string, any>,
  questionType: string
): boolean {
  // Always show for questions with reasoning
  if (hasReasoning(answerValue, questionType)) {
    return true;
  }
  // Show for complex answer structures
  return (
    Object.keys(answerValue).length > 1 ||
    (answerValue.answer && typeof answerValue.answer === "object")
  );
}

export function getFullAnswerDetails(
  answerValue: Record<string, any>,
  questionType: string
) {
  if (
    questionType === "single_choice_with_reasoning" ||
    questionType === "multiple_choice"
  ) {
    return {
      choice: answerValue.choice,
      reasoning: answerValue.reasoning,
      fullJson: answerValue,
    };
  }
  return {
    fullJson: answerValue,
  };
}
