import { z } from "zod";
import { getNestedValue, getNestedValueWithFallbacks } from "../../../../common/utils/object-utils";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";
import { LLMImplSpecificResponseSummary } from "../../llm-provider.types";

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
  /** The stop reason value that indicates the response was truncated due to length limits */
  stopReasonValueForLength: string;
  /** Optional secondary content path (for providers like Deepseek with reasoning_content) */
  alternativeContentPath?: string;
  /** Optional secondary stop reason path (for providers like Mistral with finish_reason) */
  alternativeStopReasonPath?: string;
}

/**
 * Generic helper function to extract completion response data from various Bedrock provider responses.
 * This eliminates code duplication across different Bedrock provider implementations.
 *
 * @param llmResponse The raw LLM response object
 * @param schema The Zod schema to validate the response structure
 * @param pathConfig Configuration object mapping standard fields to provider-specific response paths
 * @param providerName The name of the provider (for error messages)
 * @returns Standardized LLMImplSpecificResponseSummary object
 */
export function extractGenericCompletionResponse(
  llmResponse: unknown,
  schema: z.ZodType,
  pathConfig: ResponsePathConfig,
  providerName: string,
): LLMImplSpecificResponseSummary {
  const validation = schema.safeParse(llmResponse);
  if (!validation.success)
    throw new BadResponseContentLLMError(`Invalid ${providerName} response structure`, llmResponse);
  const response = validation.data as Record<string, unknown>;
  const contentPaths = [pathConfig.contentPath, pathConfig.alternativeContentPath].filter(
    Boolean,
  ) as string[];
  const responseContent = getNestedValueWithFallbacks<string>(response, contentPaths) ?? "";
  const stopReasonPaths = [pathConfig.stopReasonPath, pathConfig.alternativeStopReasonPath].filter(
    Boolean,
  ) as string[];
  const finishReason = getNestedValueWithFallbacks<string>(response, stopReasonPaths) ?? "";
  const finishReasonLowercase = finishReason.toLowerCase();
  const isIncompleteResponse =
    finishReasonLowercase === pathConfig.stopReasonValueForLength.toLowerCase() || !responseContent;
  const promptTokens = getNestedValue<number>(response, pathConfig.promptTokensPath) ?? -1;
  const completionTokens = getNestedValue<number>(response, pathConfig.completionTokensPath) ?? -1;
  const maxTotalTokens = -1; // Not using total tokens as that's prompt + completion, not the max limit
  const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
  return { isIncompleteResponse, responseContent, tokenUsage };
}

export type { ResponsePathConfig };
