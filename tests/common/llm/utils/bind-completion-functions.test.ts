import "reflect-metadata";
import { describe, test, expect, jest } from "@jest/globals";
import { z } from "zod";
import { bindCompletionFunctions } from "../../../../src/common/llm/utils/completions-models-retriever";
import type { LLMFunction } from "../../../../src/common/llm/types/llm-function.types";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { LLMResponseStatus } from "../../../../src/common/llm/types/llm-response.types";

describe("bindCompletionFunctions", () => {
  const mockSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  const mockOptions = {
    outputFormat: LLMOutputFormat.JSON as const,
    jsonSchema: mockSchema,
  };

  const createMockLLMFunction = (): LLMFunction => {
    const mockFn = jest.fn().mockImplementation(async (content, context, _options) => ({
      status: LLMResponseStatus.COMPLETED,
      request: content,
      modelKey: "test-model",
      context,
      generated: { name: "test", value: 42 },
    }));
    return mockFn as unknown as LLMFunction;
  };

  test("should bind options to functions", async () => {
    const mockFn = createMockLLMFunction();
    const boundFunctions = bindCompletionFunctions([mockFn], mockOptions);

    expect(boundFunctions).toHaveLength(1);

    // Call the bound function
    const context = { resource: "test", purpose: LLMPurpose.COMPLETIONS };
    await boundFunctions[0]("test content", context);

    // Verify the original function was called with options
    expect(mockFn).toHaveBeenCalledWith("test content", context, mockOptions);
  });

  test("should create multiple bound functions from array", async () => {
    const mockFn1 = createMockLLMFunction();
    const mockFn2 = createMockLLMFunction();
    const boundFunctions = bindCompletionFunctions([mockFn1, mockFn2], mockOptions);

    expect(boundFunctions).toHaveLength(2);

    const context = { resource: "test", purpose: LLMPurpose.COMPLETIONS };

    await boundFunctions[0]("content1", context);
    await boundFunctions[1]("content2", context);

    expect(mockFn1).toHaveBeenCalledWith("content1", context, mockOptions);
    expect(mockFn2).toHaveBeenCalledWith("content2", context, mockOptions);
  });

  test("should assign debug names to bound functions", () => {
    const mockFn1 = createMockLLMFunction();
    const mockFn2 = createMockLLMFunction();
    const mockFn3 = createMockLLMFunction();

    const boundFunctions = bindCompletionFunctions([mockFn1, mockFn2, mockFn3], mockOptions);

    expect(boundFunctions[0].name).toBe("boundCompletion_0");
    expect(boundFunctions[1].name).toBe("boundCompletion_1");
    expect(boundFunctions[2].name).toBe("boundCompletion_2");
  });

  test("should return empty array when given empty array", () => {
    const boundFunctions = bindCompletionFunctions([], mockOptions);
    expect(boundFunctions).toHaveLength(0);
  });

  test("should preserve response type through binding", async () => {
    const mockFn = createMockLLMFunction();
    const boundFunctions = bindCompletionFunctions([mockFn], mockOptions);

    const context = { resource: "test", purpose: LLMPurpose.COMPLETIONS };
    const result = await boundFunctions[0]("test", context);

    expect(result.status).toBe(LLMResponseStatus.COMPLETED);
    expect(result.generated).toEqual({ name: "test", value: 42 });
  });

  test("should work with TEXT output format", async () => {
    const textOptions = {
      outputFormat: LLMOutputFormat.TEXT as const,
    };

    const mockFn = jest.fn().mockImplementation(async (content, context, _options) => ({
      status: LLMResponseStatus.COMPLETED,
      request: content,
      modelKey: "test-model",
      context,
      generated: "text response",
    })) as unknown as LLMFunction;

    const boundFunctions = bindCompletionFunctions([mockFn], textOptions);
    const context = { resource: "test", purpose: LLMPurpose.COMPLETIONS };
    const result = await boundFunctions[0]("test", context);

    expect(result.generated).toBe("text response");
    expect(mockFn).toHaveBeenCalledWith("test", context, textOptions);
  });

  test("should propagate errors from underlying function", async () => {
    const error = new Error("Test error");
    const mockFn: LLMFunction = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue(error) as unknown as LLMFunction;

    const boundFunctions = bindCompletionFunctions([mockFn], mockOptions);
    const context = { resource: "test", purpose: LLMPurpose.COMPLETIONS };

    await expect(boundFunctions[0]("test", context)).rejects.toThrow("Test error");
  });
});
