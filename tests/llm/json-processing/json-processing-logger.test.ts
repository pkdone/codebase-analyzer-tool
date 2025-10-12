import { JsonProcessingLogger } from "../../../src/llm/json-processing/core/json-processing-logger";
import { SANITIZATION_STEP } from "../../../src/llm/json-processing/sanitizers";
import { logWarningMsg, logErrorMsg } from "../../../src/common/utils/logging";

// Mock the logging utilities
jest.mock("../../../src/common/utils/logging", () => ({
  logWarningMsg: jest.fn(),
  logErrorMsg: jest.fn(),
}));

describe("JsonProcessingLogger", () => {
  let logger: JsonProcessingLogger;
  const resourceName = "TestResource";

  beforeEach(() => {
    logger = new JsonProcessingLogger(resourceName);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create a logger with the given resource name", () => {
      expect(logger.resource).toBe(resourceName);
    });
  });

  describe("logSanitizationStep", () => {
    it("should log a single sanitization step with resource name", () => {
      const step = SANITIZATION_STEP.REMOVED_CODE_FENCES;
      logger.logSanitizationStep(step);

      expect(logWarningMsg).toHaveBeenCalledTimes(1);
      expect(logWarningMsg).toHaveBeenCalledWith(
        `[${resourceName}] JSON sanitization step: ${step}`,
      );
    });

    it("should handle empty step description", () => {
      logger.logSanitizationStep("");

      expect(logWarningMsg).toHaveBeenCalledWith(`[${resourceName}] JSON sanitization step: `);
    });

    it("should handle complex step descriptions", () => {
      const step = "Fixed 5 concatenation chains with nested identifiers";
      logger.logSanitizationStep(step);

      expect(logWarningMsg).toHaveBeenCalledWith(
        `[${resourceName}] JSON sanitization step: ${step}`,
      );
    });
  });

  describe("logSanitizationSummary", () => {
    it("should log summary with multiple steps", () => {
      const steps = [
        SANITIZATION_STEP.REMOVED_CODE_FENCES,
        "Fixed commas",
        SANITIZATION_STEP.TRIMMED_WHITESPACE,
      ];
      logger.logSanitizationSummary(steps);

      expect(logWarningMsg).toHaveBeenCalledTimes(1);
      expect(logWarningMsg).toHaveBeenCalledWith(
        `[${resourceName}] Applied 3 sanitization steps: ${steps.join(" -> ")}`,
      );
    });

    it("should log summary with single step", () => {
      const steps = [SANITIZATION_STEP.REMOVED_CODE_FENCES];
      logger.logSanitizationSummary(steps);

      expect(logWarningMsg).toHaveBeenCalledWith(
        `[${resourceName}] Applied 1 sanitization steps: Removed code fences`,
      );
    });

    it("should not log anything for empty steps array", () => {
      logger.logSanitizationSummary([]);

      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("should handle readonly array of steps", () => {
      const steps: readonly string[] = ["Step 1", "Step 2"] as const;
      logger.logSanitizationSummary(steps);

      expect(logWarningMsg).toHaveBeenCalledWith(
        `[${resourceName}] Applied 2 sanitization steps: Step 1 -> Step 2`,
      );
    });

    it("should format arrow separators correctly", () => {
      const steps = ["A", "B", "C", "D"];
      logger.logSanitizationSummary(steps);

      expect(logWarningMsg).toHaveBeenCalledWith(
        `[${resourceName}] Applied 4 sanitization steps: A -> B -> C -> D`,
      );
    });
  });

  describe("logValidationIssues", () => {
    it("should log validation issues with resource name", () => {
      const issues = "Expected string, received number";
      logger.logValidationIssues(issues);

      expect(logErrorMsg).toHaveBeenCalledTimes(1);
      expect(logErrorMsg).toHaveBeenCalledWith(
        `[${resourceName}] Schema validation failed. Validation issues: ${issues}`,
      );
    });

    it("should handle JSON stringified issues", () => {
      const issues = JSON.stringify([{ path: ["name"], message: "Required" }]);
      logger.logValidationIssues(issues);

      expect(logErrorMsg).toHaveBeenCalledWith(
        `[${resourceName}] Schema validation failed. Validation issues: ${issues}`,
      );
    });

    it("should handle empty issues string", () => {
      logger.logValidationIssues("");

      expect(logErrorMsg).toHaveBeenCalledWith(
        `[${resourceName}] Schema validation failed. Validation issues: `,
      );
    });
  });

  describe("logTextFormatValidationError", () => {
    it("should log text format validation error", () => {
      logger.logTextFormatValidationError();

      expect(logErrorMsg).toHaveBeenCalledTimes(1);
      expect(logErrorMsg).toHaveBeenCalledWith(
        `[${resourceName}] Content for TEXT format is not valid LLMGeneratedContent`,
      );
    });
  });

  describe("logContentValidationError", () => {
    it("should log content validation error", () => {
      logger.logContentValidationError();

      expect(logErrorMsg).toHaveBeenCalledTimes(1);
      expect(logErrorMsg).toHaveBeenCalledWith(
        `[${resourceName}] Content is not valid LLMGeneratedContent`,
      );
    });
  });

  describe("resource getter", () => {
    it("should return the resource name", () => {
      expect(logger.resource).toBe(resourceName);
    });

    it("should return immutable resource name", () => {
      const name = logger.resource;
      expect(name).toBe(resourceName);
      // Verify it's the same on multiple accesses
      expect(logger.resource).toBe(name);
    });
  });

  describe("multiple logger instances", () => {
    it("should maintain separate contexts for different resources", () => {
      const logger1 = new JsonProcessingLogger("Resource1");
      const logger2 = new JsonProcessingLogger("Resource2");

      logger1.logSanitizationStep("Step A");
      logger2.logSanitizationStep("Step B");

      expect(logWarningMsg).toHaveBeenCalledTimes(2);
      expect(logWarningMsg).toHaveBeenNthCalledWith(
        1,
        "[Resource1] JSON sanitization step: Step A",
      );
      expect(logWarningMsg).toHaveBeenNthCalledWith(
        2,
        "[Resource2] JSON sanitization step: Step B",
      );
    });

    it("should handle special characters in resource names", () => {
      const specialLogger = new JsonProcessingLogger("User:Profile@123");
      specialLogger.logSanitizationSummary(["test"]);

      expect(logWarningMsg).toHaveBeenCalledWith(
        "[User:Profile@123] Applied 1 sanitization steps: test",
      );
    });
  });
});
