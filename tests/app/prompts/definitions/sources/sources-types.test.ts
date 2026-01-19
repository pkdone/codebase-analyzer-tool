/**
 * Tests for source prompt type definitions.
 *
 * These tests verify that the LanguageSpecificFragments interface is properly exported
 * and that all language-specific fragment objects conform to the interface.
 */
import type { LanguageSpecificFragments } from "../../../../../src/app/prompts/sources/sources.types";
import {
  JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC_FRAGMENTS,
  CSHARP_SPECIFIC_FRAGMENTS,
  PYTHON_SPECIFIC_FRAGMENTS,
  RUBY_SPECIFIC_FRAGMENTS,
  C_SPECIFIC_FRAGMENTS,
  CPP_SPECIFIC_FRAGMENTS,
} from "../../../../../src/app/prompts/sources/fragments";

describe("LanguageSpecificFragments type", () => {
  describe("Type export availability", () => {
    it("should be importable from sources.types.ts", () => {
      // This test verifies that the type can be imported
      // The type assertion below will fail at compile time if the type is not exported
      const testFragment: LanguageSpecificFragments = {
        INTERNAL_REFS: "test",
        EXTERNAL_REFS: "test",
        PUBLIC_CONSTANTS: "test",
        PUBLIC_FUNCTIONS: "test",
        INTEGRATION_INSTRUCTIONS: "test",
        DB_MECHANISM_MAPPING: "test",
      };
      expect(testFragment.INTERNAL_REFS).toBe("test");
    });
  });

  describe("Required fields validation", () => {
    const requiredFields: (keyof LanguageSpecificFragments)[] = [
      "INTERNAL_REFS",
      "EXTERNAL_REFS",
      "PUBLIC_CONSTANTS",
      "INTEGRATION_INSTRUCTIONS",
      "DB_MECHANISM_MAPPING",
    ];

    it.each([
      ["JAVA", JAVA_SPECIFIC_FRAGMENTS],
      ["JAVASCRIPT", JAVASCRIPT_SPECIFIC_FRAGMENTS],
      ["CSHARP", CSHARP_SPECIFIC_FRAGMENTS],
      ["PYTHON", PYTHON_SPECIFIC_FRAGMENTS],
      ["RUBY", RUBY_SPECIFIC_FRAGMENTS],
      ["C", C_SPECIFIC_FRAGMENTS],
      ["CPP", CPP_SPECIFIC_FRAGMENTS],
    ] as const)("%s_SPECIFIC_FRAGMENTS should have all required fields", (_, fragments) => {
      requiredFields.forEach((field) => {
        const value = fragments[field];
        expect(value).toBeDefined();
        expect(typeof value).toBe("string");
        expect(value!.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Optional fields validation", () => {
    it("should have either PUBLIC_FUNCTIONS or PUBLIC_METHODS for each language", () => {
      const languageFragments = [
        { name: "JAVA", fragments: JAVA_SPECIFIC_FRAGMENTS },
        { name: "JAVASCRIPT", fragments: JAVASCRIPT_SPECIFIC_FRAGMENTS },
        { name: "CSHARP", fragments: CSHARP_SPECIFIC_FRAGMENTS },
        { name: "PYTHON", fragments: PYTHON_SPECIFIC_FRAGMENTS },
        { name: "RUBY", fragments: RUBY_SPECIFIC_FRAGMENTS },
        { name: "C", fragments: C_SPECIFIC_FRAGMENTS },
        { name: "CPP", fragments: CPP_SPECIFIC_FRAGMENTS },
      ];

      languageFragments.forEach(({ name, fragments }) => {
        const hasPublicFunctions = fragments.PUBLIC_FUNCTIONS !== undefined;
        const hasPublicMethods = fragments.PUBLIC_METHODS !== undefined;
        expect(hasPublicFunctions || hasPublicMethods).toBe(true);
        if (hasPublicFunctions || hasPublicMethods) {
          const publicApiField = fragments.PUBLIC_FUNCTIONS ?? fragments.PUBLIC_METHODS;
          expect(typeof publicApiField).toBe("string");
          expect(publicApiField?.length).toBeGreaterThan(0);
        }
        // Log for debugging if needed
        if (!hasPublicFunctions && !hasPublicMethods) {
          throw new Error(
            `${name}_SPECIFIC_FRAGMENTS should have either PUBLIC_FUNCTIONS or PUBLIC_METHODS`,
          );
        }
      });
    });

    it("should use PUBLIC_FUNCTIONS for functional languages", () => {
      const functionalLanguages = [
        JAVASCRIPT_SPECIFIC_FRAGMENTS,
        PYTHON_SPECIFIC_FRAGMENTS,
        RUBY_SPECIFIC_FRAGMENTS,
        C_SPECIFIC_FRAGMENTS,
      ];

      functionalLanguages.forEach((fragments) => {
        expect(fragments.PUBLIC_FUNCTIONS).toBeDefined();
        expect(typeof fragments.PUBLIC_FUNCTIONS).toBe("string");
      });
    });

    it("should use PUBLIC_METHODS for OOP languages", () => {
      const oopLanguages = [
        JAVA_SPECIFIC_FRAGMENTS,
        CSHARP_SPECIFIC_FRAGMENTS,
        CPP_SPECIFIC_FRAGMENTS,
      ];

      oopLanguages.forEach((fragments) => {
        expect(fragments.PUBLIC_METHODS).toBeDefined();
        expect(typeof fragments.PUBLIC_METHODS).toBe("string");
      });
    });
  });

  describe("KIND_OVERRIDE optional field", () => {
    it("should allow KIND_OVERRIDE as an optional field", () => {
      // KIND_OVERRIDE is optional - not all languages need it
      // Standard OOP languages like Java don't need it
      expect(JAVA_SPECIFIC_FRAGMENTS.KIND_OVERRIDE).toBeUndefined();

      // Functional languages or languages with different entity types may define it
      // C and most other languages currently don't define KIND_OVERRIDE
      expect(C_SPECIFIC_FRAGMENTS.KIND_OVERRIDE).toBeUndefined();
    });

    it("should accept KIND_OVERRIDE in a valid LanguageSpecificFragments object", () => {
      // Verify the interface allows optional KIND_OVERRIDE
      const fragmentsWithOverride: LanguageSpecificFragments = {
        INTERNAL_REFS: "test",
        EXTERNAL_REFS: "test",
        PUBLIC_CONSTANTS: "test",
        PUBLIC_FUNCTIONS: "test",
        INTEGRATION_INSTRUCTIONS: "test",
        DB_MECHANISM_MAPPING: "test",
        KIND_OVERRIDE: "module",
      };
      expect(fragmentsWithOverride.KIND_OVERRIDE).toBe("module");
    });
  });
});
