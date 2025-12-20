import { z } from "zod";
import { summarizeFile } from "../../../../src/app/components/capture/file-summarizer";
import type LLMRouter from "../../../../src/common/llm/llm-router";
import { sourceConfigMap } from "../../../../src/app/prompts/definitions/sources/sources.config";
import { promptRegistry } from "../../../../src/app/prompts/prompt-registry";
import { CANONICAL_FILE_TYPES } from "../../../../src/app/components/capture/config/file-types.config";

/**
 * Tests verifying the integration between file-summarizer and sourceConfigMap.
 *
 * This test suite was added as part of the prompt refactoring that:
 * - Deleted sources.schemas.ts (redundant schema re-exports)
 * - Updated file-summarizer to use sourceConfigMap.responseSchema directly
 */
describe("file-summarizer sourceConfigMap integration", () => {
  // Mock LLMRouter for testing
  const createMockLLMRouter = (mockResponse: unknown): LLMRouter => {
    return {
      executeCompletion: jest.fn().mockResolvedValue(mockResponse),
    } as unknown as LLMRouter;
  };

  describe("Schema Source Verification", () => {
    it("should use schemas from sourceConfigMap for all canonical file types", () => {
      // Verify that promptRegistry.sources and sourceConfigMap have the same schemas
      for (const fileType of CANONICAL_FILE_TYPES) {
        const configSchema = sourceConfigMap[fileType].responseSchema;
        const registryDefinition = promptRegistry.sources[fileType];

        // The registry should use the same schema as the config
        expect(registryDefinition.responseSchema).toBe(configSchema);
      }
    });

    it("should have all canonical file types covered in sourceConfigMap", () => {
      const configKeys = Object.keys(sourceConfigMap).sort();
      const expectedKeys = [...CANONICAL_FILE_TYPES].sort();

      expect(configKeys).toEqual(expectedKeys);
    });

    it("should use ZodObject schemas for all file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = sourceConfigMap[fileType].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodObject);
      }
    });
  });

  describe("Runtime Schema Selection", () => {
    it("should pass the correct schema to LLM for Java files", async () => {
      const mockRouter = createMockLLMRouter({
        purpose: "Test Java class",
        implementation: "Test implementation",
      });

      await summarizeFile(mockRouter, "/src/Test.java", "java", "class Test {}");

      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Should use the schema from sourceConfigMap
      expect(options.jsonSchema).toBe(sourceConfigMap.java.responseSchema);
    });

    it("should pass the correct schema to LLM for SQL files", async () => {
      const mockRouter = createMockLLMRouter({
        purpose: "Database schema",
        implementation: "Creates tables",
      });

      await summarizeFile(mockRouter, "/db/schema.sql", "sql", "CREATE TABLE users...");

      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Should use the schema from sourceConfigMap
      expect(options.jsonSchema).toBe(sourceConfigMap.sql.responseSchema);
    });

    it("should pass the correct schema to LLM for Python files", async () => {
      const mockRouter = createMockLLMRouter({
        purpose: "Python module",
        implementation: "Module implementation",
      });

      await summarizeFile(mockRouter, "/src/module.py", "py", "def main(): pass");

      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Should use the schema from sourceConfigMap
      expect(options.jsonSchema).toBe(sourceConfigMap.python.responseSchema);
    });

    it("should pass the correct schema to LLM for default file type", async () => {
      const mockRouter = createMockLLMRouter({
        purpose: "Unknown file",
        implementation: "Unknown implementation",
      });

      await summarizeFile(mockRouter, "/src/unknown.xyz", "xyz", "unknown content");

      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Should use the default schema from sourceConfigMap
      expect(options.jsonSchema).toBe(sourceConfigMap.default.responseSchema);
    });
  });

  describe("Schema Content Verification", () => {
    it("should have purpose and implementation in all schemas", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const schema = sourceConfigMap[fileType].responseSchema as z.ZodObject<z.ZodRawShape>;
        const shape = schema.shape;

        expect(shape).toHaveProperty("purpose");
        expect(shape).toHaveProperty("implementation");
      }
    });

    it("should have code-specific fields in code file schemas", () => {
      const codeFileTypes = ["java", "javascript", "python", "csharp", "ruby"] as const;

      for (const fileType of codeFileTypes) {
        const schema = sourceConfigMap[fileType].responseSchema as z.ZodObject<z.ZodRawShape>;
        const shape = schema.shape;

        // Code files should have public methods and integration points
        expect(shape).toHaveProperty("publicMethods");
        expect(shape).toHaveProperty("integrationPoints");
      }
    });

    it("should have SQL-specific fields in SQL schema", () => {
      const schema = sourceConfigMap.sql.responseSchema as z.ZodObject<z.ZodRawShape>;
      const shape = schema.shape;

      expect(shape).toHaveProperty("tables");
      expect(shape).toHaveProperty("storedProcedures");
      expect(shape).toHaveProperty("triggers");
    });

    it("should have dependency fields in build file schemas", () => {
      const buildFileTypes = ["maven", "gradle", "npm", "dotnet-proj"] as const;

      for (const fileType of buildFileTypes) {
        const schema = sourceConfigMap[fileType].responseSchema as z.ZodObject<z.ZodRawShape>;
        const shape = schema.shape;

        expect(shape).toHaveProperty("dependencies");
      }
    });
  });

  describe("Config Entry Completeness", () => {
    it("should have contentDesc for all file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(sourceConfigMap[fileType].contentDesc).toBeDefined();
        expect(typeof sourceConfigMap[fileType].contentDesc).toBe("string");
        expect(sourceConfigMap[fileType].contentDesc.length).toBeGreaterThan(0);
      }
    });

    it("should have instructions for all file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(sourceConfigMap[fileType].instructions).toBeDefined();
        expect(Array.isArray(sourceConfigMap[fileType].instructions)).toBe(true);
      }
    });

    it("should have hasComplexSchema property or default correctly", () => {
      // Most file types default to hasComplexSchema: true (or undefined which defaults to true)
      // Only explicit false values need to be checked
      for (const fileType of CANONICAL_FILE_TYPES) {
        const hasComplexSchema = sourceConfigMap[fileType].hasComplexSchema;
        // Should be undefined (defaults to true) or a boolean
        expect(hasComplexSchema === undefined || typeof hasComplexSchema === "boolean").toBe(true);
      }
    });
  });
});
