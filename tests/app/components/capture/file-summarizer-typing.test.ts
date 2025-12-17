import { z } from "zod";
import { summarizeFile } from "../../../../src/app/components/capture/file-summarizer";
import type LLMRouter from "../../../../src/common/llm/llm-router";
import { sourcePromptSchemas } from "../../../../src/app/prompts/definitions/sources/sources.schemas";
import type { CanonicalFileType } from "../../../../src/app/config/file-types.config";

// Mock LLMRouter for testing
const createMockLLMRouter = (mockResponse: unknown): LLMRouter => {
  return {
    executeCompletion: jest.fn().mockResolvedValue(mockResponse),
  } as unknown as LLMRouter;
};

describe("file-summarizer Type Safety", () => {
  describe("Schema Selection", () => {
    it("should use the correct schema for Java files", async () => {
      const mockJavaResponse = {
        name: "TestClass",
        kind: "CLASS",
        namespace: "com.example.test",
        purpose: "Test Java class purpose with sufficient detail for validation.",
        implementation:
          "Test implementation details for Java class with sufficient detail for validation.",
        internalReferences: ["com.example.other.Class"],
        externalReferences: ["java.util.List", "java.util.Map"],
        publicConstants: [{ name: "CONSTANT", value: "value", type: "String" }],
        publicMethods: [
          {
            name: "testMethod",
            purpose: "Method purpose with sufficient detail for validation requirements.",
            returnType: "void",
            description: "Method implementation description.",
          },
        ],
        databaseIntegration: {
          mechanism: "JPA",
          description: "Uses JPA for database persistence operations.",
          codeExample: "@Entity class Example { }",
        },
        integrationPoints: [],
        codeQualityMetrics: {
          totalMethods: 5,
          averageComplexity: 3.2,
          maxComplexity: 8,
        },
      };

      const mockRouter = createMockLLMRouter(mockJavaResponse);
      const result = await summarizeFile(mockRouter, "/path/to/Test.java", "java", "class Test {}");

      expect(mockRouter.executeCompletion).toHaveBeenCalled();
      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Verify that the schema used is the Java schema
      expect(options.jsonSchema).toBe(sourcePromptSchemas.java);

      // Verify the result has expected Java-specific fields
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("namespace");
      expect(result).toHaveProperty("purpose");
    });

    it("should use the correct schema for SQL files", async () => {
      const mockSQLResponse = {
        purpose: "Defines database schema with sufficient detail for validation.",
        implementation: "Creates tables and stored procedures with sufficient detail.",
        tables: [{ name: "users", fields: "id, name, email" }],
        storedProcedures: [
          {
            name: "sp_get_user",
            purpose: "Retrieves user data based on ID with additional details for validation.",
            complexity: "LOW",
            complexityReason: "Simple SELECT statement",
            linesOfCode: 10,
          },
        ],
        triggers: [],
        databaseIntegration: {
          mechanism: "SQL",
          description: "Direct SQL DDL definitions",
          codeExample: "CREATE TABLE users (id INT PRIMARY KEY)",
        },
      };

      const mockRouter = createMockLLMRouter(mockSQLResponse);
      const result = await summarizeFile(
        mockRouter,
        "/path/to/schema.sql",
        "sql",
        "CREATE TABLE...",
      );

      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Verify that the schema used is the SQL schema
      expect(options.jsonSchema).toBe(sourcePromptSchemas.sql);

      // Verify the result has expected SQL-specific fields
      expect(result).toHaveProperty("tables");
      expect(result).toHaveProperty("storedProcedures");
    });

    it("should use the correct schema for Maven POM files", async () => {
      const mockMavenResponse = {
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

      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Verify that the schema used is the Maven schema
      expect(options.jsonSchema).toBe(sourcePromptSchemas.maven);

      // Verify the result has expected Maven-specific fields
      expect(result).toHaveProperty("dependencies");
    });

    it("should use the default schema for unknown file types", async () => {
      const mockDefaultResponse = {
        purpose: "Generic file purpose with sufficient detail for validation.",
        implementation: "Generic implementation details with sufficient detail.",
        databaseIntegration: {
          mechanism: "NONE",
          description: "No database integration present",
          codeExample: "n/a",
        },
      };

      const mockRouter = createMockLLMRouter(mockDefaultResponse);
      const result = await summarizeFile(
        mockRouter,
        "/path/to/unknown.xyz",
        "xyz",
        "unknown content",
      );

      const callArgs = (mockRouter.executeCompletion as jest.Mock).mock.calls[0];
      const options = callArgs[2];

      // Verify that the schema used is the default schema
      expect(options.jsonSchema).toBe(sourcePromptSchemas.default);

      // Verify the result has core required fields
      expect(result).toHaveProperty("purpose");
      expect(result).toHaveProperty("implementation");
    });
  });

  describe("Canonical File Type Mapping", () => {
    it("should use Java schema for .java files", async () => {
      const mockRouter = createMockLLMRouter({ purpose: "test", implementation: "test" });
      await summarizeFile(mockRouter, "/src/Main.java", "java", "class Main {}");

      const options = (mockRouter.executeCompletion as jest.Mock).mock.calls[0][2];
      const shape = (options.jsonSchema as z.ZodObject<z.ZodRawShape>).shape;

      // Java schema should have these specific fields
      expect(shape).toHaveProperty("name");
      expect(shape).toHaveProperty("namespace");
      expect(shape).toHaveProperty("publicMethods");
    });

    it("should use SQL schema for .sql files", async () => {
      const mockRouter = createMockLLMRouter({ purpose: "test", implementation: "test" });
      await summarizeFile(mockRouter, "/db/schema.sql", "sql", "CREATE TABLE...");

      const options = (mockRouter.executeCompletion as jest.Mock).mock.calls[0][2];
      const shape = (options.jsonSchema as z.ZodObject<z.ZodRawShape>).shape;

      // SQL schema should have these specific fields
      expect(shape).toHaveProperty("tables");
      expect(shape).toHaveProperty("storedProcedures");
      expect(shape).toHaveProperty("triggers");
    });

    it("should use default schema for unknown file types", async () => {
      const mockRouter = createMockLLMRouter({ purpose: "test", implementation: "test" });
      await summarizeFile(mockRouter, "/unknown.xyz", "xyz", "content");

      const options = (mockRouter.executeCompletion as jest.Mock).mock.calls[0][2];
      const shape = (options.jsonSchema as z.ZodObject<z.ZodRawShape>).shape;
      const keys = Object.keys(shape);

      // Default schema should only have core fields
      expect(keys).toEqual(["purpose", "implementation", "databaseIntegration"]);
    });
  });

  describe("Response Type Safety", () => {
    it("should handle null responses by throwing an error", async () => {
      const mockRouter = createMockLLMRouter(null);

      await expect(
        summarizeFile(mockRouter, "/path/to/test.java", "java", "class Test {}"),
      ).rejects.toThrow("LLM returned null response");
    });

    it("should handle empty content by throwing an error", async () => {
      const mockRouter = createMockLLMRouter({});

      await expect(summarizeFile(mockRouter, "/path/to/test.java", "java", "   ")).rejects.toThrow(
        "File is empty",
      );
    });

    it("should propagate errors from LLM execution", async () => {
      const mockRouter = {
        executeCompletion: jest.fn().mockRejectedValue(new Error("LLM execution failed")),
      } as unknown as LLMRouter;

      await expect(
        summarizeFile(mockRouter, "/path/to/test.java", "java", "class Test {}"),
      ).rejects.toThrow("LLM execution failed");
    });
  });

  describe("Type Assertion Documentation", () => {
    it("should properly cast picked schema response to full SourceSummaryType", async () => {
      // This test verifies the type assertion behavior is correctly documented
      // The picked schema may not include all fields, but the cast is safe
      // because optional fields default to undefined
      const mockPartialResponse = {
        purpose: "Minimal response with required fields only for validation.",
        implementation: "Minimal implementation details for validation.",
        // Other fields like 'name', 'namespace', etc. are optional and omitted
      };

      const mockRouter = createMockLLMRouter(mockPartialResponse);
      const result = await summarizeFile(mockRouter, "/path/to/test.java", "java", "class Test {}");

      // The function should return successfully even with partial data
      expect(result).toHaveProperty("purpose");
      expect(result).toHaveProperty("implementation");

      // Optional fields will be undefined or not present
      // This is the intended behavior documented in the function
    });
  });

  describe("Schema Consistency", () => {
    it("should use strongly-typed schemas matching the config", () => {
      // Verify that each schema in sourcePromptSchemas is a ZodObject
      const fileTypes: CanonicalFileType[] = [
        "java",
        "javascript",
        "sql",
        "xml",
        "maven",
        "gradle",
        "python",
        "csharp",
        "ruby",
      ];

      for (const fileType of fileTypes) {
        const schema = sourcePromptSchemas[fileType];
        expect(schema).toBeInstanceOf(z.ZodObject);

        // Verify all schemas include the required core fields
        const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
        expect(shape).toHaveProperty("purpose");
        expect(shape).toHaveProperty("implementation");
      }
    });
  });
});
