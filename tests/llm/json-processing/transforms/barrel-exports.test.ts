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

  describe("main transforms barrel export", () => {
    it("should export all generic transforms", () => {
      expect(typeof transforms.convertNullToUndefined).toBe("function");
      expect(typeof transforms.unwrapJsonSchemaStructure).toBe("function");
      expect(typeof transforms.fixCommonPropertyNameTypos).toBe("function");
      expect(typeof transforms.coerceStringToArray).toBe("function");
    });
  });
});
