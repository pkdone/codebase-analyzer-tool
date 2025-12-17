import { z } from "zod";
import {
  summarizeFile,
  type PartialSourceSummaryType,
} from "../../../../src/app/components/capture/file-summarizer";
import type LLMRouter from "../../../../src/common/llm/llm-router";
import { sourcePromptSchemas } from "../../../../src/app/prompts/definitions/sources/sources.schemas";

// Mock LLMRouter for testing
const createMockLLMRouter = (mockResponse: unknown): LLMRouter => {
  return {
    executeCompletion: jest.fn().mockResolvedValue(mockResponse),
  } as unknown as LLMRouter;
};

describe("file-summarizer Partial Types", () => {
  describe("Return Type Validation", () => {
    it("should return a partial type for Java files with only picked fields", async () => {
      const mockPartialResponse: PartialSourceSummaryType = {
        purpose: "Test Java class purpose with sufficient detail for validation.",
        implementation:
          "Test implementation details for Java class with sufficient detail for validation.",
        name: "TestClass",
        namespace: "com.example.test",
        // Note: Not all possible fields are included, demonstrating partial nature
      };

      const mockRouter = createMockLLMRouter(mockPartialResponse);
      const result = await summarizeFile(mockRouter, "/path/to/Test.java", "java", "class Test {}");

      // Verify the result is a partial type
      expect(result).toEqual(mockPartialResponse);
      expect(result.purpose).toBeDefined();
      expect(result.implementation).toBeDefined();

      // Optional fields may or may not be present
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("namespace");
    });

    it("should return a partial type for SQL files with only SQL-specific fields", async () => {
      const mockSQLResponse: PartialSourceSummaryType = {
        purpose: "Defines database schema with sufficient detail for validation.",
        implementation: "Creates tables and stored procedures with sufficient detail.",
        tables: [{ name: "users", fields: "id, name, email" }],
        // Note: No 'name', 'namespace', 'publicMethods', etc. - only SQL fields
      };

      const mockRouter = createMockLLMRouter(mockSQLResponse);
      const result = await summarizeFile(
        mockRouter,
        "/path/to/schema.sql",
        "sql",
        "CREATE TABLE...",
      );

      expect(result).toEqual(mockSQLResponse);
      expect(result.purpose).toBeDefined();
      expect(result.implementation).toBeDefined();
      expect(result.tables).toBeDefined();

      // Fields not in the SQL schema should not be present
      expect(result.publicMethods).toBeUndefined();
      expect(result.namespace).toBeUndefined();
    });

    it("should handle minimal responses with only required fields", async () => {
      const mockMinimalResponse: PartialSourceSummaryType = {
        purpose: "Minimal purpose with sufficient detail for validation.",
        implementation: "Minimal implementation with sufficient detail for validation.",
        // Only the absolutely required fields
      };

      const mockRouter = createMockLLMRouter(mockMinimalResponse);
      const result = await summarizeFile(mockRouter, "/path/to/default.txt", "txt", "content");

      expect(result).toEqual(mockMinimalResponse);
      expect(result.purpose).toBeDefined();
      expect(result.implementation).toBeDefined();

      // All other fields should be undefined
      expect(result.name).toBeUndefined();
      expect(result.namespace).toBeUndefined();
      expect(result.publicMethods).toBeUndefined();
      expect(result.tables).toBeUndefined();
    });
  });

  describe("Type Safety with Different File Types", () => {
    it("should correctly handle JavaScript files with partial data", async () => {
      const mockJSResponse: PartialSourceSummaryType = {
        purpose: "JavaScript module purpose with sufficient detail for validation.",
        implementation: "JavaScript implementation with sufficient detail for validation.",
        publicMethods: [
          {
            name: "testFunction",
            purpose: "Function purpose with sufficient detail for validation requirements.",
            returnType: "void",
            description: "Function implementation description.",
          },
        ],
      };

      const mockRouter = createMockLLMRouter(mockJSResponse);
      const result = await summarizeFile(
        mockRouter,
        "/path/to/module.ts",
        "javascript",
        "function test() {}",
      );

      expect(result.publicMethods).toBeDefined();
      expect(Array.isArray(result.publicMethods)).toBe(true);
    });

    it("should correctly handle Maven POM files with dependencies only", async () => {
      const mockMavenResponse: PartialSourceSummaryType = {
        purpose: "Maven project configuration with sufficient detail for validation.",
        implementation: "Defines dependencies and build configuration with details.",
        dependencies: [
          {
            name: "spring-boot-starter",
            groupId: "org.springframework.boot",
            version: "2.7.0",
            scope: "compile",
          },
        ],
      };

      const mockRouter = createMockLLMRouter(mockMavenResponse);
      const result = await summarizeFile(
        mockRouter,
        "/path/to/pom.xml",
        "xml",
        "<project>...</project>",
      );

      expect(result.dependencies).toBeDefined();
      expect(Array.isArray(result.dependencies)).toBe(true);
      expect(result.dependencies?.length).toBe(1);
    });
  });

  describe("Schema Validation", () => {
    it("should use picked schemas that return partial types", () => {
      // Verify that the schemas are properly typed as returning partial data
      const javaSchema = sourcePromptSchemas.java;
      const sqlSchema = sourcePromptSchemas.sql;
      const defaultSchema = sourcePromptSchemas.default;

      // All schemas should be ZodObjects
      expect(javaSchema).toBeInstanceOf(z.ZodObject);
      expect(sqlSchema).toBeInstanceOf(z.ZodObject);
      expect(defaultSchema).toBeInstanceOf(z.ZodObject);

      // Verify core fields are present in all schemas
      const javaShape = (javaSchema as z.ZodObject<z.ZodRawShape>).shape;
      expect(javaShape).toHaveProperty("purpose");
      expect(javaShape).toHaveProperty("implementation");

      const sqlShape = (sqlSchema as z.ZodObject<z.ZodRawShape>).shape;
      expect(sqlShape).toHaveProperty("purpose");
      expect(sqlShape).toHaveProperty("implementation");
    });
  });

  describe("No Type Assertion Needed", () => {
    it("should return response directly without type casting", async () => {
      const mockResponse: PartialSourceSummaryType = {
        purpose: "Direct return test with sufficient detail for validation.",
        implementation: "Direct implementation with sufficient detail for validation.",
      };

      const mockRouter = createMockLLMRouter(mockResponse);
      const result = await summarizeFile(mockRouter, "/path/to/test.txt", "txt", "content");

      // The function should return the exact response without modification
      expect(result).toBe(mockResponse);
    });

    it("should maintain type safety with complex partial objects", async () => {
      const mockComplexResponse: PartialSourceSummaryType = {
        purpose: "Complex object test with sufficient detail for validation.",
        implementation: "Complex implementation with sufficient detail for validation.",
        databaseIntegration: {
          mechanism: "JPA",
          description: "Uses JPA for database persistence operations.",
          codeExample: "@Entity class Example { }",
        },
        integrationPoints: [
          {
            mechanism: "REST",
            name: "User API",
            description: "RESTful API for user management",
            path: "/api/users",
            method: "GET",
          },
        ],
      };

      const mockRouter = createMockLLMRouter(mockComplexResponse);
      const result = await summarizeFile(mockRouter, "/path/to/test.java", "java", "class Test {}");

      expect(result.databaseIntegration).toBeDefined();
      expect(result.integrationPoints).toBeDefined();
      expect(result.integrationPoints?.length).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should throw error for null responses", async () => {
      const mockRouter = createMockLLMRouter(null);

      await expect(
        summarizeFile(mockRouter, "/path/to/test.java", "java", "class Test {}"),
      ).rejects.toThrow("LLM returned null response");
    });

    it("should throw error for empty content", async () => {
      const mockRouter = createMockLLMRouter({});

      await expect(summarizeFile(mockRouter, "/path/to/test.java", "java", "   ")).rejects.toThrow(
        "File is empty",
      );
    });
  });
});
