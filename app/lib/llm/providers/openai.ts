/**
 * OpenAI LLM provider implementation
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { LLMProviderInterface, LLMRequest, LLMResponse } from "../types";
import type { EvaluationResult } from "~/lib/types/api-types";

export class OpenAIProvider implements LLMProviderInterface {
  name = "openai";
  supportsAttachments = true;
  supportsVision = true;
  private openai: ReturnType<typeof createOpenAI>;

  constructor(apiKey: string, baseUrl?: string) {
    // Create OpenAI instance with API key
    this.openai = createOpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      ...(baseUrl && { baseURL: baseUrl }),
    });
  }

  async evaluate(request: LLMRequest): Promise<LLMResponse> {
    try {
      // Add cache-busting: append unique identifier to prevent API response caching
      const cacheId = crypto.randomUUID();
      const userPromptWithCacheBuster = `${request.userPrompt}\n\n<!-- Request ID: ${cacheId} -->`;

      // Handle attachments for vision models
      let promptContent: string;
      
      if (request.context.attachments && request.context.attachments.length > 0 && this.supportsVision) {
        // For now, include attachment URLs in the text prompt
        // TODO: Implement proper multimodal support when AI SDK supports it
        const attachmentUrls = request.context.attachments
          .filter(att => att.type?.startsWith('image/'))
          .map(att => att.url)
          .join('\n');
        
        promptContent = `${userPromptWithCacheBuster}\n\nAttached images:\n${attachmentUrls}`;
      } else {
        promptContent = userPromptWithCacheBuster;
      }

      const result = await generateText({
        model: this.openai(request.model),
        system: request.systemPrompt,
        prompt: promptContent,
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? 1000,
      });

      // Parse the structured response
      const evaluationResult = this.parseEvaluationResult(result.text);

      return {
        result: evaluationResult,
        usage: {
          promptTokens: result.usage?.inputTokens ?? 0,
          completionTokens: result.usage?.outputTokens ?? 0,
          totalTokens: result.usage?.totalTokens ?? 0,
        },
      };
    } catch (error) {
      throw new Error(
        `OpenAI evaluation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  validateModel(model: string): boolean {
    const validModels = [
      "gpt-4",
      "gpt-4-turbo",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-3.5-turbo",
    ];
    return validModels.includes(model);
  }

  private parseEvaluationResult(text: string): EvaluationResult {
    try {
      // Try to parse as JSON first
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          verdict: parsed.verdict || "inconclusive",
          reasoning: parsed.reasoning || text,
        };
      }

      // Fallback: parse text for verdict keywords
      const lowerText = text.toLowerCase();
      let verdict: "pass" | "fail" | "inconclusive" = "inconclusive";

      if (
        lowerText.includes("pass") ||
        lowerText.includes("correct") ||
        lowerText.includes("good")
      ) {
        verdict = "pass";
      } else if (
        lowerText.includes("fail") ||
        lowerText.includes("incorrect") ||
        lowerText.includes("bad")
      ) {
        verdict = "fail";
      }

      return {
        verdict,
        reasoning: text,
      };
    } catch (error) {
      // If parsing fails, return inconclusive with the raw text
      return {
        verdict: "inconclusive",
        reasoning: text,
      };
    }
  }
}
