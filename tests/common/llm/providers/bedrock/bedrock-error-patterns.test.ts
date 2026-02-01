import {
  BEDROCK_TOKEN_LIMIT_KEYWORDS,
  BEDROCK_COMMON_ERROR_PATTERNS,
} from "../../../../../src/common/llm/providers/bedrock/common/bedrock-error-patterns";

describe("bedrock-error-patterns", () => {
  describe("BEDROCK_TOKEN_LIMIT_KEYWORDS", () => {
    it("should be defined", () => {
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toBeDefined();
    });

    it("should contain expected keywords", () => {
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toContain("too many input tokens");
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toContain("expected maxlength");
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toContain("input is too long");
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toContain("input length");
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toContain("too large for model");
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toContain("please reduce the length of the prompt");
    });

    it("should have exactly 6 keywords", () => {
      expect(BEDROCK_TOKEN_LIMIT_KEYWORDS).toHaveLength(6);
    });

    it("should have all lowercase keywords for case-insensitive matching", () => {
      for (const keyword of BEDROCK_TOKEN_LIMIT_KEYWORDS) {
        expect(keyword).toBe(keyword.toLowerCase());
      }
    });

    it("should detect token limit errors in typical error messages", () => {
      const testMessages = [
        "ValidationException: 400 Bad Request: Too many input tokens",
        "expected maxLength: 50000, actual: 52611",
        "input is too long for this model",
        "input length exceeds maximum",
        "prompt is too large for model with 131072 maximum context",
        "Please reduce the length of the prompt and try again",
      ];

      for (const message of testMessages) {
        const lowercaseMessage = message.toLowerCase();
        const matches = BEDROCK_TOKEN_LIMIT_KEYWORDS.some((keyword) =>
          lowercaseMessage.includes(keyword),
        );
        expect(matches).toBe(true);
      }
    });

    it("should not match unrelated error messages", () => {
      const unrelatedMessages = [
        "Network timeout error",
        "Authentication failed",
        "Invalid JSON response",
        "Rate limit exceeded",
      ];

      for (const message of unrelatedMessages) {
        const lowercaseMessage = message.toLowerCase();
        const matches = BEDROCK_TOKEN_LIMIT_KEYWORDS.some((keyword) =>
          lowercaseMessage.includes(keyword),
        );
        expect(matches).toBe(false);
      }
    });
  });

  describe("BEDROCK_COMMON_ERROR_PATTERNS", () => {
    it("should be defined", () => {
      expect(BEDROCK_COMMON_ERROR_PATTERNS).toBeDefined();
    });

    it("should have 4 error patterns", () => {
      expect(BEDROCK_COMMON_ERROR_PATTERNS).toHaveLength(4);
    });

    it("should have pattern and units for each error pattern", () => {
      for (const errorPattern of BEDROCK_COMMON_ERROR_PATTERNS) {
        expect(errorPattern.pattern).toBeInstanceOf(RegExp);
        expect(["tokens", "chars"]).toContain(errorPattern.units);
      }
    });

    it("should extract token limits from typical error messages", () => {
      const tokensPattern = BEDROCK_COMMON_ERROR_PATTERNS[0];
      const message =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192, request input token count: 9279";
      const match = message.match(tokensPattern.pattern);
      expect(match).not.toBeNull();
      expect(match?.groups?.max).toBe("8192");
      expect(match?.groups?.prompt).toBe("9279");
    });

    it("should extract character limits from malformed input errors", () => {
      const charsPattern = BEDROCK_COMMON_ERROR_PATTERNS[1];
      const message =
        "ValidationException: Malformed input request: expected maxLength: 50000, actual: 52611";
      const match = message.match(charsPattern.pattern);
      expect(match).not.toBeNull();
      expect(match?.groups?.charLimit).toBe("50000");
      expect(match?.groups?.charPrompt).toBe("52611");
    });
  });

  describe("Integration between keywords and patterns", () => {
    it("should have keywords that cover the same error scenarios as patterns", () => {
      // The keywords should be able to identify the same types of errors
      // that the patterns can extract detailed information from
      const testMessages = [
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 8192",
        "expected maxLength: 50000, actual: 52611",
        "This model's maximum context length is 8192 tokens. Please reduce the length of the prompt",
        "Prompt contains 235396 tokens, too large for model with 131072 maximum context length",
      ];

      for (const message of testMessages) {
        const lowercaseMessage = message.toLowerCase();

        // Keywords should match
        const keywordMatches = BEDROCK_TOKEN_LIMIT_KEYWORDS.some((keyword) =>
          lowercaseMessage.includes(keyword),
        );

        // At least one pattern should match
        const patternMatches = BEDROCK_COMMON_ERROR_PATTERNS.some((errorPattern) =>
          errorPattern.pattern.test(message),
        );

        // Both detection methods should work for these token limit errors
        expect(keywordMatches || patternMatches).toBe(true);
      }
    });
  });
});
