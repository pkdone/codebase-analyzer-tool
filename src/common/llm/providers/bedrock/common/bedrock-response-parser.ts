import { z } from "zod";
import { getNestedValue, getNestedValueWithFallbacks } from "../../../../utils/object-utils";
import { isDefined } from "../../../../utils/type-guards";
import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";
import { LLMResponsePayload, createTokenUsageRecord } from "../../../types/llm-response.types";
import type { LLMImplSpecificResponseSummary } from "../../llm-provider.types";

/**
 * Parses a value as a number, returning undefined if the value is not a number.
 * Simplifies verbose inline type guards for token count parsing.
 * Returns undefined instead of a default value so createTokenUsageRecord can apply its own default.
 */
const parseNumericOrDefault = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

/**
 * Converts an unknown value to LLMResponsePayload with proper type validation.
 * LLMResponsePayload accepts: string | object | null
 *
 * - undefined → null (LLMResponsePayload doesn't include undefined)
 * - null → null (preserved)
 * - string → string (preserved)
 * - object/array → preserved as-is (JSON-serializable, typeof "object" covers both)
 * - number/boolean/other → converted to string for safety
 */
function convertToLLMResponsePayload(value: unknown): LLMResponsePayload {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  // typeof "object" covers both objects and arrays; null is already handled above
  if (typeof value === "object") return value;
  // Handle edge cases where the LLM response structure has unexpected type
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null; // For other unexpected types, assume null content
}

/**
 * Zod schema for Bedrock embeddings response validation.
 * Supports both direct embedding format and results array format.
 */
const BedrockEmbeddingsResponseSchema = z.object({
  embedding: z.array(z.number()).optional(),
  inputTextTokenCount: z.number().optional(),
  results: z
    .array(
      z.object({
        tokenCount: z.number().optional(),
      }),
    )
    .optional(),
});

/**
 * Response type for embedding extraction.
 */
export interface EmbeddingResponseSummary {
  isIncompleteResponse: boolean;
  responseContent: number[];
  tokenUsage: ReturnType<typeof createTokenUsageRecord>;
}

/**
 * Extracts embedding response data from Bedrock embedding model responses.
 * Validates the response structure and extracts the embedding vector and token usage.
 *
 * @param llmResponse The raw LLM response object
 * @returns Standardized embedding response summary
 * @throws LLMError if the response structure is invalid
 */
export function extractEmbeddingResponse(llmResponse: unknown): EmbeddingResponseSummary {
  const validation = BedrockEmbeddingsResponseSchema.safeParse(llmResponse);
  if (!validation.success) {
    throw new LLMError(
      LLMErrorCode.BAD_RESPONSE_CONTENT,
      "Invalid Bedrock embeddings response structure",
      llmResponse,
    );
  }
  const response = validation.data;
  const responseContent = response.embedding ?? [];
  // If no content assume prompt maxed out total tokens available
  const isIncompleteResponse = responseContent.length === 0;
  const tokenUsage = createTokenUsageRecord(
    response.inputTextTokenCount,
    response.results?.[0]?.tokenCount,
  );
  return { isIncompleteResponse, responseContent, tokenUsage };
}

/**
 * Configuration for extracting response data from different Bedrock provider response structures
 */
interface ResponsePathConfig {
  /** Path to extract the main response content from the parsed response */
  contentPath: string;
  /** Path to extract the prompt token count */
  promptTokensPath: string;
  /** Path to extract the completion token count */
  completionTokensPath: string;
  /** Path to extract the stop/finish reason */
  stopReasonPath: string;
  /** The stop reason value(s) that indicate the response was truncated due to length limits */
  stopReasonValueForLength: string | string[];
  /** Optional secondary content path (for providers like Deepseek with reasoning_content) */
  alternativeContentPath?: string;
  /** Optional secondary stop reason path (for providers like Mistral with finish_reason) */
  alternativeStopReasonPath?: string;
}

/**
 * Extracts text completion response data from various Bedrock provider responses.
 * This helper function eliminates code duplication across different Bedrock provider
 * implementations by providing a unified extraction interface.
 *
 * The name "text completion" distinguishes this from embedding extraction, which
 * returns numeric vectors rather than text content.
 *
 * @param llmResponse The raw LLM response object
 * @param schema The Zod schema to validate the response structure
 * @param pathConfig Configuration object mapping standard fields to provider-specific response paths
 * @param providerName The name of the provider (for error messages)
 * @returns Standardized LLMImplSpecificResponseSummary object
 */
export function extractTextCompletionResponse(
  llmResponse: unknown,
  schema: z.ZodType<unknown>,
  pathConfig: ResponsePathConfig,
  providerName: string,
): LLMImplSpecificResponseSummary {
  const validation = schema.safeParse(llmResponse);
  if (!validation.success)
    throw new LLMError(
      LLMErrorCode.BAD_RESPONSE_CONTENT,
      `Invalid ${providerName} response structure`,
      llmResponse,
    );
  // z.ZodType<unknown> ensures validation.data is typed as unknown (not any)
  const response = validation.data;
  const contentPaths = [pathConfig.contentPath, pathConfig.alternativeContentPath].filter(
    isDefined,
  );
  const responseContentRaw = getNestedValueWithFallbacks(response, contentPaths);
  // Preserve null values from LLM (null has different semantic meaning than empty string)
  // Convert undefined to null to match LLMResponsePayload type (which doesn't include undefined)
  // Validate the extracted value is a valid LLMResponsePayload type (string, object, array, or null)
  const responseContent = convertToLLMResponsePayload(responseContentRaw);
  const stopReasonPaths = [pathConfig.stopReasonPath, pathConfig.alternativeStopReasonPath].filter(
    isDefined,
  );
  const finishReasonRaw = getNestedValueWithFallbacks(response, stopReasonPaths);
  const finishReason = typeof finishReasonRaw === "string" ? finishReasonRaw : "";
  const finishReasonLowercase = finishReason.toLowerCase();
  const stopReasonValues = Array.isArray(pathConfig.stopReasonValueForLength)
    ? pathConfig.stopReasonValueForLength
    : [pathConfig.stopReasonValueForLength];
  const isIncompleteResponse =
    stopReasonValues.some((val) => finishReasonLowercase === val.toLowerCase()) ||
    responseContent == null;
  const promptTokensRaw = getNestedValue(response, pathConfig.promptTokensPath);
  const completionTokensRaw = getNestedValue(response, pathConfig.completionTokensPath);
  const tokenUsage = createTokenUsageRecord(
    parseNumericOrDefault(promptTokensRaw),
    parseNumericOrDefault(completionTokensRaw),
  );
  return { isIncompleteResponse, responseContent, tokenUsage };
}

export type { ResponsePathConfig };
