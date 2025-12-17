import { IErrorLogger } from "../../../../src/common/llm/tracking/llm-error-logger.interface";
import { LLMErrorLogger } from "../../../../src/common/llm/tracking/llm-error-logger";
import { LLMContext, LLMGeneratedContent } from "../../../../src/common/llm/types/llm.types";

/**
 * Tests for IErrorLogger interface implementation.
 * Verifies that the interface allows for flexible implementations and that
 * LLMErrorLogger correctly implements it.
 */
describe("IErrorLogger Interface", () => {
  describe("LLMErrorLogger implements IErrorLogger", () => {
    it("should satisfy IErrorLogger interface", () => {
      const logger = new LLMErrorLogger({
        errorLogDirectory: "test",
        errorLogFilenameTemplate: "test-{timestamp}.log",
      });

      // Type check: should be assignable to IErrorLogger
      const errorLogger: IErrorLogger = logger;
      expect(errorLogger).toBeDefined();
      expect(typeof errorLogger.recordJsonProcessingError).toBe("function");
    });
  });

  describe("Custom IErrorLogger implementation", () => {
    it("should allow custom implementations of IErrorLogger", () => {
      class CustomErrorLogger implements IErrorLogger {
        readonly errors: { error: unknown; content: LLMGeneratedContent; context: LLMContext }[] =
          [];

        async recordJsonProcessingError(
          error: unknown,
          responseContent: LLMGeneratedContent,
          context: LLMContext,
        ): Promise<void> {
          this.errors.push({ error, content: responseContent, context });
        }
      }

      const customLogger = new CustomErrorLogger();
      const errorLogger: IErrorLogger = customLogger;

      expect(errorLogger).toBeDefined();
      expect(typeof errorLogger.recordJsonProcessingError).toBe("function");
    });

    it("should work with custom error logger in practice", async () => {
      class MockErrorLogger implements IErrorLogger {
        readonly recordedErrors: unknown[] = [];

        async recordJsonProcessingError(
          error: unknown,
          _responseContent: LLMGeneratedContent,
          _context: LLMContext,
        ): Promise<void> {
          this.recordedErrors.push(error);
        }
      }

      const logger = new MockErrorLogger();
      const testError = new Error("Test JSON processing error");
      const testContext: LLMContext = {
        resource: "test-file.ts",
        purpose: "completions" as const,
      };

      await logger.recordJsonProcessingError(testError, '{"invalid": json}', testContext);

      expect(logger.recordedErrors).toHaveLength(1);
      expect(logger.recordedErrors[0]).toBe(testError);
    });
  });

  describe("IErrorLogger method signature", () => {
    it("should accept all required parameters", async () => {
      const mockLogger: IErrorLogger = {
        recordJsonProcessingError: jest.fn().mockResolvedValue(undefined),
      };

      const error = new Error("Test error");
      const content = '{"test": "data"}';
      const context: LLMContext = {
        resource: "test.ts",
        purpose: "completions" as const,
        modelQuality: "primary" as const,
      };

      await mockLogger.recordJsonProcessingError(error, content, context);

      expect(mockLogger.recordJsonProcessingError).toHaveBeenCalledWith(error, content, context);
    });

    it("should handle different content types", async () => {
      const mockLogger: IErrorLogger = {
        recordJsonProcessingError: jest.fn().mockResolvedValue(undefined),
      };

      const error = new Error("Test error");
      const context: LLMContext = {
        resource: "test.ts",
        purpose: "completions" as const,
      };

      // Test with string content
      await mockLogger.recordJsonProcessingError(error, "string content", context);

      // Test with null content
      await mockLogger.recordJsonProcessingError(error, null, context);

      // Test with object content
      await mockLogger.recordJsonProcessingError(error, { test: "object" }, context);

      // Test with array content
      await mockLogger.recordJsonProcessingError(error, [1, 2, 3], context);

      expect(mockLogger.recordJsonProcessingError).toHaveBeenCalledTimes(4);
    });
  });
});
