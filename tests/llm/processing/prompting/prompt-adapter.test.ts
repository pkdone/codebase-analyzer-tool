import "reflect-metadata";
import {
  LLMPurpose,
  LLMResponseStatus,
  LLMFunctionResponse,
  LLMResponseTokensUsage,
  ResolvedLLMModelMetadata,
} from "../../../../src/llm/llm.types";
import {
  PromptAdapter,
  TokenLimitReductionStrategy,
  PromptAdaptationStrategy,
} from "../../../../src/llm/processing/prompting/prompt-adapter";

// Test-only constants
const GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4";
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";

const testMetadata = {
  [GPT_COMPLETIONS_GPT4]: {
    modelKey: GPT_COMPLETIONS_GPT4,
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
};

describe("PromptAdapter", () => {
  // Helper function to create a mock LLM response for prompt adapter testing
  const createMockLLMResponse = (
    modelKey: string,
    tokensUsage: LLMResponseTokensUsage,
  ): LLMFunctionResponse => ({
    status: LLMResponseStatus.EXCEEDED,
    request: "mock request",
    modelKey,
    context: { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
    tokensUage: tokensUsage,
  });

  describe("adaptPromptFromResponse", () => {
    test("should reduce prompt according to min ratio when tokens are below limits", () => {
      const prompt = "1234 1234 1234 1234";
      const tokensUsage = { promptTokens: 4, completionTokens: 10, maxTotalTokens: 8192 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse(GPT_COMPLETIONS_GPT4, tokensUsage);
      expect(adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata)).toBe(
        "1234 1234 1234 1",
      );
    });

    test("should reduce prompt when completion token limit is hit", () => {
      const prompt = "1234 ".repeat(25);
      const tokensUsage = { promptTokens: 100, completionTokens: 4096, maxTotalTokens: 8192 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse(GPT_COMPLETIONS_GPT4, tokensUsage);
      expect(adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata).length).toBe(93);
    });

    test("should reduce prompt when total token limit is hit", () => {
      const prompt = "A".repeat(57865); // random string
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse(GPT_COMPLETIONS_GPT4, tokensUsage);
      const result = adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata);
      expect(result.length).toBe(49185);
    });

    test("should return empty string when prompt is empty", () => {
      const prompt = "";
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse("GPT_COMPLETIONS_GPT4", tokensUsage);
      expect(adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata)).toBe("");
    });

    test("should reduce prompt significantly when total token limit is severely exceeded", () => {
      const prompt = "1234 ".repeat(250);
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse("GPT_COMPLETIONS_GPT4", tokensUsage);
      const result = adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata);
      expect(result.length).toBe(1062);
    });

    test("should handle models with lower completion token limits", () => {
      const prompt = "A".repeat(1000);
      const tokensUsage = { promptTokens: 6000, completionTokens: 3000, maxTotalTokens: 32768 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse("GPT_COMPLETIONS_GPT4", tokensUsage);
      expect(
        adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata).length,
      ).toBeLessThan(prompt.length);
    });

    test("should handle models with higher total token limits", () => {
      const prompt = "A".repeat(1000);
      const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 32768 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse("GPT_COMPLETIONS_GPT4", tokensUsage);
      const result = adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata);
      expect(result.length).toBeLessThan(prompt.length);
    });

    test("should throw error when tokensUage is missing from response", () => {
      const prompt = "test prompt";
      const adapter = new PromptAdapter();
      const mockResponse: LLMFunctionResponse = {
        status: LLMResponseStatus.EXCEEDED,
        request: "mock request",
        modelKey: "GPT_COMPLETIONS_GPT4",
        context: { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        tokensUage: undefined,
      };

      expect(() => {
        adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata);
      }).toThrow("LLM response indicated token limit exceeded but `tokensUage` is not present");
    });
  });

  describe("strategy management", () => {
    test("should use default TokenLimitReductionStrategy", () => {
      const adapter = new PromptAdapter();
      expect(adapter.getStrategy()).toBeInstanceOf(TokenLimitReductionStrategy);
    });

    test("should allow setting custom strategy", () => {
      class CustomStrategy implements PromptAdaptationStrategy {
        adaptPrompt(): string {
          return "custom result";
        }
      }

      const adapter = new PromptAdapter();
      const customStrategy = new CustomStrategy();
      adapter.setStrategy(customStrategy);

      expect(adapter.getStrategy()).toBe(customStrategy);
    });

    test("should use custom strategy when adapting prompt", () => {
      class CustomStrategy implements PromptAdaptationStrategy {
        adaptPrompt(): string {
          return "custom adapted prompt";
        }
      }

      const prompt = "original prompt";
      const tokensUsage = { promptTokens: 100, completionTokens: 100, maxTotalTokens: 8192 };
      const adapter = new PromptAdapter();
      const mockResponse = createMockLLMResponse("GPT_COMPLETIONS_GPT4", tokensUsage);

      adapter.setStrategy(new CustomStrategy());
      const result = adapter.adaptPromptFromResponse(prompt, mockResponse, testMetadata);

      expect(result).toBe("custom adapted prompt");
    });
  });
});

describe("TokenLimitReductionStrategy", () => {
  const strategy = new TokenLimitReductionStrategy();

  test("should reduce prompt according to min ratio even when within limits", () => {
    const prompt = "test prompt";
    const tokensUsage = { promptTokens: 100, completionTokens: 100, maxTotalTokens: 8192 };
    const result = strategy.adaptPrompt(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata);
    // The strategy always applies at least the minimum reduction ratio (0.85)
    expect(result.length).toBe(Math.floor(prompt.length * 0.85));
  });

  test("should return original prompt when it's empty or whitespace", () => {
    const emptyPrompt = "";
    const whitespacePrompt = "   ";
    const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };

    expect(
      strategy.adaptPrompt(emptyPrompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata),
    ).toBe("");
    expect(
      strategy.adaptPrompt(whitespacePrompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata),
    ).toBe(whitespacePrompt);
  });

  test("should reduce prompt when completion tokens are at the limit", () => {
    const prompt = "A".repeat(1000);
    const tokensUsage = { promptTokens: 100, completionTokens: 4096, maxTotalTokens: 8192 };
    const result = strategy.adaptPrompt(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata);
    expect(result.length).toBeLessThan(prompt.length);
  });

  test("should reduce prompt when total tokens exceed limit", () => {
    const prompt = "A".repeat(1000);
    const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
    const result = strategy.adaptPrompt(prompt, "GPT_COMPLETIONS_GPT4", tokensUsage, testMetadata);
    expect(result.length).toBeLessThan(prompt.length);
  });

  test("should handle model without maxCompletionTokens defined", () => {
    const customMetadata: Record<string, ResolvedLLMModelMetadata> = {
      CUSTOM_MODEL: {
        modelKey: "CUSTOM_MODEL",
        urn: "custom",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: undefined,
        maxTotalTokens: 8192,
      },
    };

    const prompt = "A".repeat(1000);
    const tokensUsage = { promptTokens: 8000, completionTokens: 500, maxTotalTokens: 8192 };
    const result = strategy.adaptPrompt(prompt, "CUSTOM_MODEL", tokensUsage, customMetadata);
    expect(result.length).toBeLessThan(prompt.length);
  });
});
