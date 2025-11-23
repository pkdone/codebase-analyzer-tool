import { extractGenericCompletionResponse } from "../../../../src/llm/providers/bedrock/common/bedrock-response-parser";
import { z } from "zod";
import { BadResponseContentLLMError } from "../../../../src/llm/types/llm-errors.types";

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

    const summary = extractGenericCompletionResponse(
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

    const summary = extractGenericCompletionResponse(
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

    const summary = extractGenericCompletionResponse(
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
    expect(() =>
      extractGenericCompletionResponse(
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
      ),
    ).toThrow(BadResponseContentLLMError);
  });

  it("safely handles undefined content - converts to null", () => {
    const response = {
      // content field completely missing
      stop_reason: "end_turn",
      usage: { input_tokens: 1, output_tokens: 2 },
    };

    const summary = extractGenericCompletionResponse(
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

    const summary = extractGenericCompletionResponse(
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

    const summary = extractGenericCompletionResponse(
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

    const summary = extractGenericCompletionResponse(
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
});
