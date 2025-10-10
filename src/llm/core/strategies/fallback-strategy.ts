import { injectable } from "tsyringe";
import type { LLMFunctionResponse, LLMContext } from "../../types/llm.types";
import { LLMResponseStatus } from "../../types/llm.types";
import { logWithContext } from "../tracking/llm-context-logging";

/**
 * Represents the outcome decision for an unsuccessful LLM call.
 */
interface FallbackDecision {
  shouldTerminate: boolean;
  shouldCropPrompt: boolean;
  shouldSwitchToNextLLM: boolean;
}

/**
 * Strategy class responsible for deciding how to handle unsuccessful LLM calls.
 * Encapsulates the complex decision logic that was previously embedded in LLMRouter.
 */
@injectable()
export class FallbackStrategy {
  /**
   * Determines the next action to take based on an unsuccessful LLM call.
   */
  determineNextAction(
    llmResponse: LLMFunctionResponse | null,
    currentLLMFunctionIndex: number,
    totalLLMCount: number,
    context: LLMContext,
    resourceName: string,
  ): FallbackDecision {
    const canSwitchModel = currentLLMFunctionIndex + 1 < totalLLMCount;

    // Handle null response explicitly
    if (llmResponse === null) {
      logWithContext(
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
        logWithContext(
          `Unable to extract a valid response from the current LLM model - invalid JSON being received even after retries `,
          context,
        );
        return {
          shouldTerminate: !canSwitchModel,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: canSwitchModel,
        };

      case LLMResponseStatus.OVERLOADED:
        logWithContext(
          `LLM problem processing prompt with current LLM model because it is overloaded, or timing out, even after retries `,
          context,
        );
        return {
          shouldTerminate: !canSwitchModel,
          shouldCropPrompt: false,
          shouldSwitchToNextLLM: canSwitchModel,
        };

      case LLMResponseStatus.EXCEEDED:
        logWithContext(
          `LLM prompt tokens used ${llmResponse.tokensUsage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUsage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUsage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`,
          context,
        );
        return {
          shouldTerminate: false,
          shouldCropPrompt: !canSwitchModel,
          shouldSwitchToNextLLM: canSwitchModel,
        };

      case LLMResponseStatus.ERRORED:
        logWithContext(
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
        logWithContext(
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
        logWithContext(
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
}
