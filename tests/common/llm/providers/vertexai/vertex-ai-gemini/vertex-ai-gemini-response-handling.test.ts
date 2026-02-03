/**
 * Tests for VertexAI Gemini response handling edge cases.
 *
 * These tests verify the safe content access patterns used in VertexAIGeminiLLM
 * to handle edge cases where Vertex AI responses may have missing content/parts.
 */

describe("VertexAI Gemini Response Handling", () => {
  describe("Safe content access with optional chaining", () => {
    /**
     * Simulates the response extraction logic from VertexAIGeminiLLM.invokeCompletionLLM
     * to test safe content access patterns.
     */
    function extractResponseContent(
      llmResponse: { content?: { parts?: { text?: string }[] } } | undefined,
    ): string | null {
      // This mirrors the safe access pattern in vertex-ai-gemini-llm.ts
      const firstPart = llmResponse?.content?.parts?.[0];
      const responseContent = firstPart?.text ?? null;
      return responseContent;
    }

    it("should extract content from a valid response", () => {
      const response = {
        content: {
          parts: [{ text: "Hello, world!" }],
        },
      };

      const content = extractResponseContent(response);

      expect(content).toBe("Hello, world!");
    });

    it("should return null when response is undefined", () => {
      const content = extractResponseContent(undefined);

      expect(content).toBeNull();
    });

    it("should return null when content is missing", () => {
      const response = {} as { content?: { parts?: { text?: string }[] } };

      const content = extractResponseContent(response);

      expect(content).toBeNull();
    });

    it("should return null when parts array is missing", () => {
      const response = {
        content: {} as { parts?: { text?: string }[] },
      };

      const content = extractResponseContent(response);

      expect(content).toBeNull();
    });

    it("should return null when parts array is empty", () => {
      const response = {
        content: {
          parts: [],
        },
      };

      const content = extractResponseContent(response);

      expect(content).toBeNull();
    });

    it("should return null when first part has no text property", () => {
      const response = {
        content: {
          parts: [{}],
        },
      };

      const content = extractResponseContent(response);

      expect(content).toBeNull();
    });

    it("should return null when text is undefined", () => {
      const response = {
        content: {
          parts: [{ text: undefined }],
        },
      };

      const content = extractResponseContent(response);

      expect(content).toBeNull();
    });

    it("should return empty string when text is empty", () => {
      const response = {
        content: {
          parts: [{ text: "" }],
        },
      };

      const content = extractResponseContent(response);

      // Empty string is a valid text value
      expect(content).toBe("");
    });

    it("should handle response with multiple parts (extracting first)", () => {
      const response = {
        content: {
          parts: [{ text: "First part" }, { text: "Second part" }],
        },
      };

      const content = extractResponseContent(response);

      expect(content).toBe("First part");
    });
  });

  describe("isIncompleteResponse determination", () => {
    /**
     * Simulates the isIncompleteResponse logic from VertexAIGeminiLLM.invokeCompletionLLM
     */
    function determineIsIncomplete(
      finishReason: string,
      stopReason: string,
      responseContent: string | null,
    ): boolean {
      return finishReason !== stopReason || responseContent == null;
    }

    it("should be incomplete when content is null", () => {
      const isIncomplete = determineIsIncomplete("STOP", "STOP", null);

      expect(isIncomplete).toBe(true);
    });

    it("should be incomplete when finish reason is not STOP", () => {
      const isIncomplete = determineIsIncomplete("MAX_TOKENS", "STOP", "Some content");

      expect(isIncomplete).toBe(true);
    });

    it("should be complete when finish reason is STOP and content exists", () => {
      const isIncomplete = determineIsIncomplete("STOP", "STOP", "Valid content");

      expect(isIncomplete).toBe(false);
    });

    it("should be complete even with empty string content if finish reason is STOP", () => {
      const isIncomplete = determineIsIncomplete("STOP", "STOP", "");

      expect(isIncomplete).toBe(false);
    });
  });
});
