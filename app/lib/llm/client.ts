/**
 * LLM client factory and configuration
 */

import type { LLMProvider } from "~/lib/types/database-types";
import type { LLMProviderInterface, LLMConfig } from "./types";
import { createProvider, validateModel, getAvailableProviders } from "./provider-factory";

export class LLMClient {
  private providers: Map<string, LLMProviderInterface> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize providers with API keys from environment
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GOOGLE_AI_API_KEY;

    if (openaiKey) {
      this.providers.set("openai", createProvider("openai", openaiKey));
    }

    if (anthropicKey) {
      this.providers.set("anthropic", createProvider("anthropic", anthropicKey));
    }

    if (geminiKey) {
      this.providers.set("gemini", createProvider("gemini", geminiKey));
    }
  }

  getProvider(provider: LLMProvider): LLMProviderInterface {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(
        `Provider ${provider} is not configured or not available`
      );
    }
    return providerInstance;
  }

  isProviderAvailable(provider: LLMProvider): boolean {
    return this.providers.has(provider);
  }

  getAvailableProviders(): LLMProvider[] {
    return getAvailableProviders();
  }

  validateProviderConfig(provider: LLMProvider, model: string): boolean {
    return validateModel(provider, model);
  }
}

// Singleton instance
export const llmClient = new LLMClient();

// Factory function for creating provider instances
export function createLLMProvider(config: LLMConfig): LLMProviderInterface {
  return createProvider(config.provider, config.apiKey, config.baseUrl);
}
