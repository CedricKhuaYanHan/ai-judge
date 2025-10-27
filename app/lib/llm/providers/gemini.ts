/**
 * Google Gemini LLM provider implementation
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import type { LLMProviderInterface, LLMRequest, LLMResponse } from "../types";
import type { EvaluationResult } from "~/lib/types/api-types";

export class GeminiProvider implements LLMProviderInterface {
  name = "gemini";
  supportsAttachments = true;
  supportsVision = true;
  private google: ReturnType<typeof createGoogleGenerativeAI>;

  constructor(apiKey: string, baseUrl?: string) {
    // Create Google Generative AI instance with API key
    this.google = createGoogleGenerativeAI({
      apiKey: apiKey || process.env.GOOGLE_AI_API_KEY,
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
        model: this.google(request.model),
        system: request.systemPrompt,
        prompt: promptContent,
        temperature: request.temperature ?? 0.7,
      });

      // Parse the structured response
      const evaluationResult = this.parseEvaluationResult(result.text);

      return {
        result: evaluationResult,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      throw new Error(
        `Gemini evaluation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  validateModel(model: string): boolean {
    const validModels = [
      "gemini-2.0-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-1.0-pro",
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
