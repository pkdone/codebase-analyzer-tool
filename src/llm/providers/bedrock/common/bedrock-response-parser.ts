import { z } from "zod";
import { getNestedValue, getNestedValueWithFallbacks } from "../../../../common/utils/object-utils";
import { isDefined } from "../../../../common/utils/type-guards";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";
import { LLMGeneratedContent } from "../../../types/llm.types";
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
    isDefined,
  );
  const responseContentRaw = getNestedValueWithFallbacks(response, contentPaths);
  // Preserve null values from LLM (null has different semantic meaning than empty string)
  // Convert undefined to null to match LLMGeneratedContent type (which doesn't include undefined)
  const responseContent =
    responseContentRaw === undefined ? null : (responseContentRaw as LLMGeneratedContent);
  const stopReasonPaths = [pathConfig.stopReasonPath, pathConfig.alternativeStopReasonPath].filter(
    isDefined,
  );
  const finishReasonRaw = getNestedValueWithFallbacks(response, stopReasonPaths);
  const finishReason = typeof finishReasonRaw === "string" ? finishReasonRaw : "";
  const finishReasonLowercase = finishReason.toLowerCase();
  const isIncompleteResponse =
    finishReasonLowercase === pathConfig.stopReasonValueForLength.toLowerCase() ||
    responseContent == null;
  const promptTokensRaw = getNestedValue(response, pathConfig.promptTokensPath);
  const promptTokens = typeof promptTokensRaw === "number" ? promptTokensRaw : -1;
  const completionTokensRaw = getNestedValue(response, pathConfig.completionTokensPath);
  const completionTokens = typeof completionTokensRaw === "number" ? completionTokensRaw : -1;
  const maxTotalTokens = -1; // Not using total tokens as that's prompt + completion, not the max limit
  const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
  return { isIncompleteResponse, responseContent, tokenUsage };
}

export type { ResponsePathConfig };
