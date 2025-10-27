/**
 * Rate limiter utility for controlling concurrent API calls
 * Provides provider-specific concurrency controls for LLM APIs
 */

import pLimit from 'p-limit';

/**
 * Create a rate limiter with specified concurrency
 */
export function createRateLimiter(concurrency: number) {
  return pLimit(concurrency);
}

/**
 * Provider-specific rate limits based on API capabilities
 * Adjust these values based on your actual API tier limits
 */
export const RATE_LIMITS = {
  openai: 50,      // OpenAI: Up to 10,000 RPM for pay-as-you-go accounts
  anthropic: 20,   // Anthropic: Up to 2,000 RPM for Tier 4 accounts
  gemini: 30,      // Google Gemini: Up to 1,000 RPM for pay-as-you-go accounts
} as const;

/**
 * Get rate limit for a specific provider
 */
export function getRateLimit(provider: string): number {
  return RATE_LIMITS[provider as keyof typeof RATE_LIMITS] || 5;
}

/**
 * Create rate limiter for a specific provider
 */
export function createProviderRateLimiter(provider: string) {
  const concurrency = getRateLimit(provider);
  return createRateLimiter(concurrency);
}