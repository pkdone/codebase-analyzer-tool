import { adaptPromptFromResponse } from "../../../../../src/common/llm/strategies/prompt-adaptation-strategy";
import {
  LLMFunctionResponse,
  LLMResponseStatus,
  LLMPurpose,
  ResolvedLLMModelMetadata,
} from "../../../../../src/common/llm/types/llm.types";
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

  beforeEach(() => {
    modelsMetadata = {
      GPT_COMPLETIONS_GPT4: {
        modelKey: "GPT_COMPLETIONS_GPT4",
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
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      tokensUsage: {
        promptTokens: 5000,
        completionTokens: 4000,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata);
    expect(result.length).toBeLessThan(prompt.length);
    expect(result).toBe(prompt.substring(0, result.length));
  });

  test("should throw error when tokensUsage is missing", () => {
    const prompt = "Test prompt";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      // tokensUsage is missing
    };

    expect(() => adaptPromptFromResponse(prompt, llmResponse, modelsMetadata)).toThrow(
      "LLM response indicated token limit exceeded but `tokensUsage` is not present",
    );
  });

  test("should handle empty prompt", () => {
    const prompt = "";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      tokensUsage: {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata);
    expect(result).toBe("");
  });

  test("should handle whitespace-only prompt", () => {
    const prompt = "   ";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      tokensUsage: {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata);
    expect(result).toBe("   ");
  });

  test("should reduce prompt when completion tokens are near limit", () => {
    const prompt = "This is a long prompt that needs to be reduced in size";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      tokensUsage: {
        promptTokens: 3000,
        completionTokens: 4050, // Near the 4096 limit
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata);
    expect(result.length).toBeLessThan(prompt.length);
    expect(result).toBe(prompt.substring(0, result.length));
  });

  test("should reduce prompt when total tokens exceed limit", () => {
    const prompt =
      "This is a very long prompt that exceeds the total token limit when combined with completion tokens";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      tokensUsage: {
        promptTokens: 5000,
        completionTokens: 4000,
        maxTotalTokens: 8192, // Total exceeds limit
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata);
    expect(result.length).toBeLessThan(prompt.length);
    expect(result).toBe(prompt.substring(0, result.length));
  });

  test("should apply minimal reduction based on algorithm logic", () => {
    const prompt = "This is a reasonable length prompt";
    const llmResponse: LLMFunctionResponse = {
      status: LLMResponseStatus.EXCEEDED,
      request: prompt,
      modelKey: "GPT_COMPLETIONS_GPT4",
      context: { resource: "test", purpose: LLMPurpose.COMPLETIONS },
      tokensUsage: {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      },
    };

    const result = adaptPromptFromResponse(prompt, llmResponse, modelsMetadata);
    // The algorithm applies the maximum reduction ratio (0.85) when total tokens check is triggered
    // Expected reduction: 8192 / (100 + 50 + 1) = ~54.2, but capped at 0.85 maximum
    const expectedLength = Math.floor(prompt.length * 0.85);
    expect(result).toBe(prompt.substring(0, expectedLength));
    expect(result.length).toBe(expectedLength);
  });
});
