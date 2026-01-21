import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";

// Static imports from the barrel export
import {
  parseAndValidateLLMJson,
  JsonProcessingError,
  JsonProcessingErrorType,
  hasSignificantRepairs,
  REPAIR_STEP,
  REPAIR_STEP_TEMPLATE,
  INSIGNIFICANT_REPAIR_STEPS,
} from "../../../../src/common/llm/json-processing/index.js";

/**
 * Tests for the json-processing barrel export.
 * Verifies that all expected exports are accessible from the unified import point.
 */
describe("json-processing barrel export", () => {
  describe("primary API exports", () => {
    test("should export parseAndValidateLLMJson function", () => {
      expect(parseAndValidateLLMJson).toBeDefined();
      expect(typeof parseAndValidateLLMJson).toBe("function");
    });
  });

  describe("error type exports", () => {
    test("should export JsonProcessingError class", () => {
      expect(JsonProcessingError).toBeDefined();
      expect(typeof JsonProcessingError).toBe("function");
    });

    test("should export JsonProcessingErrorType enum", () => {
      expect(JsonProcessingErrorType).toBeDefined();
      expect(JsonProcessingErrorType.PARSE).toBe("parse");
      expect(JsonProcessingErrorType.VALIDATION).toBe("validation");
    });
  });

  describe("repair utility exports", () => {
    test("should export hasSignificantRepairs function", () => {
      expect(hasSignificantRepairs).toBeDefined();
      expect(typeof hasSignificantRepairs).toBe("function");
    });

    test("should export REPAIR_STEP constant", () => {
      expect(REPAIR_STEP).toBeDefined();
      expect(typeof REPAIR_STEP).toBe("object");
      // Verify some expected repair step constants
      expect(REPAIR_STEP.TRIMMED_WHITESPACE).toBe("Trimmed whitespace");
      expect(REPAIR_STEP.REMOVED_CODE_FENCES).toBe("Removed code fences");
    });

    test("should export REPAIR_STEP_TEMPLATE constant", () => {
      expect(REPAIR_STEP_TEMPLATE).toBeDefined();
      expect(typeof REPAIR_STEP_TEMPLATE.fixedConcatenationChains).toBe("function");
      expect(typeof REPAIR_STEP_TEMPLATE.addedMissingCommas).toBe("function");
    });

    test("should export INSIGNIFICANT_REPAIR_STEPS set", () => {
      expect(INSIGNIFICANT_REPAIR_STEPS).toBeDefined();
      expect(INSIGNIFICANT_REPAIR_STEPS instanceof Set).toBe(true);
      // Verify expected insignificant steps
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.TRIMMED_WHITESPACE)).toBe(true);
      expect(INSIGNIFICANT_REPAIR_STEPS.has(REPAIR_STEP.REMOVED_CODE_FENCES)).toBe(true);
    });
  });

  describe("integration with hasSignificantRepairs", () => {
    test("should work correctly with barrel-exported repair constants", () => {
      // Insignificant repairs only
      expect(
        hasSignificantRepairs([REPAIR_STEP.TRIMMED_WHITESPACE, REPAIR_STEP.REMOVED_CODE_FENCES]),
      ).toBe(false);

      // Mixed with significant repair
      expect(hasSignificantRepairs([REPAIR_STEP.TRIMMED_WHITESPACE, "Fixed trailing commas"])).toBe(
        true,
      );

      // Empty repairs
      expect(hasSignificantRepairs([])).toBe(false);
      expect(hasSignificantRepairs(undefined)).toBe(false);
    });
  });

  describe("JsonProcessingError usage", () => {
    test("should be able to construct and use JsonProcessingError", () => {
      const parseError = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test parse error",
        new Error("Underlying cause"),
      );

      expect(parseError).toBeInstanceOf(JsonProcessingError);
      expect(parseError.type).toBe(JsonProcessingErrorType.PARSE);
      expect(parseError.message).toBe("Test parse error");

      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        "Test validation error",
      );

      expect(validationError.type).toBe(JsonProcessingErrorType.VALIDATION);
    });
  });
});
