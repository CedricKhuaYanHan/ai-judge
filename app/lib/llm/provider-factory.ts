/**
 * LLM Provider Factory
 * Centralized provider creation and configuration
 */

import type { LLMProvider } from "~/lib/types/database-types";
import type { LLMProviderInterface, LLMConfig } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { GeminiProvider } from "./providers/gemini";

interface ProviderConfig {
  class: new (apiKey: string, baseUrl?: string) => LLMProviderInterface;
  models: string[];
}

const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    class: OpenAIProvider,
    models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo", "gpt-4o", "gpt-4o-mini"],
  },
  anthropic: {
    class: AnthropicProvider,
    models: [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-haiku-20241022",
      "claude-3-opus-20240229",
    ],
  },
  gemini: {
    class: GeminiProvider,
    models: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
  },
};

export function createProvider(provider: LLMProvider, apiKey: string, baseUrl?: string): LLMProviderInterface {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return new config.class(apiKey, baseUrl);
}

export function validateModel(provider: LLMProvider, model: string): boolean {
  const config = PROVIDER_CONFIGS[provider];
  return config ? config.models.includes(model) : false;
}

export function getAvailableModels(provider: LLMProvider): string[] {
  const config = PROVIDER_CONFIGS[provider];
  return config ? config.models : [];
}

export function getAvailableProviders(): LLMProvider[] {
  return Object.keys(PROVIDER_CONFIGS) as LLMProvider[];
}
