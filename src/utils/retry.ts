/**
 * Retry utility with exponential backoff
 *
 * Used for handling transient failures in API calls.
 */

export interface RetryConfig {
  /** Context for logging (e.g., "upload doc-123") */
  context: string;
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 1000;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const DEFAULT_MAX_DELAY_MS = 30000;

/**
 * Execute a function with retry and exponential backoff
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialDelayMs = config.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const backoffMultiplier = config.backoffMultiplier ?? DEFAULT_BACKOFF_MULTIPLIER;
  const maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let lastError: Error | undefined;
  let currentDelay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        console.warn(
          `[${config.context}] attempt ${attempt} failed:`,
          lastError.message,
          `- retrying in ${currentDelay}ms`
        );

        await sleep(currentDelay);

        // Calculate next delay with exponential backoff, capped at maxDelayMs
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
      } else {
        console.warn(
          `[${config.context}] failed after ${maxRetries} attempts:`,
          lastError.message
        );
      }
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
