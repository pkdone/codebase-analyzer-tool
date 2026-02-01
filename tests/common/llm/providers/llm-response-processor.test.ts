import { z } from "zod";
import {
  LLMResponseProcessor,
  ResponseBase,
  LLMResponseProcessorDeps,
} from "../../../../src/common/llm/providers/llm-response-processor";
import { LLMPurpose, LLMOutputFormat } from "../../../../src/common/llm/types/llm-request.types";
import type { ResolvedLLMModelMetadata } from "../../../../src/common/llm/types/llm-model.types";
import {
  LLMResponseStatus,
  isCompletedResponse,
  isErrorResponse,
} from "../../../../src/common/llm/types/llm-response.types";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import { LLMErrorLogger } from "../../../../src/common/llm/tracking/llm-error-logger";
import { createMockErrorLoggingConfig } from "../../helpers/llm/mock-error-logger";

// Test constants
const TEST_MODEL_KEY = "test-model";

// Test models metadata
const testModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [TEST_MODEL_KEY]: {
    modelKey: TEST_MODEL_KEY,
    urnEnvKey: "TEST_MODEL_URN",
    urn: "test-provider/test-model-v1",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
};

/**
 * Creates a mock LLMErrorLogger for testing.
 * Uses a spy to track method calls without actual file I/O.
 *
 * @returns Object containing the logger and its spy for assertions
 */
function createMockErrorLogger(): {
  logger: LLMErrorLogger;
  recordJsonProcessingErrorSpy: jest.SpyInstance;
} {
  const logger = new LLMErrorLogger(createMockErrorLoggingConfig());
  // Spy on the method to prevent actual file writes and track calls
  const recordJsonProcessingErrorSpy = jest
    .spyOn(logger, "recordJsonProcessingError")
    .mockResolvedValue(undefined);
  return { logger, recordJsonProcessingErrorSpy };
}

/** Test dependencies including the spy for assertions */
interface TestDeps {
  deps: LLMResponseProcessorDeps;
  recordJsonProcessingErrorSpy: jest.SpyInstance;
}

/**
 * Creates test dependencies for the LLMResponseProcessor.
 */
function createTestDeps(overrides?: Partial<LLMResponseProcessorDeps>): TestDeps {
  const { logger, recordJsonProcessingErrorSpy } = createMockErrorLogger();
  const deps: LLMResponseProcessorDeps = {
    errorLogger: logger,
    llmModelsMetadata: testModelsMetadata,
    ...overrides,
  };
  return { deps, recordJsonProcessingErrorSpy };
}

/**
 * Creates a standard response base for testing.
 */
function createResponseBase(overrides?: Partial<ResponseBase>): ResponseBase {
  return {
    request: "test prompt",
    context: {
      resource: "test-resource",
      purpose: LLMPurpose.COMPLETIONS,
    },
    modelKey: TEST_MODEL_KEY,
    ...overrides,
  };
}

