import { injectable } from "tsyringe";
import type { LLMFunctionResponse, LLMContext } from "../../types/llm.types";
import { LLMResponseStatus } from "../../types/llm.types";
import { logWithContext } from "../utils/routerTracking/llm-router-logging";

/**
 * Represents the outcome decision for an unsuccessful LLM call.
 */
export interface FallbackDecision {
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
    const isInvalidResponse = llmResponse?.status === LLMResponseStatus.INVALID;
    const isOverloaded = !llmResponse || llmResponse.status === LLMResponseStatus.OVERLOADED;
    const isExceeded = llmResponse?.status === LLMResponseStatus.EXCEEDED;
    const canSwitchModel = currentLLMFunctionIndex + 1 < totalLLMCount;

    if (isInvalidResponse) {
      logWithContext(
        `Unable to extract a valid response from the current LLM model - invalid JSON being received even after retries `,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };
    } else if (isOverloaded) {
      logWithContext(
        `LLM problem processing prompt with current LLM model because it is overloaded, or timing out, even after retries `,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };
    } else if (isExceeded) {
      logWithContext(
        `LLM prompt tokens used ${llmResponse.tokensUsage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUsage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUsage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`,
        context,
      );
      return {
        shouldTerminate: false,
        shouldCropPrompt: !canSwitchModel,
        shouldSwitchToNextLLM: canSwitchModel,
      };
    } else {
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
