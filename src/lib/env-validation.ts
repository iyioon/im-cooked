/**
 * Environment variable validation
 * Validates required environment variables are set at runtime
 */

/**
 * Validates that required environment variables are set
 * @throws Error if required environment variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];

  // Server-side API key (required for backend AI services)
  if (!process.env.GEMINI_API_KEY) {
    missing.push("GEMINI_API_KEY");
  }

  // Client-side API key (required for voice features)
  // NOTE: This exposes the API key in the client bundle
  // This is a limitation of Gemini Live's WebSocket architecture
  // RECOMMENDATION: Use Google Cloud Console to restrict this key to your domain
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    missing.push("NEXT_PUBLIC_GEMINI_API_KEY");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        `Please check your .env.local file and ensure all required variables are set.`
    );
  }
}

/**
 * Gets server-side Gemini API key with validation
 */
export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please configure it in your .env.local file.");
  }

  return apiKey;
}

/**
 * Gets client-side Gemini API key with validation
 * WARNING: This key is exposed in the client bundle
 * Use domain restrictions in Google Cloud Console to mitigate security risks
 */
export function getPublicGeminiApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_GEMINI_API_KEY is not set. Please configure it in your .env.local file."
    );
  }

  return apiKey;
}
