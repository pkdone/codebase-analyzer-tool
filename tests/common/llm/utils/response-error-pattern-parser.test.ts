import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { calculateTokenUsageFromError } from "../../../../src/common/llm/utils/error-parser";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "../../../../src/common/llm/providers/bedrock/common/bedrock-error-patterns";
import { OPENAI_COMMON_ERROR_PATTERNS } from "../../../../src/common/llm/providers/openai/common/openai-error-patterns";

/**
 * Tests for calculateTokenUsageFromError which internally uses parseTokenUsageFromLLMError.
 * These tests validate the error pattern parsing behavior through the public API.
 */

// Test-only constants
const GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4";
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";

const testMetadata = {
  [GPT_COMPLETIONS_GPT4]: {
    modelKey: GPT_COMPLETIONS_GPT4,
    name: "GPT-4",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    name: "GPT-4 32k",
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
};

// Dummy prompt for tests - length affects fallback calculations
const TEST_PROMPT = "Test prompt content for error parsing tests.";

describe("calculateTokenUsageFromError - error pattern parsing", () => {
  // Bedrock error patterns
  describe("Bedrock error patterns", () => {
    test("should extract tokens from 'too many input tokens' error message", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279";
      const result = calculateTokenUsageFromError(
        GPT_COMPLETIONS_GPT4,
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      // promptTokens will be derived when not provided in error, should be >= maxTotalTokens + 1
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from 'prompt contains tokens' error message with reversed order", () => {
      const errorMsg =
        "ValidationException. Prompt contains 235396 tokens and 0 draft tokens, too large for model with 131072 maximum context length";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
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
    test("should derive values when no error patterns match", () => {
      const errorMsg = "Unknown error with no recognizable token pattern";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      // When no pattern matches, calculateTokenUsageFromError derives values from model metadata
      expect(result.maxTotalTokens).toBe(8192); // From model metadata
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192); // Derived from prompt length
      expect(result.completionTokens).toBe(0);
    });

    test("should derive values when no error patterns are provided", () => {
      const errorMsg = "ValidationException: This model's maximum context length is 8192 tokens.";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
      );

      expect(result.maxTotalTokens).toBe(8192); // Falls back to model metadata
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192); // Derived
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

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      // promptTokens will be derived since not in pattern
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192);
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

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      // Falls back to model metadata values
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192);
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

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      // Falls back to model metadata values
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192);
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

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192); // From testMetadata
      expect(result.promptTokens).toBeGreaterThan(8192); // Calculated from char ratio
      expect(result.completionTokens).toBe(0);
    });
  });

  // Tests for config-driven extraction logic
  describe("Config-driven extraction", () => {
    test("should correctly extract values with isMaxFirst=true pattern", () => {
      const errorMsg = "Maximum context: 8192 tokens, used: 9500 tokens, completion: 100 tokens";
      const customPattern = [
        {
          pattern: /Maximum context: (\d+) tokens, used: (\d+) tokens, completion: (\d+) tokens/,
          units: "tokens",
          isMaxFirst: true,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(9500);
      expect(result.completionTokens).toBe(100);
    });

    test("should correctly extract values with isMaxFirst=false pattern", () => {
      const errorMsg = "Used: 9500 tokens, Maximum: 8192 tokens, completion: 100 tokens";
      const customPattern = [
        {
          pattern: /Used: (\d+) tokens, Maximum: (\d+) tokens, completion: (\d+) tokens/,
          units: "tokens",
          isMaxFirst: false,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(9500);
      expect(result.completionTokens).toBe(100);
    });

    test("should use fallback for maxTotalTokens when only one capture group for isMaxFirst=false", () => {
      const errorMsg = "Prompt used 9500 tokens";
      const customPattern = [
        {
          pattern: /Prompt used (\d+) tokens/,
          units: "tokens",
          isMaxFirst: false,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192); // Fallback from metadata
      expect(result.promptTokens).toBe(9500);
      expect(result.completionTokens).toBe(0);
    });

    test("should handle char-based extraction with isMaxFirst=true", () => {
      const errorMsg = "Max chars: 50000, actual chars: 60000";
      const customPattern = [
        {
          pattern: /Max chars: (\d+), actual chars: (\d+)/,
          units: "chars",
          isMaxFirst: true,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      // charsLimit=50000, charsPrompt=60000, derived tokens = ceil(60000/50000 * 8192) = 9831
      // Then max(9831, 8193) = 9831
      expect(result.promptTokens).toBe(9831);
      expect(result.completionTokens).toBe(0);
    });

    test("should handle char-based extraction with isMaxFirst=false", () => {
      const errorMsg = "Actual chars: 60000, max chars: 50000";
      const customPattern = [
        {
          pattern: /Actual chars: (\d+), max chars: (\d+)/,
          units: "chars",
          isMaxFirst: false,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      // Same calculation as above
      expect(result.promptTokens).toBe(9831);
      expect(result.completionTokens).toBe(0);
    });

    test("should return default result when char pattern has insufficient matches", () => {
      const errorMsg = "Only one number: 50000";
      const customPattern = [
        {
          pattern: /Only one number: (\d+)/,
          units: "chars",
          isMaxFirst: true,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      // Falls back to model metadata
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192);
      expect(result.completionTokens).toBe(0);
    });

    test("should correctly set promptTokens to -1 when only maxTotalTokens captured with isMaxFirst=true", () => {
      const errorMsg = "Context length is 8192 tokens";
      const customPattern = [
        {
          pattern: /Context length is (\d+) tokens/,
          units: "tokens",
          isMaxFirst: true,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPattern,
      );

      expect(result.maxTotalTokens).toBe(8192);
      // promptTokens derived since not in pattern
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192);
      expect(result.completionTokens).toBe(0);
    });

    test("should iterate through multiple patterns and use first match", () => {
      const errorMsg = "Request failed: used 9500 tokens";
      const customPatterns = [
        {
          pattern: /Context length is (\d+) tokens/,
          units: "tokens",
          isMaxFirst: true,
        },
        {
          pattern: /used (\d+) tokens/,
          units: "tokens",
          isMaxFirst: false,
        },
      ];

      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        customPatterns,
      );

      expect(result.promptTokens).toBe(9500);
      expect(result.maxTotalTokens).toBe(8192); // Fallback
      expect(result.completionTokens).toBe(0);
    });
  });
});
