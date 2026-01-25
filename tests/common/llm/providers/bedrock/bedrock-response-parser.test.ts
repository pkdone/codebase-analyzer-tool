import {
  extractTextCompletionResponse,
  extractEmbeddingResponse,
} from "../../../../../src/common/llm/providers/bedrock/common/bedrock-response-parser";
import { z } from "zod";
import { LLMError, LLMErrorCode } from "../../../../../src/common/llm/types/llm-errors.types";

// Minimal schema for tests
const schema = z
  .object({
    content: z.array(z.object({ text: z.string() })).optional(),
    stop_reason: z.string().optional(),
    usage: z
      .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
      .optional(),
  })
  .passthrough();

describe("bedrock-response-parser", () => {
  it("extracts response content and stop reason using primary paths", () => {
    const response = {
      content: [{ text: "hello world" }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 2 },
    };

    const summary = extractTextCompletionResponse(
      response,
      schema,
      {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "max_tokens",
        alternativeContentPath: "alt.content",
        alternativeStopReasonPath: "finish_reason",
      },
      "TestProvider",
    );

    expect(summary.responseContent).toBe("hello world");
    expect(summary.isIncompleteResponse).toBe(false);
    expect(summary.tokenUsage.promptTokens).toBe(1);
  });

  it("uses fallback content path when primary absent", () => {
    const response = {
      // Intentionally omit 'content' to force fallback usage
      alt: { content: [{ text: "secondary" }] },
      stop_reason: "end_turn",
      usage: { input_tokens: 3, output_tokens: 4 },
    } as any; // alt path not part of schema but allowed via unknown properties

    const summary = extractTextCompletionResponse(
      response,
      schema,
      {
        contentPath: "content[0].text",
        alternativeContentPath: "alt.content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "length",
      },
      "TestProvider",
    );

    expect(summary.responseContent).toBe("secondary");
  });

  it("flags incomplete response when content empty", () => {
    const response = {
      stop_reason: "end_turn",
      usage: { input_tokens: 5, output_tokens: 6 },
    };

    const summary = extractTextCompletionResponse(
      response,
      schema,
      {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "end_turn",
      },
      "TestProvider",
    );

    expect(summary.isIncompleteResponse).toBe(true);
  });

  it("throws for invalid structure", () => {
    const badResponse = { content: "wrong" };
    const errorFn = () =>
      extractTextCompletionResponse(
        badResponse,
        schema,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "x",
        },
        "TestProvider",
      );
    expect(errorFn).toThrow(LLMError);
    try {
      errorFn();
      fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      expect((error as LLMError).code).toBe(LLMErrorCode.BAD_RESPONSE_CONTENT);
    }
  });

  it("safely handles undefined content - converts to null", () => {
    const response = {
      // content field completely missing
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 2 },
    };

    const summary = extractTextCompletionResponse(
      response,
      schema,
      {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "max_tokens",
      },
      "TestProvider",
    );

    // Should convert undefined to null (to match LLMGeneratedContent type)
    expect(summary.responseContent).toBeNull();
    expect(summary.isIncompleteResponse).toBe(true);
  });

  it("preserves null content values from LLM", () => {
    // Create a schema that allows null for text field
    const schemaWithNull = z
      .object({
        content: z.array(z.object({ text: z.string().nullable() })).optional(),
        stop_reason: z.string().optional(),
        usage: z
          .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
          .optional(),
      })
      .passthrough();

    const response = {
      content: [{ text: null }],
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 2 },
    };

    const summary = extractTextCompletionResponse(
      response,
      schemaWithNull,
      {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "max_tokens",
      },
      "TestProvider",
    );

    // Should preserve null (null has different semantic meaning than empty string)
    expect(summary.responseContent).toBeNull();
    expect(summary.isIncompleteResponse).toBe(true);
  });

  it("safely handles undefined token counts using type guard", () => {
    const response = {
      content: [{ text: "hello" }],
      stop_reason: "end_turn",
      // usage field completely missing
    };

    const summary = extractTextCompletionResponse(
      response,
      schema,
      {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "max_tokens",
      },
      "TestProvider",
    );

    // Type guards should convert undefined to -1
    expect(summary.tokenUsage.promptTokens).toBe(-1);
    expect(summary.tokenUsage.completionTokens).toBe(-1);
  });

  it("safely handles undefined stop reason using type guard", () => {
    const response = {
      content: [{ text: "hello" }],
      // stop_reason field completely missing
      usage: { input_tokens: 1, output_tokens: 2 },
    };

    const summary = extractTextCompletionResponse(
      response,
      schema,
      {
        contentPath: "content[0].text",
        promptTokensPath: "usage.input_tokens",
        completionTokensPath: "usage.output_tokens",
        stopReasonPath: "stop_reason",
        stopReasonValueForLength: "max_tokens",
      },
      "TestProvider",
    );

    // Type guard should convert undefined to empty string, making response not incomplete
    expect(summary.isIncompleteResponse).toBe(false);
  });

  describe("nullish coalescing for token counts", () => {
    it("should use number token values when provided", () => {
      const response = {
        content: [{ text: "hello" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 42, output_tokens: 24 },
      };

      const summary = extractTextCompletionResponse(
        response,
        schema,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "max_tokens",
        },
        "TestProvider",
      );

      expect(summary.tokenUsage.promptTokens).toBe(42);
      expect(summary.tokenUsage.completionTokens).toBe(24);
    });

    it("should default to -1 when token values are null", () => {
      const schemaWithNull = z
        .object({
          content: z.array(z.object({ text: z.string() })).optional(),
          stop_reason: z.string().optional(),
          usage: z
            .object({
              input_tokens: z.number().nullable().optional(),
              output_tokens: z.number().nullable().optional(),
            })
            .optional(),
        })
        .passthrough();

      const response = {
        content: [{ text: "hello" }],
        stop_reason: "end_turn",
        usage: { input_tokens: null, output_tokens: null },
      };

      const summary = extractTextCompletionResponse(
        response,
        schemaWithNull,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "max_tokens",
        },
        "TestProvider",
      );

      expect(summary.tokenUsage.promptTokens).toBe(-1);
      expect(summary.tokenUsage.completionTokens).toBe(-1);
    });

    it("should default to -1 when token values are other types", () => {
      const schemaWithString = z
        .object({
          content: z.array(z.object({ text: z.string() })).optional(),
          stop_reason: z.string().optional(),
          usage: z
            .object({
              input_tokens: z.union([z.number(), z.string()]).optional(),
              output_tokens: z.union([z.number(), z.string()]).optional(),
            })
            .optional(),
        })
        .passthrough();

      const response = {
        content: [{ text: "hello" }],
        stop_reason: "end_turn",
        usage: { input_tokens: "not a number", output_tokens: "also not a number" },
      };

      const summary = extractTextCompletionResponse(
        response,
        schemaWithString,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "max_tokens",
        },
        "TestProvider",
      );

      expect(summary.tokenUsage.promptTokens).toBe(-1);
      expect(summary.tokenUsage.completionTokens).toBe(-1);
    });
  });

  describe("extractEmbeddingResponse", () => {
    it("extracts embedding vector from valid response", () => {
      const response = {
        embedding: [0.1, 0.2, 0.3, 0.4],
        inputTextTokenCount: 10,
      };

      const result = extractEmbeddingResponse(response);

      expect(result.responseContent).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(result.isIncompleteResponse).toBe(false);
      expect(result.tokenUsage.promptTokens).toBe(10);
    });

    it("returns empty array when embedding is missing", () => {
      const response = {
        inputTextTokenCount: 5,
      };

      const result = extractEmbeddingResponse(response);

      expect(result.responseContent).toEqual([]);
      expect(result.isIncompleteResponse).toBe(true);
    });

    it("extracts token count from results array when available", () => {
      const response = {
        embedding: [0.5, 0.6],
        inputTextTokenCount: 8,
        results: [{ tokenCount: 15 }],
      };

      const result = extractEmbeddingResponse(response);

      expect(result.tokenUsage.promptTokens).toBe(8);
      expect(result.tokenUsage.completionTokens).toBe(15);
    });

    it("handles missing token counts gracefully", () => {
      const response = {
        embedding: [0.1, 0.2],
      };

      const result = extractEmbeddingResponse(response);

      expect(result.responseContent).toEqual([0.1, 0.2]);
      expect(result.tokenUsage.promptTokens).toBe(-1);
      expect(result.tokenUsage.completionTokens).toBe(-1);
    });

    it("throws LLMError for invalid response structure", () => {
      const invalidResponse = {
        embedding: "not an array",
      };

      expect(() => extractEmbeddingResponse(invalidResponse)).toThrow(LLMError);

      try {
        extractEmbeddingResponse(invalidResponse);
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_RESPONSE_CONTENT);
        expect((error as LLMError).message).toContain("Invalid Bedrock embeddings response");
      }
    });

    it("handles empty embedding array", () => {
      const response = {
        embedding: [],
        inputTextTokenCount: 1,
      };

      const result = extractEmbeddingResponse(response);

      expect(result.responseContent).toEqual([]);
      expect(result.isIncompleteResponse).toBe(true);
    });

    it("handles response with only results array", () => {
      const response = {
        embedding: [1.0, 2.0, 3.0],
        results: [{ tokenCount: 100 }],
      };

      const result = extractEmbeddingResponse(response);

      expect(result.responseContent).toEqual([1.0, 2.0, 3.0]);
      expect(result.tokenUsage.completionTokens).toBe(100);
    });
  });

  describe("responseContent type guard validation", () => {
    /**
     * These tests verify that the type guard in extractTextCompletionResponse
     * properly validates that extracted content is JSON-serializable before assignment.
     */

    it("should accept nested object content as valid LLMGeneratedContent", () => {
      // Schema that allows any type for the text field (to simulate edge cases)
      const flexibleSchema = z
        .object({
          content: z.array(z.object({ text: z.any() })).optional(),
          stop_reason: z.string().optional(),
          usage: z
            .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
            .optional(),
        })
        .passthrough();

      const response = {
        content: [{ text: { nested: "object", with: ["array", "values"] } }],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 2 },
      };

      const summary = extractTextCompletionResponse(
        response,
        flexibleSchema,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "max_tokens",
        },
        "TestProvider",
      );

      // Objects are valid LLMGeneratedContent (JSON-serializable)
      expect(summary.responseContent).toEqual({ nested: "object", with: ["array", "values"] });
      expect(summary.isIncompleteResponse).toBe(false);
    });

    it("should accept array content as valid LLMGeneratedContent", () => {
      const flexibleSchema = z
        .object({
          content: z.array(z.object({ text: z.any() })).optional(),
          stop_reason: z.string().optional(),
          usage: z
            .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
            .optional(),
        })
        .passthrough();

      const response = {
        content: [{ text: ["item1", "item2", "item3"] }],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 2 },
      };

      const summary = extractTextCompletionResponse(
        response,
        flexibleSchema,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "max_tokens",
        },
        "TestProvider",
      );

      // Arrays are valid LLMGeneratedContent (JSON-serializable)
      expect(summary.responseContent).toEqual(["item1", "item2", "item3"]);
      expect(summary.isIncompleteResponse).toBe(false);
    });

    it("should convert numeric content to string when extracted directly", () => {
      const flexibleSchema = z
        .object({
          content: z.array(z.object({ text: z.any() })).optional(),
          stop_reason: z.string().optional(),
          usage: z
            .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
            .optional(),
        })
        .passthrough();

      const response = {
        content: [{ text: 42 }], // Numeric value (edge case)
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 2 },
      };

      const summary = extractTextCompletionResponse(
        response,
        flexibleSchema,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "max_tokens",
        },
        "TestProvider",
      );

      // Numbers are not directly valid as LLMGeneratedContent (string | object | array | null)
      // The type guard should convert to string for safety
      expect(summary.responseContent).toBe("42");
    });

    it("should convert boolean content to string when extracted directly", () => {
      const flexibleSchema = z
        .object({
          content: z.array(z.object({ text: z.any() })).optional(),
          stop_reason: z.string().optional(),
          usage: z
            .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
            .optional(),
        })
        .passthrough();

      const response = {
        content: [{ text: true }], // Boolean value (edge case)
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 2 },
      };

      const summary = extractTextCompletionResponse(
        response,
        flexibleSchema,
        {
          contentPath: "content[0].text",
          promptTokensPath: "usage.input_tokens",
          completionTokensPath: "usage.output_tokens",
          stopReasonPath: "stop_reason",
          stopReasonValueForLength: "max_tokens",
        },
        "TestProvider",
      );

      // Booleans are not directly valid as LLMGeneratedContent
      // The type guard should convert to string for safety
      expect(summary.responseContent).toBe("true");
    });
  });
});
