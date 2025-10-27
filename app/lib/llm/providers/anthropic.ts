/**
 * Anthropic LLM provider implementation
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { LLMProviderInterface, LLMRequest, LLMResponse } from "../types";
import type { EvaluationResult } from "~/lib/types/api-types";

export class AnthropicProvider implements LLMProviderInterface {
  name = "anthropic";
  supportsAttachments = true;
  supportsVision = true;
  private anthropic: ReturnType<typeof createAnthropic>;

  constructor(apiKey: string, baseUrl?: string) {
    // Create Anthropic instance with API key
    this.anthropic = createAnthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
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
        model: this.anthropic(request.model),
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
        `Anthropic evaluation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  validateModel(model: string): boolean {
    const validModels = [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
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
