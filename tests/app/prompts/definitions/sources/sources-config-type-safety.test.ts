import { z } from "zod";
import {
  sourceConfigMap,
  SourceConfigEntry,
  type SourceConfigMap,
} from "../../../../../src/app/prompts/definitions/sources/sources.definitions";
import { CANONICAL_FILE_TYPES } from "../../../../../src/app/components/capture/config/file-types.config";

/**
 * Type safety tests for sourceConfigMap.
 * These tests verify that the generic interface and satisfies pattern
 * correctly preserve specific Zod schema types through the type system.
 */
describe("sourceConfigMap Type Safety", () => {
  describe("satisfies Pattern Validation", () => {
    it("should validate that sourceConfigMap satisfies Record structure", () => {
      // This is a compile-time check - if it compiles, the satisfies pattern works
      // Runtime verification that all expected keys exist
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(sourceConfigMap[fileType]).toBeDefined();
      }
    });

    it("should have each entry satisfy SourceConfigEntry interface", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const entry = sourceConfigMap[fileType];

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
      // SourceConfigMap should be typeof sourceConfigMap, preserving literal types
      // This is primarily a compile-time verification
      // Use the types to demonstrate they exist and are distinct
      const javaConfig: SourceConfigMap["java"] = sourceConfigMap.java;
      const sqlConfig: SourceConfigMap["sql"] = sourceConfigMap.sql;
      const markdownConfig: SourceConfigMap["markdown"] = sourceConfigMap.markdown;

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
      type JavaSchemaInferred = z.infer<(typeof sourceConfigMap)["java"]["responseSchema"]>;
      type SqlSchemaInferred = z.infer<(typeof sourceConfigMap)["sql"]["responseSchema"]>;

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

      const javaResult = sourceConfigMap.java.responseSchema.safeParse(javaSample);
      const sqlResult = sourceConfigMap.sql.responseSchema.safeParse(sqlSample);

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
      };

      expect(genericEntry.responseSchema).toBeInstanceOf(z.ZodType);
    });
  });

  describe("as const Immutability", () => {
    it("should preserve readonly arrays for instructions", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const entry = sourceConfigMap[fileType];
        // Instructions should be an array (readonly at type level)
        expect(Array.isArray(entry.instructions)).toBe(true);
      }
    });

    it("should have immutable structure at the config map level", () => {
      // The entire config map should be frozen/immutable in terms of structure
      // This tests that as const is applied correctly
      const keys = Object.keys(sourceConfigMap);
      expect(keys.length).toBe(CANONICAL_FILE_TYPES.length);
    });
  });

  describe("Schema Type Distinctness", () => {
    it("should have different schemas for different file types", () => {
      // Get schemas from different file types
      const javaShape = Object.keys(
        (sourceConfigMap.java.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      ).sort();
      const sqlShape = Object.keys(
        (sourceConfigMap.sql.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      ).sort();
      const markdownShape = Object.keys(
        (sourceConfigMap.markdown.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
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
        const schema = sourceConfigMap[fileType].responseSchema;
        // All schemas should be ZodObject instances (from .pick())
        expect(schema).toBeInstanceOf(z.ZodObject);
      }
    });
  });
});
