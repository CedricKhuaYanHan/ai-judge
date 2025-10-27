/**
 * Prompt builder for AI Judge evaluations
 */

import type { EvaluationContext } from "~/lib/types/api-types";
import type { JudgeConfigMetadata } from "~/lib/types/api-types";
import type { EvaluationPrompt } from "./types";

export class PromptBuilder {
  private judgeCustomPrompt: string;
  private configMetadata: JudgeConfigMetadata;

  constructor(judgeCustomPrompt: string, configMetadata: JudgeConfigMetadata) {
    this.judgeCustomPrompt = judgeCustomPrompt;
    this.configMetadata = configMetadata;
  }

  buildPrompt(context: EvaluationContext): EvaluationPrompt {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(context);

    return {
      systemPrompt,
      userPrompt,
      context,
      attachments: context.attachments?.map((attachment) => ({
        url: attachment.url,
        type: attachment.type || "",
        name: attachment.type || "file",
      })),
    };
  }

  private buildSystemPrompt(): string {
    // Check if the judge's custom prompt appears to be a complete system prompt
    // (contains instructions about JSON format or response format)
    const lowerPrompt = this.judgeCustomPrompt.toLowerCase();
    const hasCompleteInstructions = 
      lowerPrompt.includes('json') ||
      lowerPrompt.includes('verdict') ||
      lowerPrompt.includes('response') ||
      lowerPrompt.includes('format') ||
      lowerPrompt.includes('ignore');
    
    if (hasCompleteInstructions) {
      // Judge has provided complete instructions - use only their prompt
      return this.judgeCustomPrompt;
    }
    
    // Judge provided criteria only - combine with base framework
    // Put judge's criteria FIRST so it takes precedence
    const baseInstructions = this.getBaseEvaluationInstructions();
    return `${this.judgeCustomPrompt}\n\n${baseInstructions}`;
  }

  private buildUserPrompt(context: EvaluationContext): string {
    const sections: string[] = [];

    // Add question information if enabled
    if (this.configMetadata.includedFields.questionText) {
      sections.push(`Question: ${context.questionText}`);
    }

    if (this.configMetadata.includedFields.questionType) {
      sections.push(`Question Type: ${context.questionType}`);
    }

    // Add answer data if enabled
    if (this.configMetadata.includedFields.answerData) {
      const answerText = this.formatAnswerData(context.answerData);
      sections.push(`Answer: ${answerText}`);
    }

    // Add submission metadata if enabled and available
    if (this.configMetadata.includedFields.submissionMetadata && context.submissionMetadata) {
      const metadataText = this.formatMetadata(context.submissionMetadata);
      sections.push(`Submission Metadata: ${metadataText}`);
    }

    // Add attachments information if enabled and available
    if (
      this.configMetadata.includedFields.attachments &&
      context.attachments?.length
    ) {
      const attachmentText = this.formatAttachments(context.attachments);
      sections.push(`Attachments: ${attachmentText}`);
    }

    // Combine all sections - this is just the data to evaluate
    const contextText = sections.join("\n\n");

    return `${contextText}\n\nPlease evaluate the above submission according to your criteria and provide your assessment.`;
  }

  private formatAnswerData(answerData: Record<string, any>): string {
    if (typeof answerData === "string") {
      return answerData;
    }

    if (Array.isArray(answerData)) {
      return answerData
        .map((item) =>
          typeof item === "object" ? JSON.stringify(item) : String(item)
        )
        .join(", ");
    }

    if (typeof answerData === "object") {
      return JSON.stringify(answerData, null, 2);
    }

    return String(answerData);
  }

  private formatMetadata(metadata: Record<string, any>): string {
    if (!metadata || Object.keys(metadata).length === 0) {
      return "No metadata available";
    }
    return JSON.stringify(metadata, null, 2);
  }

  private formatAttachments(
    attachments: Array<{
      attachment_id: string;
      answer_id: string;
      url: string;
      type?: string | null;
      created_at: string | null;
    }>
  ): string {
    return attachments
      .map((attachment) => {
        const parts = [attachment.type || "file"];
        parts.push(`- ${attachment.url}`);
        return parts.join(" ");
      })
      .join("\n");
  }

  private getBaseEvaluationInstructions(): string {
    return `You are an AI judge evaluating submissions. Your role is to assess whether submissions meet the expected criteria.

You must provide your assessment in the following JSON format:

{
  "verdict": "pass" | "fail" | "inconclusive",
  "reasoning": "Your detailed explanation of the evaluation decision"
}

Verdict Guidelines:
- "pass": The submission meets the expected criteria
- "fail": The submission does not meet the expected criteria
- "inconclusive": Unable to determine due to insufficient information or ambiguity

Evaluation Principles:
- Provide clear, specific reasoning for your decision
- Consider the context and any relevant metadata
- Be objective and fair in your assessment
- Follow the specific evaluation criteria provided below

IMPORTANT: You must respond with ONLY the JSON object, no additional text before or after.`;
  }
}
