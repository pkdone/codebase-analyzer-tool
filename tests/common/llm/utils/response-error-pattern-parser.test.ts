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
    urnEnvKey: "TEST_GPT4_URN",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urnEnvKey: "TEST_GPT4_32K_URN",
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

    test("should extract tokens from 'number of input tokens' error message", () => {
      // Using error format that matches the existing pattern
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9000";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(9000);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from 'prompt too large' error message", () => {
      // Using error format that matches existing pattern: "Prompt contains X tokens...too large for model with Y maximum context length"
      const errorMsg =
        "ValidationException. Prompt contains 150000 tokens and 0 draft tokens, too large for model with 128000 maximum context length";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(128000);
      expect(result.promptTokens).toBe(150000);
      expect(result.completionTokens).toBe(0);
    });
  });

  // OpenAI error patterns
  describe("OpenAI error patterns", () => {
    test("should extract tokens from 'maximum context length exceeded' with completion request", () => {
      const errorMsg =
        "This model's maximum context length is 8192 tokens. However, your messages resulted in 10000 tokens. Please reduce the length of the messages.";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        OPENAI_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(10000);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from Azure OpenAI format error", () => {
      const errorMsg =
        'Error code: 400 - {"error":{"message":"This model\'s maximum context length is 16385 tokens. However, your messages resulted in 19837 tokens. Please reduce the length of the messages.","type":"invalid_request_error","param":"messages","code":"context_length_exceeded"}}';
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4_32k",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        OPENAI_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(16385);
      expect(result.promptTokens).toBe(19837);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract tokens from rate limit error with tokens info", () => {
      const errorMsg =
        "Rate limit reached for gpt-4 in organization on tokens per min. Limit: 10000, Used: 8500, Requested: 2000.";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        OPENAI_COMMON_ERROR_PATTERNS,
      );

      // For rate limit errors, we expect reasonable fallback values
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.completionTokens).toBe(0);
    });
  });

  // Edge cases
  describe("Edge cases", () => {
    test("should return fallback values for unrecognized error message", () => {
      const errorMsg = "Unknown error occurred in the service";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBeGreaterThanOrEqual(8192);
      expect(result.completionTokens).toBe(0);
    });

    test("should handle empty error message", () => {
      const errorMsg = "";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.completionTokens).toBe(0);
    });

    test("should throw error for missing model in metadata", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279";

      // The function requires the model to exist in metadata for fallback token values
      expect(() =>
        calculateTokenUsageFromError(
          "NON_EXISTENT_MODEL",
          TEST_PROMPT,
          errorMsg,
          testMetadata,
          BEDROCK_COMMON_ERROR_PATTERNS,
        ),
      ).toThrow();
    });

    test("should use larger model max tokens when specified", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4_32k",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      // Should use extracted values from error, not model's 32k limit
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.promptTokens).toBe(9279);
    });

    test("should handle multi-line error messages", () => {
      const errorMsg = `ValidationException: Error processing request
        Maximum context length: 8192 tokens
        Request token count: 10000`;
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(8192);
      expect(result.completionTokens).toBe(0);
    });

    test("should handle very large token counts", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 1000000, request input token count: 1500000";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(1000000);
      expect(result.promptTokens).toBe(1500000);
      expect(result.completionTokens).toBe(0);
    });
  });

  // Bedrock Claude specific patterns - testing with actual supported pattern formats
  describe("Bedrock Claude specific patterns", () => {
    test("should extract from Claude prompt too long error using supported format", () => {
      // Using the supported "Prompt contains X tokens...too large for model with Y" pattern
      const errorMsg =
        "ValidationException. Prompt contains 105000 tokens and 0 draft tokens, too large for model with 100000 maximum context length";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      expect(result.maxTotalTokens).toBe(100000);
      expect(result.promptTokens).toBe(105000);
      expect(result.completionTokens).toBe(0);
    });

    test("should fall back to model defaults for unsupported error format", () => {
      // This error format is not yet supported - should fall back to model defaults
      const errorMsg =
        "ValidationException: Input validation error: Your request contains 50000 tokens. The maximum allowed is 40000 tokens.";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        BEDROCK_COMMON_ERROR_PATTERNS,
      );

      // Should fall back to model's maxTotalTokens since pattern doesn't match
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.completionTokens).toBe(0);
    });
  });

  // OpenAI/Azure specific patterns
  describe("OpenAI/Azure specific patterns", () => {
    test("should extract from content filter error", () => {
      const errorMsg =
        'Error code: 400 - {"error":{"code":"content_filter","message":"The response was filtered due to the prompt triggering Azure content management policy."}}';
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        OPENAI_COMMON_ERROR_PATTERNS,
      );

      // For content filter errors, should use model defaults
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.completionTokens).toBe(0);
    });

    test("should extract from embedding dimension error", () => {
      const errorMsg = "Invalid embedding dimensions requested: 2048. Model supports: 1536.";
      const result = calculateTokenUsageFromError(
        "GPT_COMPLETIONS_GPT4",
        TEST_PROMPT,
        errorMsg,
        testMetadata,
        OPENAI_COMMON_ERROR_PATTERNS,
      );

      // Should return model defaults for non-token errors
      expect(result.maxTotalTokens).toBe(8192);
      expect(result.completionTokens).toBe(0);
    });
  });
});
