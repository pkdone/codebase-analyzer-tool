import type { LLMFunctionResponse } from "../types/llm-response.types";
import type { LLMContext } from "../types/llm-request.types";
import { LLMResponseStatus } from "../types/llm-response.types";
import { logWarn } from "../../utils/logging";

/**
 * Represents the outcome decision for an unsuccessful LLM call.
 */
export interface FallbackDecision {
  readonly shouldTerminate: boolean;
  readonly shouldCropPrompt: boolean;
  readonly shouldSwitchToNextLLM: boolean;
}

/**
 * Determines the next action to take based on an unsuccessful LLM call.
 * This is a pure function that encapsulates the complex decision logic for handling
 * unsuccessful LLM calls. The response type doesn't affect the fallback decision logic.
 *
 * @param llmResponse The LLM response (or null if no response received)
 * @param currentLLMFunctionIndex The index of the current LLM function being tried
 * @param totalLLMCount The total number of available LLM functions
 * @param context The LLM context for logging purposes
 * @param resourceName The name of the resource being processed
 * @returns A decision object indicating what action to take next
 */
export function determineNextAction(
  llmResponse: LLMFunctionResponse | null,
  currentLLMFunctionIndex: number,
  totalLLMCount: number,
  context: LLMContext,
  resourceName: string,
): FallbackDecision {
  const canSwitchModel = currentLLMFunctionIndex + 1 < totalLLMCount;

  // Handle null response - this only occurs when an unexpected exception happened
  // and no valid LLM response was ever received (e.g., network errors, provider issues)
  if (llmResponse === null) {
    logWarn(
      `Problem processing prompt with current LLM model - no response received due to an unexpected error`,
      context,
    );
    return {
      shouldTerminate: !canSwitchModel,
      shouldCropPrompt: false,
      shouldSwitchToNextLLM: canSwitchModel,
    };
  }

  switch (llmResponse.status) {
    case LLMResponseStatus.INVALID:
      logWarn(
        `Unable to extract a valid response from the current LLM model - invalid response format even after retries`,
        { ...context, parseError: llmResponse.error },
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.OVERLOADED:
      logWarn(`LLM model is overloaded or timing out even after retries`, context);
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.EXCEEDED:
      logWarn(
        `LLM model prompt tokens used ${llmResponse.tokensUsage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUsage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUsage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`,
        context,
      );
      return {
        shouldTerminate: false,
        shouldCropPrompt: !canSwitchModel,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.ERRORED:
      logWarn(
        `LLM model encountered an error while processing the request for resource '${resourceName}'`,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.COMPLETED:
      // This shouldn't typically reach fallback strategy, but handle gracefully
      logWarn(
        `Unexpected LLM model COMPLETED status in fallback strategy for resource '${resourceName}' - terminating`,
        context,
      );
      return {
        shouldTerminate: true,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: false,
      };

    case LLMResponseStatus.UNKNOWN:
    default:
      logWarn(
        `An unknown error occurred while LLMRouter attempted to process the LLM model invocation and response for resource '${resourceName}' - terminating response processing - response status received: '${llmResponse.status}'`,
        context,
      );
      return {
        shouldTerminate: true,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: false,
      };
  }
}
