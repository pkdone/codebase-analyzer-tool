/**
 * Tests for the rules module barrel export.
 * Verifies that all expected exports are accessible from the unified import point.
 *
 * Note: Domain-specific rules like JAVA_SPECIFIC_RULES have been moved to the
 * application layer (src/app/llm/rules/) and are no longer exported from the
 * common library.
 */
import {
  executeRules,
  executeRulesMultiPass,
  isAfterJsonDelimiter,
  isInPropertyContext,
  isInArrayContextSimple,
  STRAY_CHARACTER_RULES,
  PROPERTY_NAME_RULES,
  ASSIGNMENT_RULES,
  ARRAY_ELEMENT_RULES,
  STRUCTURAL_RULES,
  EMBEDDED_CONTENT_RULES,
  ALL_RULES,
} from "../../../../../../src/common/llm/json-processing/sanitizers/rules";

import type { ContextInfo } from "../../../../../../src/common/llm/json-processing/sanitizers/rules";

describe("rules barrel export", () => {
  describe("executor exports", () => {
    it("should export executeRules function", () => {
      expect(executeRules).toBeDefined();
      expect(typeof executeRules).toBe("function");
    });

    it("should export executeRulesMultiPass function", () => {
      expect(executeRulesMultiPass).toBeDefined();
      expect(typeof executeRulesMultiPass).toBe("function");
    });
  });

  describe("context check function exports", () => {
    it("should export isAfterJsonDelimiter function", () => {
      expect(isAfterJsonDelimiter).toBeDefined();
      expect(typeof isAfterJsonDelimiter).toBe("function");
    });

    it("should export isInPropertyContext function", () => {
      expect(isInPropertyContext).toBeDefined();
      expect(typeof isInPropertyContext).toBe("function");
    });

    it("should export isInArrayContextSimple function", () => {
      expect(isInArrayContextSimple).toBeDefined();
      expect(typeof isInArrayContextSimple).toBe("function");
    });
  });

  describe("rule set exports", () => {
    it("should export STRAY_CHARACTER_RULES array", () => {
      expect(STRAY_CHARACTER_RULES).toBeDefined();
      expect(Array.isArray(STRAY_CHARACTER_RULES)).toBe(true);
      expect(STRAY_CHARACTER_RULES.length).toBeGreaterThan(0);
    });

    it("should export PROPERTY_NAME_RULES array", () => {
      expect(PROPERTY_NAME_RULES).toBeDefined();
      expect(Array.isArray(PROPERTY_NAME_RULES)).toBe(true);
      expect(PROPERTY_NAME_RULES.length).toBeGreaterThan(0);
    });

    it("should export ASSIGNMENT_RULES array", () => {
      expect(ASSIGNMENT_RULES).toBeDefined();
      expect(Array.isArray(ASSIGNMENT_RULES)).toBe(true);
      expect(ASSIGNMENT_RULES.length).toBeGreaterThan(0);
    });

    it("should export ARRAY_ELEMENT_RULES array", () => {
      expect(ARRAY_ELEMENT_RULES).toBeDefined();
      expect(Array.isArray(ARRAY_ELEMENT_RULES)).toBe(true);
      expect(ARRAY_ELEMENT_RULES.length).toBeGreaterThan(0);
    });

    it("should export STRUCTURAL_RULES array", () => {
      expect(STRUCTURAL_RULES).toBeDefined();
      expect(Array.isArray(STRUCTURAL_RULES)).toBe(true);
      expect(STRUCTURAL_RULES.length).toBeGreaterThan(0);
    });

    it("should export EMBEDDED_CONTENT_RULES array", () => {
      expect(EMBEDDED_CONTENT_RULES).toBeDefined();
      expect(Array.isArray(EMBEDDED_CONTENT_RULES)).toBe(true);
      expect(EMBEDDED_CONTENT_RULES.length).toBeGreaterThan(0);
    });

    it("should export ALL_RULES aggregate array", () => {
      expect(ALL_RULES).toBeDefined();
      expect(Array.isArray(ALL_RULES)).toBe(true);
      // ALL_RULES should contain all the individual rule sets
      expect(ALL_RULES.length).toBeGreaterThan(
        Math.max(
          STRAY_CHARACTER_RULES.length,
          PROPERTY_NAME_RULES.length,
          ARRAY_ELEMENT_RULES.length,
          STRUCTURAL_RULES.length,
          EMBEDDED_CONTENT_RULES.length,
        ),
      );
    });
  });

  describe("context check function integration", () => {
    const createContext = (beforeMatch: string, offset: number): ContextInfo => ({
      beforeMatch,
      offset,
      fullContent: "",
      groups: [],
    });

    it("isAfterJsonDelimiter should work correctly", () => {
      // After closing brace
      expect(isAfterJsonDelimiter(createContext("} ", 100))).toBe(true);
      // At start of file
      expect(isAfterJsonDelimiter(createContext("", 2))).toBe(true);
    });

    it("isInPropertyContext should work correctly", () => {
      // After opening brace
      expect(isInPropertyContext(createContext("{ ", 100))).toBe(true);
      // After comma
      expect(isInPropertyContext(createContext(", ", 100))).toBe(true);
    });

    it("isInArrayContextSimple should work correctly", () => {
      // After opening bracket
      expect(isInArrayContextSimple(createContext("[ ", 100))).toBe(true);
      // After comma with newline
      expect(isInArrayContextSimple(createContext(",\n  ", 100))).toBe(true);
    });
  });

  describe("rule execution integration", () => {
    it("should execute rules from the barrel export", () => {
      // Simple test to verify executeRules works with exported rule sets
      const input = '{"key": "value"} stray text';
      const result = executeRules(input, STRAY_CHARACTER_RULES);
      expect(result).toBeDefined();
      expect(typeof result.content).toBe("string");
      expect(typeof result.changed).toBe("boolean");
    });
  });
});
