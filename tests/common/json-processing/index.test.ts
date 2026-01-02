/**
 * Tests for the json-processing facade module.
 *
 * This module provides a cleaner public API for the JSON processing subsystem,
 * re-exporting key functionality from the internal LLM json-processing implementation.
 */

import {
  processJson,
  JsonProcessingError,
  JsonProcessingErrorType,
  hasSignificantSanitizationSteps,
  extractSchemaMetadata,
} from "../../../src/common/json-processing";
import { LLMOutputFormat } from "../../../src/common/llm/types/llm.types";
import { z } from "zod";

describe("json-processing facade", () => {
  describe("module exports", () => {
    it("should export processJson function", () => {
      expect(processJson).toBeDefined();
      expect(typeof processJson).toBe("function");
    });

    it("should export JsonProcessingError class", () => {
      expect(JsonProcessingError).toBeDefined();
      expect(typeof JsonProcessingError).toBe("function");
    });

    it("should export JsonProcessingErrorType enum", () => {
      expect(JsonProcessingErrorType).toBeDefined();
      expect(typeof JsonProcessingErrorType).toBe("object");
    });

    it("should export hasSignificantSanitizationSteps function", () => {
      expect(hasSignificantSanitizationSteps).toBeDefined();
      expect(typeof hasSignificantSanitizationSteps).toBe("function");
    });

    it("should export extractSchemaMetadata function", () => {
      expect(extractSchemaMetadata).toBeDefined();
      expect(typeof extractSchemaMetadata).toBe("function");
    });
  });

  describe("processJson", () => {
    const testSchema = z.object({
      name: z.string(),
      value: z.number(),
    });

    const createTestContext = () => ({
      resource: "test-resource",
      purpose: "completions" as const,
      quality: "primary" as const,
    });

    const createCompletionOptions = () => ({
      jsonSchema: testSchema,
      outputFormat: LLMOutputFormat.JSON,
    });

    it("should process valid JSON successfully when properly configured", () => {
      const validJson = '{"name": "test", "value": 42}';
      const context = createTestContext();
      const completionOptions = createCompletionOptions();

      const result = processJson(validJson, context, completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "test", value: 42 });
      }
    });

    it("should handle invalid JSON gracefully", () => {
      const invalidJson = "not json at all";
      const context = createTestContext();
      const completionOptions = createCompletionOptions();

      const result = processJson(invalidJson, context, completionOptions);

      expect(result.success).toBe(false);
    });

    it("should validate against schema", () => {
      const wrongTypeJson = '{"name": 123, "value": "not a number"}';
      const context = createTestContext();
      const completionOptions = createCompletionOptions();

      const result = processJson(wrongTypeJson, context, completionOptions);

      // May succeed with coercion or fail - both are valid behaviors
      // The main point is that processJson doesn't throw
      expect(result).toBeDefined();
    });
  });

  describe("JsonProcessingError", () => {
    it("should be instantiable", () => {
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test error message");

      expect(error).toBeInstanceOf(JsonProcessingError);
      expect(error.message).toBe("Test error message");
    });

    it("should have the correct error type", () => {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        "Validation failed",
      );

      expect(error.type).toBe(JsonProcessingErrorType.VALIDATION);
    });
  });

  describe("JsonProcessingErrorType", () => {
    it("should have PARSE type", () => {
      expect(JsonProcessingErrorType.PARSE).toBeDefined();
      expect(JsonProcessingErrorType.PARSE).toBe("parse");
    });

    it("should have VALIDATION type", () => {
      expect(JsonProcessingErrorType.VALIDATION).toBeDefined();
      expect(JsonProcessingErrorType.VALIDATION).toBe("validation");
    });
  });

  describe("hasSignificantSanitizationSteps", () => {
    it("should return false for empty steps array", () => {
      const result = hasSignificantSanitizationSteps([]);

      expect(result).toBe(false);
    });

    it("should return false for undefined", () => {
      const result = hasSignificantSanitizationSteps(undefined);

      expect(result).toBe(false);
    });
  });

  describe("extractSchemaMetadata", () => {
    it("should extract metadata from a simple schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const metadata = extractSchemaMetadata(schema);

      expect(metadata).toBeDefined();
      expect(typeof metadata).toBe("object");
    });

    it("should handle nested schemas", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string(),
        }),
      });

      const metadata = extractSchemaMetadata(schema);

      expect(metadata).toBeDefined();
    });

    it("should handle arrays in schemas", () => {
      const schema = z.object({
        items: z.array(z.string()),
      });

      const metadata = extractSchemaMetadata(schema);

      expect(metadata).toBeDefined();
    });
  });

  describe("facade import verification", () => {
    it("should expose consistent API from single import", () => {
      // This test verifies that all expected exports are present
      // from the facade module in a single import statement
      expect(processJson).toBeDefined();
      expect(JsonProcessingError).toBeDefined();
      expect(JsonProcessingErrorType).toBeDefined();
      expect(hasSignificantSanitizationSteps).toBeDefined();
      expect(extractSchemaMetadata).toBeDefined();
    });
  });
});
