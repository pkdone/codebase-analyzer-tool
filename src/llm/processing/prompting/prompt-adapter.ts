import { injectable } from "tsyringe";
import { llmConfig } from "../../llm.config";
import {
  LLMResponseTokensUsage,
  LLMFunctionResponse,
  ResolvedLLMModelMetadata,
} from "../../llm.types";
import { BadResponseMetadataLLMError } from "../../errors/llm-errors.types";

/**
 * Strategy interface for prompt adaptation approaches.
 */
export interface PromptAdaptationStrategy {
  adaptPrompt(
    prompt: string,
    modelKey: string,
    tokensUsage: LLMResponseTokensUsage,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  ): string;
}

/**
 * Default strategy that reduces prompt size based on token limit calculations.
 */
export class TokenLimitReductionStrategy implements PromptAdaptationStrategy {
  adaptPrompt(
    prompt: string,
    modelKey: string,
    tokensUsage: LLMResponseTokensUsage,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  ): string {
    if (prompt.trim() === "") return prompt;

    const { promptTokens, completionTokens, maxTotalTokens } = tokensUsage;
    const maxCompletionTokensLimit = modelsMetadata[modelKey].maxCompletionTokens;
    let reductionRatio = 1;

    // If all the LLM's available completion tokens have been consumed then will need to reduce prompt size to try influence any subsequent generated completion to be smaller
    if (
      maxCompletionTokensLimit &&
      completionTokens >= maxCompletionTokensLimit - llmConfig.COMPLETION_MAX_TOKENS_LIMIT_BUFFER
    ) {
      reductionRatio = Math.min(
        maxCompletionTokensLimit / (completionTokens + 1),
        llmConfig.COMPLETION_TOKENS_REDUCE_MIN_RATIO,
      );
    }

    // If the total tokens used is more than the total tokens available then reduce the prompt size proportionally
    if (reductionRatio >= 1) {
      reductionRatio = Math.min(
        maxTotalTokens / (promptTokens + completionTokens + 1),
        llmConfig.PROMPT_TOKENS_REDUCE_MIN_RATIO,
      );
    }

    const newPromptSize = Math.floor(prompt.length * reductionRatio);
    return prompt.substring(0, newPromptSize);
  }
}

/**
 * Dedicated class for handling prompt adaptation strategies.
 * This class decouples prompt modification logic from the core routing and retry mechanisms.
 */
@injectable()
export class PromptAdapter {
  private strategy: PromptAdaptationStrategy;

  constructor() {
    this.strategy = new TokenLimitReductionStrategy();
  }

  /**
   * Adapts a prompt based on LLM response feedback (typically when token limits are exceeded).
   *
   * @param prompt The original prompt that needs to be adapted
   * @param llmResponse The LLM response containing token usage information
   * @param modelsMetadata Metadata about available LLM models
   * @returns The adapted prompt
   */
  adaptPromptFromResponse(
    prompt: string,
    llmResponse: LLMFunctionResponse,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  ): string {
    if (!llmResponse.tokensUage) {
      throw new BadResponseMetadataLLMError(
        "LLM response indicated token limit exceeded but `tokensUage` is not present",
        llmResponse,
      );
    }

    return this.strategy.adaptPrompt(
      prompt,
      llmResponse.modelKey,
      llmResponse.tokensUage,
      modelsMetadata,
    );
  }

  /**
   * Allows changing the adaptation strategy at runtime.
   *
   * @param strategy The new strategy to use for prompt adaptation
   */
  setStrategy(strategy: PromptAdaptationStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Gets the current adaptation strategy.
   */
  getStrategy(): PromptAdaptationStrategy {
    return this.strategy;
  }
}
