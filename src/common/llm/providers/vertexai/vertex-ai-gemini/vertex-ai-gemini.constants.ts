/**
 * Constants for the Vertex AI Gemini LLM provider.
 * Contains API endpoints, terminal states, and other provider-specific configuration.
 */
import { FinishReason } from "@google-cloud/vertexai";

/**
 * Base domain for the Vertex AI API endpoint.
 * Used for constructing regional API endpoints and global endpoint.
 */
export const VERTEXAI_API_ENDPOINT = "aiplatform.googleapis.com";

/**
 * Finish reasons that are considered terminal and should be rejected.
 * These indicate content blocking or safety issues that prevent valid responses.
 */
export const VERTEXAI_TERMINAL_FINISH_REASONS: readonly FinishReason[] = [
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.RECITATION,
  FinishReason.SAFETY,
  FinishReason.SPII,
];

/**
 * Global location identifier for Vertex AI.
 * When set, uses the base API endpoint without regional prefix.
 */
export const VERTEXAI_GLOBAL_LOCATION = "global";

