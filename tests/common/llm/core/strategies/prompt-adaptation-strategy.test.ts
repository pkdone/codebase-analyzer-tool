import { adaptPromptFromResponse } from "../../../../../src/common/llm/strategies/prompt-adaptation-strategy";
import { LLMPurpose } from "../../../../../src/common/llm/types/llm-request.types";
import {
  LLMFunctionResponse,
  LLMResponseStatus,
} from "../../../../../src/common/llm/types/llm-response.types";
import { ResolvedLLMModelMetadata } from "../../../../../src/common/llm/types/llm-model.types";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

// Mock the LLM config
jest.mock("../../../../../src/common/llm/config/llm.config", () => ({
  llmConfig: {
    COMPLETION_MAX_TOKENS_LIMIT_BUFFER: 50,
    MAX_COMPLETION_REDUCTION_RATIO: 0.75,
    MAX_PROMPT_REDUCTION_RATIO: 0.85,
  },
}));

describe("adaptPromptFromResponse", () => {
  let modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  const providerFamily = "TestProvider";
  const modelKey = "GPT_COMPLETIONS_GPT4";

  beforeEach(() => {
    // Metadata keys use "ProviderFamily:modelKey" format (as returned by getAllModelsMetadata)
    modelsMetadata = {
      [`${providerFamily}:${modelKey}`]: {
        modelKey: modelKey,
        urnEnvKey: "TEST_GPT4_URN",
        urn: "gpt-4",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 8192,
      },
    };
  });

  test("should adapt prompt from LLM response", () => {
    const prompt = "This is a long prompt that needs to be adapted due to token limits";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: modelKey,
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      tokensUsage: {
        promptTokens: 5000,
        completionTokens: 4000,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata, providerFamily);
    expect(result.length).toBeLessThan(prompt.length);
    expect(result).toBe(prompt.substring(0, result.length));
  });

  test("should throw error when tokensUsage is missing", () => {
    const prompt = "Test prompt";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: modelKey,
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      // tokensUsage is missing
    };

    expect(() => adaptPromptFromResponse(prompt, llmResponse, modelsMetadata, providerFamily)).toThrow(
      "LLM response indicated token limit exceeded but `tokensUsage` is not present",
    );
  });

  test("should handle empty prompt", () => {
    const prompt = "";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: modelKey,
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      tokensUsage: {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata, providerFamily);
    expect(result).toBe("");
  });

  test("should handle whitespace-only prompt", () => {
    const prompt = "   ";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: modelKey,
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      tokensUsage: {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata, providerFamily);
    expect(result).toBe("   ");
  });

  test("should reduce prompt when completion tokens are near limit", () => {
    const prompt = "This is a long prompt that needs to be reduced in size";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: modelKey,
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      tokensUsage: {
        promptTokens: 3000,
        completionTokens: 4050, // Near the 4096 limit
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata, providerFamily);
    expect(result.length).toBeLessThan(prompt.length);
    expect(result).toBe(prompt.substring(0, result.length));
  });

  test("should reduce prompt when total tokens exceed limit", () => {
    const prompt =
      "This is a very long prompt that exceeds the total token limit when combined with completion tokens";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: modelKey,
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      tokensUsage: {
        promptTokens: 5000,
        completionTokens: 4000,
        maxTotalTokens: 8192, // Total exceeds limit
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata, providerFamily);
    expect(result.length).toBeLessThan(prompt.length);
    expect(result).toBe(prompt.substring(0, result.length));
  });

  test("should apply minimal reduction based on algorithm logic", () => {
    const prompt = "This is a reasonable length prompt";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: modelKey,
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
      tokensUsage: {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata, providerFamily);
    // The algorithm applies the maximum reduction ratio (0.85) when total tokens check is triggered
    // Expected reduction: 8192 / (100 + 50 + 1) = ~54.2, but capped at 0.85 maximum
    const expectedLength = Math.floor(prompt.length * 0.85);
    expect(result).toBe(prompt.substring(0, expectedLength));
    expect(result.length).toBe(expectedLength);
  });
});
