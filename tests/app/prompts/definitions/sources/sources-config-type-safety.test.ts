import { z } from "zod";
import {
  fileTypePromptRegistry,
  type FileTypePromptRegistry,
} from "../../../../../src/app/prompts/definitions/sources/sources.definitions";
import {
  standardCodeDefinitions,
  dependencyFileDefinitions,
  specialFileDefinitions,
  type SourceConfigEntry,
} from "../../../../../src/app/prompts/definitions/sources/definitions";
import { CANONICAL_FILE_TYPES } from "../../../../../src/app/schemas/canonical-file-types";
import { CODE_DATA_BLOCK_HEADER } from "../../../../../src/app/prompts/definitions/sources/definitions/source-config-factories";

/**
 * Type safety tests for fileTypePromptRegistry.
 * These tests verify that the generic interface and satisfies pattern
 * correctly preserve specific Zod schema types through the type system.
 */
describe("fileTypePromptRegistry Type Safety", () => {
  describe("satisfies Pattern Validation", () => {
    it("should validate that fileTypePromptRegistry satisfies Record structure", () => {
      // This is a compile-time check - if it compiles, the satisfies pattern works
      // Runtime verification that all expected keys exist
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(fileTypePromptRegistry[fileType]).toBeDefined();
      }
    });

    it("should have each entry satisfy SourceConfigEntry interface", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const entry = fileTypePromptRegistry[fileType];

        // Verify required fields from SourceConfigEntry
        expect(typeof entry.contentDesc).toBe("string");
        expect(entry.responseSchema).toBeInstanceOf(z.ZodType);
        expect(Array.isArray(entry.instructions)).toBe(true);

        // hasComplexSchema is optional and only defined on some entries
        // Use type assertion to check for optional property
        const entryWithOptionals = entry as { hasComplexSchema?: boolean };
        if (entryWithOptionals.hasComplexSchema !== undefined) {
          expect(typeof entryWithOptionals.hasComplexSchema).toBe("boolean");
        }
      }
    });
  });

  describe("Generic Interface Type Preservation", () => {
    it("should preserve specific schema types in type alias", () => {
      // FileTypePromptRegistry should be typeof fileTypePromptRegistry, preserving literal types
      // This is primarily a compile-time verification
      // Use the types to demonstrate they exist and are distinct
      const javaConfig: FileTypePromptRegistry["java"] = fileTypePromptRegistry.java;
      const sqlConfig: FileTypePromptRegistry["sql"] = fileTypePromptRegistry.sql;
      const markdownConfig: FileTypePromptRegistry["markdown"] = fileTypePromptRegistry.markdown;

      // These types should be distinct at compile time
      // At runtime, we verify the schemas are distinct objects
      const javaSchema = javaConfig.responseSchema;
      const sqlSchema = sqlConfig.responseSchema;
      const markdownSchema = markdownConfig.responseSchema;

      expect(javaSchema).not.toBe(sqlSchema);
      expect(sqlSchema).not.toBe(markdownSchema);
      expect(javaSchema).not.toBe(markdownSchema);
    });

    it("should allow specific schema types to be extracted via inference", () => {
      // Type-level test: Extract the inferred type from a specific entry's schema
      type JavaSchemaInferred = z.infer<(typeof fileTypePromptRegistry)["java"]["responseSchema"]>;
      type SqlSchemaInferred = z.infer<(typeof fileTypePromptRegistry)["sql"]["responseSchema"]>;

      // Runtime test: Parse sample data against specific schemas
      const javaSample: JavaSchemaInferred = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        name: "TestClass",
        kind: "CLASS",
        namespace: "com.example",
        internalReferences: [],
        externalReferences: [],
        publicConstants: [],
        publicFunctions: [],
        databaseIntegration: {
          mechanism: "NONE",
          description: "No database",
          codeExample: "n/a",
        },
        integrationPoints: [],
        codeQualityMetrics: { totalFunctions: 0 },
      };

      const sqlSample: SqlSchemaInferred = {
        purpose: "SQL purpose",
        implementation: "SQL implementation",
        tables: [],
        storedProcedures: [],
        triggers: [],
        databaseIntegration: {
          mechanism: "SQL",
          description: "Direct SQL",
          codeExample: "SELECT 1",
        },
      };

      const javaResult = fileTypePromptRegistry.java.responseSchema.safeParse(javaSample);
      const sqlResult = fileTypePromptRegistry.sql.responseSchema.safeParse(sqlSample);

      expect(javaResult.success).toBe(true);
      expect(sqlResult.success).toBe(true);
    });
  });

  describe("SourceConfigEntry Generic Interface", () => {
    it("should accept generic type parameter for specific schemas", () => {
      // Create a test entry with a specific schema type
      const testSchema = z.object({
        testField: z.string(),
      });

      // This should compile without error, showing the generic works
      const testEntry: SourceConfigEntry<typeof testSchema> = {
        contentDesc: "Test content",
        responseSchema: testSchema,
        instructions: ["Test instruction"],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      };

      expect(testEntry.responseSchema).toBe(testSchema);
      expect(testEntry.contentDesc).toBe("Test content");
    });

    it("should default to z.ZodType when no type parameter is provided", () => {
      // This should accept any ZodType without specific parameter
      const genericEntry: SourceConfigEntry = {
        contentDesc: "Generic content",
        responseSchema: z.string(),
        instructions: [],
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      };

      expect(genericEntry.responseSchema).toBeInstanceOf(z.ZodType);
    });
  });

  describe("as const Immutability", () => {
    it("should preserve readonly arrays for instructions", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const entry = fileTypePromptRegistry[fileType];
        // Instructions should be an array (readonly at type level)
        expect(Array.isArray(entry.instructions)).toBe(true);
      }
    });

    it("should have immutable structure at the config map level", () => {
      // The entire config map should be frozen/immutable in terms of structure
      // This tests that as const is applied correctly
      const keys = Object.keys(fileTypePromptRegistry);
      expect(keys.length).toBe(CANONICAL_FILE_TYPES.length);
    });
  });

  describe("Schema Type Distinctness", () => {
    it("should have different schemas for different file types", () => {
      // Get schemas from different file types
      const javaShape = Object.keys(
        (fileTypePromptRegistry.java.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      ).sort();
      const sqlShape = Object.keys(
        (fileTypePromptRegistry.sql.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      ).sort();
      const markdownShape = Object.keys(
        (fileTypePromptRegistry.markdown.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      ).sort();

      // Java has name, kind, namespace; SQL has tables, storedProcedures
      expect(javaShape).toContain("name");
      expect(javaShape).toContain("kind");
      expect(sqlShape).toContain("tables");
      expect(sqlShape).toContain("storedProcedures");
      expect(markdownShape).not.toContain("tables");
      expect(markdownShape).not.toContain("name");
    });

    it("should validate that each file type schema is a ZodObject", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = fileTypePromptRegistry[fileType].responseSchema;
        // All schemas should be ZodObject instances (from .pick())
        expect(schema).toBeInstanceOf(z.ZodObject);
      }
    });
  });

  describe("Sub-Definition Files with satisfies Pattern", () => {
    it("should have standardCodeDefinitions with correct keys", () => {
      // Verify that standardCodeDefinitions preserves literal key types
      const expectedKeys = ["java", "javascript", "csharp", "python", "ruby", "c", "cpp"];
      const actualKeys = Object.keys(standardCodeDefinitions);

      for (const key of expectedKeys) {
        expect(actualKeys).toContain(key);
        expect(standardCodeDefinitions[key as keyof typeof standardCodeDefinitions]).toBeDefined();
      }
    });

    it("should have dependencyFileDefinitions with correct keys", () => {
      // Verify that dependencyFileDefinitions preserves literal key types
      const expectedKeys = [
        "maven",
        "gradle",
        "ant",
        "npm",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "makefile",
      ];
      const actualKeys = Object.keys(dependencyFileDefinitions);

      for (const key of expectedKeys) {
        expect(actualKeys).toContain(key);
        expect(
          dependencyFileDefinitions[key as keyof typeof dependencyFileDefinitions],
        ).toBeDefined();
      }
    });

    it("should have specialFileDefinitions with correct keys", () => {
      // Verify that specialFileDefinitions preserves literal key types
      const expectedKeys = [
        "sql",
        "markdown",
        "xml",
        "jsp",
        "shell-script",
        "batch-script",
        "jcl",
        "default",
      ];
      const actualKeys = Object.keys(specialFileDefinitions);

      for (const key of expectedKeys) {
        expect(actualKeys).toContain(key);
        expect(specialFileDefinitions[key as keyof typeof specialFileDefinitions]).toBeDefined();
      }
    });

    it("should have each sub-definition entry satisfy SourceConfigEntry interface", () => {
      // Test standardCodeDefinitions
      for (const key of Object.keys(standardCodeDefinitions)) {
        const entry = standardCodeDefinitions[key as keyof typeof standardCodeDefinitions];
        expect(typeof entry.contentDesc).toBe("string");
        expect(entry.responseSchema).toBeInstanceOf(z.ZodType);
        expect(Array.isArray(entry.instructions)).toBe(true);
      }

      // Test dependencyFileDefinitions
      for (const key of Object.keys(dependencyFileDefinitions)) {
        const entry = dependencyFileDefinitions[key as keyof typeof dependencyFileDefinitions];
        expect(typeof entry.contentDesc).toBe("string");
        expect(entry.responseSchema).toBeInstanceOf(z.ZodType);
        expect(Array.isArray(entry.instructions)).toBe(true);
      }

      // Test specialFileDefinitions
      for (const key of Object.keys(specialFileDefinitions)) {
        const entry = specialFileDefinitions[key as keyof typeof specialFileDefinitions];
        expect(typeof entry.contentDesc).toBe("string");
        expect(entry.responseSchema).toBeInstanceOf(z.ZodType);
        expect(Array.isArray(entry.instructions)).toBe(true);
      }
    });

    it("should preserve schema types from factory functions", () => {
      // Verify that factory functions return consistent schema types
      // Standard code definitions should all have the same schema (commonSourceAnalysisSchema)
      const standardSchemas = Object.values(standardCodeDefinitions).map((def) =>
        Object.keys((def.responseSchema as z.ZodObject<z.ZodRawShape>).shape).sort(),
      );

      // All standard code schemas should have the same keys
      const firstSchemaKeys = standardSchemas[0];
      for (const schemaKeys of standardSchemas) {
        expect(schemaKeys).toEqual(firstSchemaKeys);
      }

      // Dependency file definitions should all have the same schema (dependencyFileSchema)
      const depSchemas = Object.values(dependencyFileDefinitions).map((def) =>
        Object.keys((def.responseSchema as z.ZodObject<z.ZodRawShape>).shape).sort(),
      );

      const firstDepSchemaKeys = depSchemas[0];
      for (const schemaKeys of depSchemas) {
        expect(schemaKeys).toEqual(firstDepSchemaKeys);
      }
    });
  });
});
