/**
 * Tests to verify barrel exports work correctly after refactoring.
 * Ensures all transforms are accessible through barrel exports.
 */

import {
  convertNullToUndefined,
  unwrapJsonSchemaStructure,
  fixCommonPropertyNameTypos,
  coerceStringToArray,
} from "../../../../src/llm/json-processing/transforms/generic/index.js";
import {
  normalizeDatabaseIntegrationArray,
  fixMissingRequiredFields,
} from "../../../../src/llm/json-processing/transforms/schema-specific/index.js";
import * as transforms from "../../../../src/llm/json-processing/transforms/index.js";

describe("Transform Barrel Exports", () => {
  describe("generic transforms barrel export", () => {
    it("should export convertNullToUndefined", () => {
      expect(typeof convertNullToUndefined).toBe("function");
    });

    it("should export unwrapJsonSchemaStructure", () => {
      expect(typeof unwrapJsonSchemaStructure).toBe("function");
    });

    it("should export fixCommonPropertyNameTypos", () => {
      expect(typeof fixCommonPropertyNameTypos).toBe("function");
    });

    it("should export coerceStringToArray", () => {
      expect(typeof coerceStringToArray).toBe("function");
    });
  });

  describe("schema-specific transforms barrel export", () => {
    it("should export normalizeDatabaseIntegrationArray", () => {
      expect(typeof normalizeDatabaseIntegrationArray).toBe("function");
    });

    it("should export fixMissingRequiredFields", () => {
      expect(typeof fixMissingRequiredFields).toBe("function");
    });
  });

  describe("main transforms barrel export", () => {
    it("should export all generic transforms", () => {
      expect(typeof transforms.convertNullToUndefined).toBe("function");
      expect(typeof transforms.unwrapJsonSchemaStructure).toBe("function");
      expect(typeof transforms.fixCommonPropertyNameTypos).toBe("function");
      expect(typeof transforms.coerceStringToArray).toBe("function");
    });

    it("should export all schema-specific transforms", () => {
      expect(typeof transforms.normalizeDatabaseIntegrationArray).toBe("function");
      expect(typeof transforms.fixMissingRequiredFields).toBe("function");
    });
  });

  describe("transform separation", () => {
    it("should have generic transforms isolated from schema-specific", () => {
      // Generic transforms should not have schema-specific knowledge
      const genericInput = { test: "value" };
      const result = unwrapJsonSchemaStructure(genericInput);
      expect(result).toBe(genericInput); // Should pass through unchanged

      // Schema-specific transforms should work on sourceSummarySchema structure
      const schemaInput = {
        publicMethods: [
          {
            name: "testMethod",
            parameters: [],
          },
        ],
      };
      const schemaResult = fixMissingRequiredFields(schemaInput);
      expect((schemaResult as any).publicMethods[0].returnType).toBe("void");
    });
  });
});
