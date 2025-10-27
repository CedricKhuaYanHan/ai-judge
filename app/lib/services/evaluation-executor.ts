/**
 * Evaluation executor service for single evaluation execution
 * Handles LLM API calls with error handling and retry logic
 */

import type { EvaluationContext, EvaluationResult } from "~/lib/types/api-types";
import type { Judge } from "~/lib/types/database-types";
import { llmClient } from "~/lib/llm/client";
import { PromptBuilder } from "~/lib/llm/prompt-builder";

/**
 * Execute a single evaluation task
 */
export async function executeEvaluation(
  judge: Judge,
  context: EvaluationContext
): Promise<EvaluationResult> {
  try {
    // 1. Get LLM provider
    const provider = llmClient.getProvider(judge.provider as any);

    // 2. Build prompt using judge's system prompt
    const promptBuilder = new PromptBuilder(judge.prompt, {
      includedFields: {
        questionText: true,
        questionType: true,
        answerData: true,
        submissionMetadata: true,
        attachments: true,
      },
    });

    const prompt = promptBuilder.buildPrompt(context);

    const response = await provider.evaluate({
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      context,
      model: judge.model,
      temperature: 0.8,
      maxTokens: 1000,
    });

    // 4. Parse and validate response
    const result = parseEvaluationResponse(response.result);

    return result;
  } catch (error) {
    console.error(`Evaluation failed:`, error);
    
    // Return inconclusive result for any error
    return {
      verdict: "inconclusive",
      reasoning: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse and validate LLM response
 */
function parseEvaluationResponse(result: EvaluationResult): EvaluationResult {
  // Validate verdict
  const validVerdicts = ["pass", "fail", "inconclusive"];
  if (!validVerdicts.includes(result.verdict)) {
    console.warn(`Invalid verdict received: ${result.verdict}, defaulting to inconclusive`);
    return {
      verdict: "inconclusive",
      reasoning: `Invalid verdict received: ${result.verdict}. ${result.reasoning || "No reasoning provided."}`,
    };
  }

  // Validate reasoning
  if (!result.reasoning || result.reasoning.trim().length === 0) {
    console.warn("Empty reasoning received, adding default reasoning");
    result.reasoning = "No detailed reasoning provided by the judge.";
  }

  return result;
}