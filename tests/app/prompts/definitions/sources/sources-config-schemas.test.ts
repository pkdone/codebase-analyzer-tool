import { z } from "zod";
import { fileTypePromptRegistry } from "../../../../../src/app/prompts/sources/sources.definitions";
import { sourceSummarySchema } from "../../../../../src/app/schemas/source-file.schema";
import {
  CANONICAL_FILE_TYPES,
  type CanonicalFileType,
} from "../../../../../src/app/schemas/canonical-file-types";

/**
 * Tests for fileTypePromptRegistry.responseSchema schemas.
 * These tests verify that the response schemas defined directly in fileTypePromptRegistry
 * are correctly structured and provide the expected type validation.
 */
describe("fileTypePromptRegistry.responseSchema", () => {
  describe("Schema Map Completeness", () => {
    it("should have a schema for every canonical file type", () => {
      const configKeys = Object.keys(fileTypePromptRegistry).sort();
      const expectedKeys = [...CANONICAL_FILE_TYPES].sort();

      expect(configKeys).toEqual(expectedKeys);
    });

    it("should have responseSchema defined for all config entries", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const config = fileTypePromptRegistry[fileType];
        expect(config.responseSchema).toBeDefined();
        expect(config.responseSchema).toBeInstanceOf(z.ZodType);
      }
    });
  });

  describe("Schema Type Validation", () => {
    it("should have all schemas as ZodObject instances", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = fileTypePromptRegistry[fileType].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodObject);
      }
    });

    it("should have schemas with the correct picked fields", () => {
      // Test a few representative file types
      const testCases: { fileType: CanonicalFileType; expectedFields: string[] }[] = [
        {
          fileType: "java",
          expectedFields: [
            "name",
            "kind",
            "namespace",
            "purpose",
            "implementation",
            "internalReferences",
            "externalReferences",
            "publicConstants",
            "publicFunctions",
            "databaseIntegration",
            "integrationPoints",
            "codeQualityMetrics",
          ],
        },
        {
          fileType: "sql",
          expectedFields: [
            "purpose",
            "implementation",
            "tables",
            "storedProcedures",
            "triggers",
            "databaseIntegration",
          ],
        },
        {
          fileType: "markdown",
          expectedFields: ["purpose", "implementation", "databaseIntegration"],
        },
        {
          fileType: "maven",
          expectedFields: ["purpose", "implementation", "dependencies"],
        },
      ];

      for (const { fileType, expectedFields } of testCases) {
        const schema = fileTypePromptRegistry[fileType].responseSchema;
        const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
        const actualFields = Object.keys(shape).sort();

        expect(actualFields).toEqual(expectedFields.sort());
      }
    });
  });

  describe("Schema Structure", () => {
    it("should create schemas that are subsets of sourceSummarySchema", () => {
      const fullSchemaKeys = Object.keys(sourceSummarySchema.shape);

      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = fileTypePromptRegistry[fileType].responseSchema;
        const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
        const pickedKeys = Object.keys(shape);

        // All picked keys should exist in the full schema
        for (const key of pickedKeys) {
          expect(fullSchemaKeys).toContain(key);
        }
      }
    });

    it("should include required fields purpose and implementation for all file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = fileTypePromptRegistry[fileType].responseSchema;
        const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
        const fields = Object.keys(shape);

        // All file types should include these core fields
        expect(fields).toContain("purpose");
        expect(fields).toContain("implementation");
      }
    });
  });

  describe("Type Inference", () => {
    it("should validate a minimal Java summary", () => {
      const sampleJavaSummary = {
        name: "TestClass",
        kind: "CLASS",
        namespace: "com.example.test",
        purpose: "Test purpose",
        implementation: "Test implementation",
        internalReferences: ["com.example.other"],
        externalReferences: ["java.util.List"],
        publicConstants: [],
        publicFunctions: [],
        databaseIntegration: {
          mechanism: "JPA",
          description: "Uses JPA for persistence",
          codeExample: "n/a",
        },
        integrationPoints: [],
        codeQualityMetrics: {
          totalFunctions: 5,
        },
      };

      const result = fileTypePromptRegistry.java.responseSchema.safeParse(sampleJavaSummary);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal SQL summary", () => {
      const sampleSQLSummary = {
        purpose: "Defines database schema",
        implementation: "Creates tables and stored procedures",
        tables: [{ name: "users", fields: "id, name, email" }],
        storedProcedures: [],
        triggers: [],
        databaseIntegration: {
          mechanism: "SQL",
          description: "Direct SQL definitions",
          codeExample: "CREATE TABLE users...",
        },
      };

      const result = fileTypePromptRegistry.sql.responseSchema.safeParse(sampleSQLSummary);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal default file type summary", () => {
      const sampleDefaultSummary = {
        purpose: "Generic file purpose",
        implementation: "Generic file implementation details",
        databaseIntegration: {
          mechanism: "NONE",
          description: "No database integration",
          codeExample: "n/a",
        },
      };

      const result = fileTypePromptRegistry.default.responseSchema.safeParse(sampleDefaultSummary);
      expect(result.success).toBe(true);
    });
  });

  describe("Schema Validation Behavior", () => {
    it("should reject objects with missing required fields", () => {
      const invalidJavaSummary = {
        name: "TestClass",
        // Missing 'purpose' and 'implementation' which are required
      };

      const result = fileTypePromptRegistry.java.responseSchema.safeParse(invalidJavaSummary);
      expect(result.success).toBe(false);
    });

    it("should accept objects with optional fields omitted", () => {
      const minimalJavaSummary = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        // All other fields are optional and can be omitted
      };

      const result = fileTypePromptRegistry.java.responseSchema.safeParse(minimalJavaSummary);
      expect(result.success).toBe(true);
    });

    it("should use passthrough mode to allow additional fields", () => {
      const summaryWithExtraField = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        extraField: "This should be allowed due to passthrough",
      };

      const result = fileTypePromptRegistry.default.responseSchema.safeParse(summaryWithExtraField);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("extraField");
      }
    });
  });

  describe("Config Entry Structure", () => {
    it("should have contentDesc for all file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(fileTypePromptRegistry[fileType].contentDesc).toBeDefined();
        expect(typeof fileTypePromptRegistry[fileType].contentDesc).toBe("string");
      }
    });

    it("should have instructions array for all file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(fileTypePromptRegistry[fileType].instructions).toBeDefined();
        expect(Array.isArray(fileTypePromptRegistry[fileType].instructions)).toBe(true);
      }
    });

    it("should have non-empty instructions for code file types", () => {
      const codeFileTypes: CanonicalFileType[] = ["java", "javascript", "python", "csharp", "ruby"];
      for (const fileType of codeFileTypes) {
        expect(fileTypePromptRegistry[fileType].instructions.length).toBeGreaterThan(0);
      }
    });
  });
});
