import { LLMPurpose } from "../../../../src/llm/llm.types";
import { parseTokenUsageFromLLMError } from "../../../../src/llm/processing/msgProcessing/response-error-pattern-parser";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../../../../src/llm/providers/bedrock/bedrock-error-patterns";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../../../../src/llm/providers/openai/openai-error-patterns";

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

describe("parseTokenUsageFromLLMError", () => {
  // Bedrock error patterns
  describe("Bedrock error patterns", () => {
    test("should extract tokens from 'too many input tokens' error message", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279";
      const result = parseTokenUsageFromLLMError(
        GPT_COMPLETIONS_GPT4,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(9279);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract chars from 'malformed input request' error message", () => {
      const errorMsg =
        "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611, please reformat your input and try again.";
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      // For char-based errors, it should derive prompt tokens based on the ratio and model max
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBeGreaterThan(8192); // Should be calculated based on char ratio
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from 'maximum context length' error message", () => {
      const errorMsg =
        "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt";
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(-1); // Not provided in this error pattern
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from 'prompt contains tokens' error message with reversed order", () => {
      const errorMsg =
        "ValidationException. Prompt contains 235396 tokens and 0 draft tokens, too large for model with 131072 maximum context length";
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(131072);
      expect(result.promptTokens).toBe(235396);
      expect(result.completionTokens).toBe(0);
    });

    // Tests with reversed isMaxFirst patterns
    test("should extract tokens from reversed 'too many input tokens' error message", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Request input token count: 9279, max input tokens: 8192";
      // Create a custom pattern with isMaxFirst set to false for this test
      const reversedPattern = [
        {
          pattern: /Request input token count.*?(\d+).*?max input tokens.*?(\d+)/,
          units: "tokens",
          isMaxFirst: false,
        },
      ];
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        reversedPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(9279);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract chars from reversed 'malformed input request' error message", () => {
      const errorMsg =
        "ValidationException: Malformed input request: actual: 52611, expected maxLength: 50000, please reformat your input and try again.";
      // Create a custom pattern with isMaxFirst set to false for this test
      const reversedPattern = [
        { pattern: /actual: (\d+).*?maxLength: (\d+)/, units: "chars", isMaxFirst: false },
      ];
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        reversedPattern,
      );

      // For char-based errors, it should derive prompt tokens based on the ratio and model max
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBeGreaterThan(8192); // Should be calculated based on char ratio
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from reversed 'maximum context length' error message pattern", () => {
      // For this single-value case, we need to create an error message that would match a reversed pattern
      const errorMsg =
        "ValidationException: For prompt with at least 9000 tokens, the model's maximum context length is 8192 tokens. Please reduce the length.";
      // Create a custom pattern with isMaxFirst set to false for this test
      const reversedPattern = [
        {
          pattern: /prompt with at least (\d+) tokens.*?maximum context length is (\d+) tokens/,
          units: "tokens",
          isMaxFirst: false,
        },
      ];
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        reversedPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(9000);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from 'prompt contains tokens' error message with normal order", () => {
      // This would be the original pattern expressed with "isMaxFirst: true"
      const errorMsg =
        "ValidationException. Model has maximum context length of 131072 tokens, but prompt contains 235396 tokens and 0 draft tokens.";
      // Create a custom pattern with isMaxFirst set to true for this test
      const normalOrderPattern = [
        {
          pattern: /maximum context length of (\d+) tokens.*?prompt contains (\d+) tokens/,
          units: "tokens",
          isMaxFirst: true,
        },
      ];
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        normalOrderPattern,
      );

      expect(result.maxTotalTokens).toBe(131072);
      expect(result.promptTokens).toBe(235396);
      expect(result.completionTokens).toBe(0);
    });
  });

  // OpenAI error patterns
  describe("OpenAI error patterns", () => {
    test("should extract tokens from 'maximum context length with prompt and completion breakdown' error message", () => {
      const errorMsg =
        "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        OPENAI_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8191);
      expect(result.promptTokens).toBe(10346);
      expect(result.completionTokens).toBe(5);
    });

    test("should extract tokens from 'maximum context length with messages resulted' error message", () => {
      const errorMsg =
        "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages.";
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        OPENAI_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(8545);
      expect(result.completionTokens).toBe(0);
    });

    // Tests with reversed isMaxFirst patterns for OpenAI
    test("should extract tokens from reversed 'maximum context length with prompt and completion breakdown' error message", () => {
      const errorMsg =
        "You requested 10346 tokens for prompt and 5 tokens for completion, however this model's maximum context length is 8191 tokens. Please reduce your prompt or completion length.";
      // Create a custom pattern with isMaxFirst set to false for this test
      const reversedPattern = [
        {
          pattern: /requested (\d+) tokens.*?maximum context length is (\d+) tokens/,
          units: "tokens",
          isMaxFirst: false,
        },
      ];
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        reversedPattern,
      );

      expect(result.maxTotalTokens).toBe(8191);
      expect(result.promptTokens).toBe(10346);
      expect(result.completionTokens).toBe(0); // We lose the completion tokens in this pattern
    });

    test("should extract tokens from reversed 'maximum context length with messages resulted' error message", () => {
      const errorMsg =
        "Your messages resulted in 8545 tokens. This model's maximum context length is 8192 tokens. Please reduce the length of the messages.";
      // Create a custom pattern with isMaxFirst set to false for this test
      const reversedPattern = [
        {
          pattern: /messages resulted in (\d+) tokens.*?maximum context length is (\d+) tokens/,
          units: "tokens",
          isMaxFirst: false,
        },
      ];
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        reversedPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(8545);
      expect(result.completionTokens).toBe(0);
    });
  });

  // Edge cases and fallbacks
  describe("Edge cases and fallbacks", () => {
    test("should return default values when no error patterns match", () => {
      const errorMsg = "Unknown error with no recognizable token pattern";
      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(-1);
      expect(result.promptTokens).toBe(-1);
      expect(result.completionTokens).toBe(0);
    });

    test("should return default values when no error patterns are provided", () => {
      const errorMsg = "ValidationException: This model's maximum context length is 8192 tokens.";
      const result = parseTokenUsageFromLLMError("GPT_COMPLETIONS_GPT4", errorMsg, testMetadata);

      expect(result.maxTotalTokens).toBe(-1);
      expect(result.promptTokens).toBe(-1);
      expect(result.completionTokens).toBe(0);
    });

    test("should handle error message with only maxTotalTokens available", () => {
      const errorMsg = "Maximum context length is 8192 tokens.";
      // Using a custom pattern that only extracts maxTotalTokens
      const customPattern = [
        {
          pattern: /Maximum context length is (\d+) tokens/,
          units: "tokens",
          isMaxFirst: true,
        },
      ];

      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(-1); // Not provided in this pattern
      expect(result.completionTokens).toBe(0);
    });

    test("should handle patterns with insufficient matches", () => {
      const errorMsg = "This is a simple error";
      const customPattern = [
        {
          pattern: /This is a simple error/,
          units: "tokens",
          isMaxFirst: true,
        },
      ];

      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(-1);
      expect(result.promptTokens).toBe(-1);
      expect(result.completionTokens).toBe(0);
    });

    test("should handle char patterns with insufficient matches", () => {
      const errorMsg = "Character limit error";
      const customPattern = [
        {
          pattern: /Character limit error/,
          units: "chars",
          isMaxFirst: true,
        },
      ];

      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(-1);
      expect(result.promptTokens).toBe(-1);
      expect(result.completionTokens).toBe(0);
    });

    test("should use model metadata for token limits when missing from char patterns", () => {
      const errorMsg = "Actual chars: 60000, max chars: 50000";
      const customPattern = [
        {
          pattern: /Actual chars: (\d+), max chars: (\d+)/,
          units: "chars",
          isMaxFirst: false,
        },
      ];

      const result = parseTokenUsageFromLLMError(
        "GPT_COMPLETIONS_GPT4",
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192); // From testMetadata
      expect(result.promptTokens).toBeGreaterThan(8192); // Calculated from char ratio
      expect(result.completionTokens).toBe(0);
    });
  });
});
