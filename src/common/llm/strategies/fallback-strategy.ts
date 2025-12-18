import type { LLMFunctionResponse, LLMContext } from "../types/llm.types";
import { LLMResponseStatus } from "../types/llm.types";
import { logOneLineWarning } from "../../utils/logging";

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

  // Handle null response explicitly
  if (llmResponse === null) {
    logOneLineWarning(
      `LLM problem processing prompt with current LLM model - null response received, possibly due to overload or timeout even after retries`,
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
      logOneLineWarning(
        `Unable to extract a valid response from the current LLM model - invalid JSON being received even after retries `,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.OVERLOADED:
      logOneLineWarning(
        `LLM problem processing prompt with current LLM model because it is overloaded, or timing out, even after retries `,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.EXCEEDED:
      logOneLineWarning(
        `LLM prompt tokens used ${llmResponse.tokensUsage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUsage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUsage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`,
        context,
      );
      return {
        shouldTerminate: false,
        shouldCropPrompt: !canSwitchModel,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.ERRORED:
      logOneLineWarning(
        `LLM encountered an error while processing the request for resource '${resourceName}'`,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };

    case LLMResponseStatus.COMPLETED:
      // This shouldn't typically reach fallback strategy, but handle gracefully
      logOneLineWarning(
        `Unexpected COMPLETED status in fallback strategy for resource '${resourceName}' - terminating`,
        context,
      );
      return {
        shouldTerminate: true,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: false,
      };

    case LLMResponseStatus.UNKNOWN:
    default:
      logOneLineWarning(
        `An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource '${resourceName}' - terminating response processing - response status received: '${llmResponse.status}'`,
        context,
      );
      return {
        shouldTerminate: true,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: false,
      };
  }
}