describe("LLMResponseProcessor", () => {
  let processor: LLMResponseProcessor;
  let testDeps: TestDeps;

  beforeEach(() => {
    testDeps = createTestDeps();
    processor = new LLMResponseProcessor(testDeps.deps);
  });

  describe("formatAndValidateResponse", () => {
    describe("non-completion tasks (embeddings)", () => {
      it("should return completed response with raw content for embeddings", async () => {
        const embeddings = [0.1, 0.2, 0.3, 0.4, 0.5];
        const responseBase = createResponseBase();

        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.EMBEDDINGS,
          embeddings,
          { outputFormat: LLMOutputFormat.TEXT },
        );

        expect(result.status).toBe(LLMResponseStatus.COMPLETED);
        expect(isCompletedResponse(result)).toBe(true);
        if (isCompletedResponse(result)) {
          expect(result.generated).toEqual(embeddings);
        }
      });
    });

    describe("TEXT output format", () => {
      it("should return completed response for valid text content", async () => {
        const responseBase = createResponseBase();

        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.COMPLETIONS,
          "This is a valid text response",
          { outputFormat: LLMOutputFormat.TEXT },
        );

        expect(result.status).toBe(LLMResponseStatus.COMPLETED);
        expect(isCompletedResponse(result)).toBe(true);
        if (isCompletedResponse(result)) {
          expect(result.generated).toBe("This is a valid text response");
        }
      });

      it("should return INVALID status for empty text response", async () => {
        const responseBase = createResponseBase();

        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.COMPLETIONS,
          "   ",
          { outputFormat: LLMOutputFormat.TEXT },
        );

        expect(result.status).toBe(LLMResponseStatus.INVALID);
        expect(isErrorResponse(result)).toBe(true);
        if (isErrorResponse(result)) {
          expect(result.error).toBe("LLM returned empty TEXT response");
        }
      });

      it("should throw BAD_CONFIGURATION error when jsonSchema is provided with TEXT format", async () => {
        const responseBase = createResponseBase();
        const schema = z.object({ name: z.string() });

        // When TEXT format is used with a schema, the processor throws an error
        await expect(
          processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            "text response",
            { outputFormat: LLMOutputFormat.TEXT, jsonSchema: schema },
          ),
        ).rejects.toThrow(LLMError);

        try {
          await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            "text response",
            { outputFormat: LLMOutputFormat.TEXT, jsonSchema: schema },
          );
        } catch (error) {
          expect(error).toBeInstanceOf(LLMError);
          expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
          expect((error as LLMError).message).toContain(
            "jsonSchema was provided but outputFormat is TEXT",
          );
        }
      });

      it("should throw BAD_RESPONSE_CONTENT error when content is not a string for TEXT format", async () => {
        const responseBase = createResponseBase();

        await expect(
          processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            { notAString: true },
            { outputFormat: LLMOutputFormat.TEXT },
          ),
        ).rejects.toThrow(LLMError);

        try {
          await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            { notAString: true },
            { outputFormat: LLMOutputFormat.TEXT },
          );
        } catch (error) {
          expect(error).toBeInstanceOf(LLMError);
          expect((error as LLMError).code).toBe(LLMErrorCode.BAD_RESPONSE_CONTENT);
        }
      });
    });

    describe("JSON output format", () => {
      it("should return completed response for valid JSON matching schema", async () => {
        const responseBase = createResponseBase();
        const schema = z.object({
          name: z.string(),
          count: z.number(),
        });

        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.COMPLETIONS,
          '{"name": "test", "count": 42}',
          { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
        );

        expect(result.status).toBe(LLMResponseStatus.COMPLETED);
        expect(isCompletedResponse(result)).toBe(true);
        if (isCompletedResponse(result)) {
          expect(result.generated).toEqual({ name: "test", count: 42 });
        }
      });

      it("should throw BAD_CONFIGURATION error when no jsonSchema is provided for JSON format", async () => {
        const responseBase = createResponseBase();

        await expect(
          processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            '{"key": "value"}',
            { outputFormat: LLMOutputFormat.JSON },
          ),
        ).rejects.toThrow(LLMError);

        try {
          await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            '{"key": "value"}',
            { outputFormat: LLMOutputFormat.JSON },
          );
        } catch (error) {
          expect(error).toBeInstanceOf(LLMError);
          expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
          expect((error as LLMError).message).toContain(
            "JSON output requires a schema for type-safe validation",
          );
        }
      });

      it("should return INVALID status and log error for invalid JSON", async () => {
        const responseBase = createResponseBase();
        const schema = z.object({ name: z.string() });

        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.COMPLETIONS,
          "not valid json at all",
          { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
        );

        expect(result.status).toBe(LLMResponseStatus.INVALID);
        expect(isErrorResponse(result)).toBe(true);
        expect(testDeps.recordJsonProcessingErrorSpy).toHaveBeenCalled();
      });

      it("should return INVALID status for JSON that does not match schema", async () => {
        const responseBase = createResponseBase();
        const schema = z.object({
          name: z.string(),
          count: z.number(),
        });

        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.COMPLETIONS,
          '{"name": "test", "count": "not a number"}',
          { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
        );

        expect(result.status).toBe(LLMResponseStatus.INVALID);
        expect(isErrorResponse(result)).toBe(true);
      });

      it("should include repairs and pipelineSteps in successful JSON response", async () => {
        const responseBase = createResponseBase();
        const schema = z.object({ key: z.string() });

        // JSON with markdown code fence that needs sanitization
        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.COMPLETIONS,
          '```json\n{"key": "value"}\n```',
          { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
        );

        expect(result.status).toBe(LLMResponseStatus.COMPLETED);
        expect(isCompletedResponse(result)).toBe(true);
        if (isCompletedResponse(result)) {
          expect(result.repairs).toBeDefined();
          expect(Array.isArray(result.repairs)).toBe(true);
        }
      });

      it("should handle complex nested schemas", async () => {
        const responseBase = createResponseBase();
        const complexSchema = z.object({
          users: z.array(
            z.object({
              id: z.number(),
              profile: z.object({
                name: z.string(),
                email: z.string().optional(),
              }),
            }),
          ),
          metadata: z.object({
            total: z.number(),
          }),
        });

        const jsonContent = JSON.stringify({
          users: [
            { id: 1, profile: { name: "Alice", email: "alice@example.com" } },
            { id: 2, profile: { name: "Bob" } },
          ],
          metadata: { total: 2 },
        });

        const result = await processor.formatAndValidateResponse(
          responseBase,
          LLMPurpose.COMPLETIONS,
          jsonContent,
          { outputFormat: LLMOutputFormat.JSON, jsonSchema: complexSchema },
        );

        expect(result.status).toBe(LLMResponseStatus.COMPLETED);
        expect(isCompletedResponse(result)).toBe(true);
        if (isCompletedResponse(result)) {
          const data = result.generated;
          expect(data.users).toHaveLength(2);
          expect(data.users[0].profile.name).toBe("Alice");
          expect(data.metadata.total).toBe(2);
        }
      });

      describe("null content handling", () => {
        it("should return INVALID status for null response content", async () => {
          const responseBase = createResponseBase();
          const schema = z.object({ name: z.string() });

          const result = await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            null,
            { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
          );

          expect(result.status).toBe(LLMResponseStatus.INVALID);
          expect(isErrorResponse(result)).toBe(true);
          if (isErrorResponse(result)) {
            expect(result.error).toBe("LLM returned null response for JSON output format");
          }
        });
      });

      describe("pre-parsed object handling", () => {
        it("should validate pre-parsed object directly (bypassing string parsing)", async () => {
          const responseBase = createResponseBase();
          const schema = z.object({
            name: z.string(),
            count: z.number(),
          });

          // Pass a pre-parsed object instead of a JSON string
          const preParsedObject = { name: "test", count: 42 };

          const result = await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            preParsedObject,
            { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
          );

          expect(result.status).toBe(LLMResponseStatus.COMPLETED);
          expect(isCompletedResponse(result)).toBe(true);
          if (isCompletedResponse(result)) {
            expect(result.generated).toEqual({ name: "test", count: 42 });
            expect(result.pipelineSteps).toContain("Pre-parsed object (skipped string parsing)");
          }
        });

        it("should return INVALID status for pre-parsed object that fails schema validation", async () => {
          const responseBase = createResponseBase();
          const schema = z.object({
            name: z.string(),
            count: z.number(),
          });

          // Object with wrong type for 'count' field
          const invalidObject = { name: "test", count: "not a number" };

          const result = await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            invalidObject,
            { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
          );

          expect(result.status).toBe(LLMResponseStatus.INVALID);
          expect(isErrorResponse(result)).toBe(true);
        });

        it("should apply schema-fixing transforms to pre-parsed objects", async () => {
          const responseBase = createResponseBase();
          const schema = z.object({
            name: z.string(),
            groupId: z.string().optional(), // Does not allow null, only undefined
          });

          // Object with null value that will be transformed
          const objectWithNull = { name: "test", groupId: null };

          const result = await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            objectWithNull,
            { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
          );

          expect(result.status).toBe(LLMResponseStatus.COMPLETED);
          expect(isCompletedResponse(result)).toBe(true);
          if (isCompletedResponse(result)) {
            expect(result.generated.name).toBe("test");
            // null should have been converted to undefined
            expect("groupId" in result.generated).toBe(false);
            // Repairs should include the transform that was applied
            expect(result.repairs).toBeDefined();
          }
        });

        it("should handle pre-parsed array objects", async () => {
          const responseBase = createResponseBase();
          const schema = z.array(
            z.object({
              id: z.number(),
              name: z.string(),
            }),
          );

          const preParsedArray = [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
          ];

          const result = await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            preParsedArray,
            { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
          );

          expect(result.status).toBe(LLMResponseStatus.COMPLETED);
          expect(isCompletedResponse(result)).toBe(true);
          if (isCompletedResponse(result)) {
            expect(result.generated).toHaveLength(2);
            expect(result.generated[0].name).toBe("Alice");
          }
        });

        it("should handle complex nested pre-parsed objects", async () => {
          const responseBase = createResponseBase();
          const complexSchema = z.object({
            users: z.array(
              z.object({
                id: z.number(),
                profile: z.object({
                  name: z.string(),
                  email: z.string().optional(),
                }),
              }),
            ),
            metadata: z.object({
              total: z.number(),
            }),
          });

          const preParsedComplex = {
            users: [
              { id: 1, profile: { name: "Alice", email: "alice@example.com" } },
              { id: 2, profile: { name: "Bob" } },
            ],
            metadata: { total: 2 },
          };

          const result = await processor.formatAndValidateResponse(
            responseBase,
            LLMPurpose.COMPLETIONS,
            preParsedComplex,
            { outputFormat: LLMOutputFormat.JSON, jsonSchema: complexSchema },
          );

          expect(result.status).toBe(LLMResponseStatus.COMPLETED);
          expect(isCompletedResponse(result)).toBe(true);
          if (isCompletedResponse(result)) {
            expect(result.generated.users).toHaveLength(2);
            expect(result.generated.users[0].profile.name).toBe("Alice");
            expect(result.generated.metadata.total).toBe(2);
          }
        });
      });
    });
  });

  describe("validateTextResponse", () => {
    it("should return completed response for valid text", () => {
      const responseBase = createResponseBase();

      const result = processor.validateTextResponse(responseBase, "Valid text content", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      expect(isCompletedResponse(result)).toBe(true);
      if (isCompletedResponse(result)) {
        expect(result.generated).toBe("Valid text content");
      }
    });

    it("should return INVALID status for empty string", () => {
      const responseBase = createResponseBase();

      const result = processor.validateTextResponse(responseBase, "", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.INVALID);
    });

    it("should return INVALID status for whitespace-only string", () => {
      const responseBase = createResponseBase();

      const result = processor.validateTextResponse(responseBase, "   \n\t  ", {
        outputFormat: LLMOutputFormat.TEXT,
      });

      expect(result.status).toBe(LLMResponseStatus.INVALID);
    });

    it("should throw error when jsonSchema is provided", () => {
      const responseBase = createResponseBase();
      const schema = z.object({ name: z.string() });

      expect(() =>
        processor.validateTextResponse(responseBase, "text", {
          outputFormat: LLMOutputFormat.TEXT,
          jsonSchema: schema,
        }),
      ).toThrow(LLMError);
    });

    it("should throw BAD_RESPONSE_CONTENT error for non-string content", () => {
      const responseBase = createResponseBase();

      expect(() =>
        processor.validateTextResponse(
          responseBase,
          { notString: true },
          {
            outputFormat: LLMOutputFormat.TEXT,
          },
        ),
      ).toThrow(LLMError);

      try {
        processor.validateTextResponse(
          responseBase,
          { notString: true },
          {
            outputFormat: LLMOutputFormat.TEXT,
          },
        );
      } catch (error) {
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_RESPONSE_CONTENT);
      }
    });
  });

  describe("debugUnhandledError", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log Error instance with name, constructor, and details", () => {
      const error = new Error("Test error message");

      processor.debugUnhandledError(error, TEST_MODEL_KEY);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain("[DEBUG]");
      expect(logMessage).toContain("Error Name: Error");
      expect(logMessage).toContain("Constructor: Error");
      expect(logMessage).toContain("Test error message");
      expect(logMessage).toContain(testModelsMetadata[TEST_MODEL_KEY].urn);
    });

    it("should log custom Error subclass with correct constructor name", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }
      const error = new CustomError("Custom error message");

      processor.debugUnhandledError(error, TEST_MODEL_KEY);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain("Error Name: CustomError");
      expect(logMessage).toContain("Constructor: CustomError");
    });

    it("should log non-Error values with type information", () => {
      processor.debugUnhandledError("string error", TEST_MODEL_KEY);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain("[DEBUG]");
      expect(logMessage).toContain("Non-Error type: string");
      expect(logMessage).toContain(testModelsMetadata[TEST_MODEL_KEY].urn);
    });

    it("should log object errors with type information", () => {
      const errorObject = { code: "ERROR_CODE", message: "Something went wrong" };

      processor.debugUnhandledError(errorObject, TEST_MODEL_KEY);

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleSpy.mock.calls[0][0] as string;
      expect(logMessage).toContain("Non-Error type: object");
    });

    it("should log null and undefined errors", () => {
      processor.debugUnhandledError(null, TEST_MODEL_KEY);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain("Non-Error type: object");

      consoleSpy.mockClear();

      processor.debugUnhandledError(undefined, TEST_MODEL_KEY);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain("Non-Error type: undefined");
    });
  });

  describe("type inference", () => {
    it("should preserve schema type through JSON validation", async () => {
      const responseBase = createResponseBase();
      const schema = z.object({
        items: z.array(z.object({ id: z.number(), name: z.string() })),
      });

      const result = await processor.formatAndValidateResponse(
        responseBase,
        LLMPurpose.COMPLETIONS,
        '{"items": [{"id": 1, "name": "Item1"}, {"id": 2, "name": "Item2"}]}',
        { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
      );

      expect(result.status).toBe(LLMResponseStatus.COMPLETED);
      if (isCompletedResponse(result)) {
        // Type should be inferred from schema
        type ExpectedType = z.infer<typeof schema>;
        const data: ExpectedType = result.generated;
        expect(Array.isArray(data.items)).toBe(true);
        expect(data.items[0].id).toBe(1);
        expect(data.items[0].name).toBe("Item1");
      }
    });
  });

  describe("context propagation", () => {
    it("should use context from responseBase in error logging", async () => {
      const customContext = {
        resource: "custom-resource-path",
        purpose: LLMPurpose.COMPLETIONS,
      };
      const responseBase = createResponseBase({ context: customContext });
      const schema = z.object({ name: z.string() });

      await processor.formatAndValidateResponse(
        responseBase,
        LLMPurpose.COMPLETIONS,
        "invalid json",
        { outputFormat: LLMOutputFormat.JSON, jsonSchema: schema },
      );

      expect(testDeps.recordJsonProcessingErrorSpy).toHaveBeenCalledWith(
        expect.anything(),
        "invalid json",
        customContext,
      );
    });

    it("should preserve modelKey in response", async () => {
      const customModelKey = "custom-model";
      const customMetadata: Record<string, ResolvedLLMModelMetadata> = {
        [customModelKey]: {
          modelKey: customModelKey,
          urnEnvKey: "CUSTOM_MODEL_URN",
          urn: "custom-provider/custom-model",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 2048,
          maxTotalTokens: 16384,
        },
      };

      const customTestDeps = createTestDeps({ llmModelsMetadata: customMetadata });
      const customProcessor = new LLMResponseProcessor(customTestDeps.deps);

      const responseBase = createResponseBase({ modelKey: customModelKey });

      const result = await customProcessor.formatAndValidateResponse(
        responseBase,
        LLMPurpose.COMPLETIONS,
        "Valid text response",
        { outputFormat: LLMOutputFormat.TEXT },
      );

      expect(result.modelKey).toBe(customModelKey);
    });
  });
});
