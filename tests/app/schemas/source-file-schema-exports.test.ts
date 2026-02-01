/**
 * Tests for the consolidated source file schema exports.
 * Validates that all expected exports are available from the source-file.schema module.
 */
import * as SourceFileSchema from "../../../src/app/schemas/source-file.schema";

describe("source-file.schema module exports", () => {
  describe("enum values", () => {
    it("should export DATABASE_MECHANISM_VALUES", () => {
      expect(SourceFileSchema.DATABASE_MECHANISM_VALUES).toBeDefined();
      expect(Array.isArray(SourceFileSchema.DATABASE_MECHANISM_VALUES)).toBe(true);
      expect(SourceFileSchema.DATABASE_MECHANISM_VALUES).toContain("JDBC");
      expect(SourceFileSchema.DATABASE_MECHANISM_VALUES).toContain("NONE");
    });

    it("should export OPERATION_TYPE_VALUES", () => {
      expect(SourceFileSchema.OPERATION_TYPE_VALUES).toBeDefined();
      expect(Array.isArray(SourceFileSchema.OPERATION_TYPE_VALUES)).toBe(true);
      expect(SourceFileSchema.OPERATION_TYPE_VALUES).toContain("READ");
      expect(SourceFileSchema.OPERATION_TYPE_VALUES).toContain("WRITE");
    });

    it("should export CODE_SMELL_VALUES", () => {
      expect(SourceFileSchema.CODE_SMELL_VALUES).toBeDefined();
      expect(Array.isArray(SourceFileSchema.CODE_SMELL_VALUES)).toBe(true);
      expect(SourceFileSchema.CODE_SMELL_VALUES).toContain("LONG METHOD");
    });

    it("should export COMPLEXITY_VALUES", () => {
      expect(SourceFileSchema.COMPLEXITY_VALUES).toBeDefined();
      expect(Array.isArray(SourceFileSchema.COMPLEXITY_VALUES)).toBe(true);
      expect(SourceFileSchema.COMPLEXITY_VALUES).toContain("LOW");
      expect(SourceFileSchema.COMPLEXITY_VALUES).toContain("HIGH");
    });

    it("should export DEFAULT_COMPLEXITY", () => {
      expect(SourceFileSchema.DEFAULT_COMPLEXITY).toBeDefined();
      expect(SourceFileSchema.DEFAULT_COMPLEXITY).toBe("LOW");
    });

    it("should export COMPLEXITY_VALUES_SET", () => {
      expect(SourceFileSchema.COMPLEXITY_VALUES_SET).toBeDefined();
      expect(SourceFileSchema.COMPLEXITY_VALUES_SET instanceof Set).toBe(true);
      expect(SourceFileSchema.COMPLEXITY_VALUES_SET.has("LOW")).toBe(true);
    });
  });

  describe("MongoDB field constants", () => {
    it("should export SOURCE_FIELDS", () => {
      expect(SourceFileSchema.SOURCE_FIELDS).toBeDefined();
      expect(SourceFileSchema.SOURCE_FIELDS.PROJECT_NAME).toBe("projectName");
      expect(SourceFileSchema.SOURCE_FIELDS.FILEPATH).toBe("filepath");
      expect(SourceFileSchema.SOURCE_FIELDS.CONTENT_VECTOR).toBe("contentVector");
    });
  });

  describe("Zod schemas", () => {
    it("should export sourceSchema", () => {
      expect(SourceFileSchema.sourceSchema).toBeDefined();
      expect(typeof SourceFileSchema.sourceSchema.parse).toBe("function");
    });

    it("should export sourceSummarySchema", () => {
      expect(SourceFileSchema.sourceSummarySchema).toBeDefined();
      expect(typeof SourceFileSchema.sourceSummarySchema.parse).toBe("function");
    });

    it("should export commonSourceAnalysisSchema", () => {
      expect(SourceFileSchema.commonSourceAnalysisSchema).toBeDefined();
      expect(typeof SourceFileSchema.commonSourceAnalysisSchema.parse).toBe("function");
    });

    it("should export databaseIntegrationSchema", () => {
      expect(SourceFileSchema.databaseIntegrationSchema).toBeDefined();
      expect(typeof SourceFileSchema.databaseIntegrationSchema.parse).toBe("function");
    });

    it("should export procedureTriggerSchema", () => {
      expect(SourceFileSchema.procedureTriggerSchema).toBeDefined();
      expect(typeof SourceFileSchema.procedureTriggerSchema.parse).toBe("function");
    });

    it("should export integrationEndpointSchema", () => {
      expect(SourceFileSchema.integrationEndpointSchema).toBeDefined();
      expect(typeof SourceFileSchema.integrationEndpointSchema.parse).toBe("function");
    });
  });
});
