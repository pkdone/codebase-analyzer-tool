/**
 * Tests for schema value constants module.
 * Verifies the constants are properly exported and have expected values.
 */

import {
  DATABASE_MECHANISM_VALUES,
  OPERATION_TYPE_VALUES,
  QUERY_PATTERN_VALUES,
  TRANSACTION_HANDLING_VALUES,
  DIRECTION_VALUES,
  CODE_SMELL_VALUES,
  FILE_SMELL_VALUES,
  INTEGRATION_MECHANISM_VALUES,
  SOURCE_ENTITY_KIND_VALUES,
  COMPLEXITY_VALUES,
  COMPLEXITY_VALUES_SET,
  DEFAULT_COMPLEXITY,
  type ComplexityValue,
} from "../../../src/app/schemas/schema-value.constants";

describe("schema-value.constants", () => {
  describe("DATABASE_MECHANISM_VALUES", () => {
    it("should export an array of database mechanism strings", () => {
      expect(Array.isArray(DATABASE_MECHANISM_VALUES)).toBe(true);
      expect(DATABASE_MECHANISM_VALUES.length).toBeGreaterThan(0);
    });

    it("should include common database mechanisms", () => {
      expect(DATABASE_MECHANISM_VALUES).toContain("NONE");
      expect(DATABASE_MECHANISM_VALUES).toContain("JDBC");
      expect(DATABASE_MECHANISM_VALUES).toContain("HIBERNATE");
      expect(DATABASE_MECHANISM_VALUES).toContain("OTHER");
      expect(DATABASE_MECHANISM_VALUES).toContain("INVALID");
    });

    it("should be readonly", () => {
      // TypeScript enforces this at compile time with 'as const'
      // Runtime check to ensure values are expected
      expect(DATABASE_MECHANISM_VALUES[0]).toBe("NONE");
    });
  });

  describe("OPERATION_TYPE_VALUES", () => {
    it("should export operation type strings", () => {
      expect(Array.isArray(OPERATION_TYPE_VALUES)).toBe(true);
      expect(OPERATION_TYPE_VALUES).toContain("READ");
      expect(OPERATION_TYPE_VALUES).toContain("WRITE");
      expect(OPERATION_TYPE_VALUES).toContain("READ_WRITE");
    });
  });

  describe("INTEGRATION_MECHANISM_VALUES", () => {
    it("should export integration mechanism strings", () => {
      expect(Array.isArray(INTEGRATION_MECHANISM_VALUES)).toBe(true);
      expect(INTEGRATION_MECHANISM_VALUES).toContain("REST");
      expect(INTEGRATION_MECHANISM_VALUES).toContain("GRAPHQL");
      expect(INTEGRATION_MECHANISM_VALUES).toContain("SOAP");
      expect(INTEGRATION_MECHANISM_VALUES).toContain("WEBSOCKET");
    });
  });

  describe("CODE_SMELL_VALUES", () => {
    it("should export code smell strings", () => {
      expect(Array.isArray(CODE_SMELL_VALUES)).toBe(true);
      expect(CODE_SMELL_VALUES).toContain("LONG METHOD");
      expect(CODE_SMELL_VALUES).toContain("GOD CLASS");
      expect(CODE_SMELL_VALUES).toContain("DEAD CODE");
    });
  });

  describe("FILE_SMELL_VALUES", () => {
    it("should export file smell strings", () => {
      expect(Array.isArray(FILE_SMELL_VALUES)).toBe(true);
      expect(FILE_SMELL_VALUES).toContain("GOD CLASS");
      expect(FILE_SMELL_VALUES).toContain("LARGE FILE");
      expect(FILE_SMELL_VALUES).toContain("DATA CLASS");
    });
  });

  describe("COMPLEXITY_VALUES", () => {
    it("should export complexity strings", () => {
      expect(Array.isArray(COMPLEXITY_VALUES)).toBe(true);
      expect(COMPLEXITY_VALUES).toContain("LOW");
      expect(COMPLEXITY_VALUES).toContain("MEDIUM");
      expect(COMPLEXITY_VALUES).toContain("HIGH");
      expect(COMPLEXITY_VALUES).toContain("INVALID");
    });
  });

  describe("COMPLEXITY_VALUES_SET", () => {
    it("should be a Set containing all complexity values", () => {
      expect(COMPLEXITY_VALUES_SET instanceof Set).toBe(true);
      expect(COMPLEXITY_VALUES_SET.has("LOW")).toBe(true);
      expect(COMPLEXITY_VALUES_SET.has("HIGH")).toBe(true);
      expect(COMPLEXITY_VALUES_SET.has("INVALID")).toBe(true);
      expect(COMPLEXITY_VALUES_SET.has("UNKNOWN")).toBe(false);
    });
  });

  describe("DEFAULT_COMPLEXITY", () => {
    it("should be the first complexity value (LOW)", () => {
      const defaultValue: ComplexityValue = DEFAULT_COMPLEXITY;
      expect(defaultValue).toBe("LOW");
      expect(defaultValue).toBe(COMPLEXITY_VALUES[0]);
    });
  });

  describe("SOURCE_ENTITY_KIND_VALUES", () => {
    it("should export source entity kind strings", () => {
      expect(Array.isArray(SOURCE_ENTITY_KIND_VALUES)).toBe(true);
      expect(SOURCE_ENTITY_KIND_VALUES).toContain("CLASS");
      expect(SOURCE_ENTITY_KIND_VALUES).toContain("INTERFACE");
      expect(SOURCE_ENTITY_KIND_VALUES).toContain("ENUM");
      expect(SOURCE_ENTITY_KIND_VALUES).toContain("MODULE");
    });
  });

  describe("DIRECTION_VALUES", () => {
    it("should export direction strings for messaging", () => {
      expect(Array.isArray(DIRECTION_VALUES)).toBe(true);
      expect(DIRECTION_VALUES).toContain("PRODUCER");
      expect(DIRECTION_VALUES).toContain("CONSUMER");
      expect(DIRECTION_VALUES).toContain("BOTH");
    });
  });

  describe("QUERY_PATTERN_VALUES", () => {
    it("should export query pattern strings", () => {
      expect(Array.isArray(QUERY_PATTERN_VALUES)).toBe(true);
      expect(QUERY_PATTERN_VALUES).toContain("SIMPLE CRUD");
      expect(QUERY_PATTERN_VALUES).toContain("COMPLEX JOINS");
    });
  });

  describe("TRANSACTION_HANDLING_VALUES", () => {
    it("should export transaction handling strings", () => {
      expect(Array.isArray(TRANSACTION_HANDLING_VALUES)).toBe(true);
      expect(TRANSACTION_HANDLING_VALUES).toContain("SPRING @TRANSACTIONAL");
      expect(TRANSACTION_HANDLING_VALUES).toContain("MANUAL");
      expect(TRANSACTION_HANDLING_VALUES).toContain("AUTO-COMMIT");
    });
  });
});
