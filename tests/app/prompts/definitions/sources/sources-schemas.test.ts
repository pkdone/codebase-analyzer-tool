import { z } from "zod";
import { sourcePromptSchemas } from "../../../../../src/app/prompts/definitions/sources/sources.schemas";
import { sourceConfigMap } from "../../../../../src/app/prompts/definitions/sources/sources.config";
import { sourceSummarySchema } from "../../../../../src/app/schemas/sources.schema";
import {
  CANONICAL_FILE_TYPES,
  type CanonicalFileType,
} from "../../../../../src/app/components/capture/config/file-types.config";

describe("sourcePromptSchemas", () => {
  describe("Schema Map Completeness", () => {
    it("should have a schema for every canonical file type", () => {
      const schemaKeys = Object.keys(sourcePromptSchemas).sort();
      const expectedKeys = [...CANONICAL_FILE_TYPES].sort();

      expect(schemaKeys).toEqual(expectedKeys);
    });

    it("should have matching keys with sourceConfigMap", () => {
      const schemaKeys = Object.keys(sourcePromptSchemas).sort();
      const configKeys = Object.keys(sourceConfigMap).sort();

      expect(schemaKeys).toEqual(configKeys);
    });
  });

  describe("Schema Type Validation", () => {
    it("should have all schemas as ZodObject instances", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = sourcePromptSchemas[fileType];
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
            "publicMethods",
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
        const schema = sourcePromptSchemas[fileType];
        const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
        const actualFields = Object.keys(shape).sort();

        expect(actualFields).toEqual(expectedFields.sort());
      }
    });

    it("should pick fields matching sourceConfigMap schemaFields", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = sourcePromptSchemas[fileType];
        const config = sourceConfigMap[fileType];
        const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
        const actualFields = Object.keys(shape).sort();
        const expectedFields = [...config.schemaFields].sort();

        expect(actualFields).toEqual(expectedFields);
      }
    });
  });

  describe("Schema Structure", () => {
    it("should create schemas that are subsets of sourceSummarySchema", () => {
      const fullSchemaKeys = Object.keys(sourceSummarySchema.shape);

      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = sourcePromptSchemas[fileType];
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
        const schema = sourcePromptSchemas[fileType];
        const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
        const fields = Object.keys(shape);

        // All file types should include these core fields
        expect(fields).toContain("purpose");
        expect(fields).toContain("implementation");
      }
    });
  });

  describe("Type Inference", () => {
    it("should allow type inference for a specific file type", () => {
      // This test verifies that TypeScript can infer types correctly
      type JavaSchema = typeof sourcePromptSchemas.java;
      type JavaInferredType = z.infer<JavaSchema>;

      // Create a sample object that matches the inferred type
      const sampleJavaSummary: JavaInferredType = {
        name: "TestClass",
        kind: "CLASS",
        namespace: "com.example.test",
        purpose: "Test purpose",
        implementation: "Test implementation",
        internalReferences: ["com.example.other"],
        externalReferences: ["java.util.List"],
        publicConstants: [],
        publicMethods: [],
        databaseIntegration: {
          mechanism: "JPA",
          description: "Uses JPA for persistence",
          codeExample: "n/a",
        },
        integrationPoints: [],
        codeQualityMetrics: {
          totalMethods: 5,
        },
      };

      // Validate the sample object against the schema
      const result = sourcePromptSchemas.java.safeParse(sampleJavaSummary);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal SQL summary", () => {
      type SQLSchema = typeof sourcePromptSchemas.sql;
      type SQLInferredType = z.infer<SQLSchema>;

      const sampleSQLSummary: SQLInferredType = {
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

      const result = sourcePromptSchemas.sql.safeParse(sampleSQLSummary);
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

      const result = sourcePromptSchemas.default.safeParse(sampleDefaultSummary);
      expect(result.success).toBe(true);
    });
  });

  describe("Schema Validation Behavior", () => {
    it("should reject objects with missing required fields", () => {
      const invalidJavaSummary = {
        name: "TestClass",
        // Missing 'purpose' and 'implementation' which are required
      };

      const result = sourcePromptSchemas.java.safeParse(invalidJavaSummary);
      expect(result.success).toBe(false);
    });

    it("should accept objects with optional fields omitted", () => {
      const minimalJavaSummary = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        // All other fields are optional and can be omitted
      };

      const result = sourcePromptSchemas.java.safeParse(minimalJavaSummary);
      expect(result.success).toBe(true);
    });

    it("should use passthrough mode to allow additional fields", () => {
      const summaryWithExtraField = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        extraField: "This should be allowed due to passthrough",
      };

      const result = sourcePromptSchemas.default.safeParse(summaryWithExtraField);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("extraField");
      }
    });
  });
});
