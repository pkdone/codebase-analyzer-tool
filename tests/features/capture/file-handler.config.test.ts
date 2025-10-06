import "reflect-metadata";
import { fileTypeMetadataConfig } from "../../../src/components/capture/files-types-metadata.config";
import { fileTypeMappingsConfig } from "../../../src/config/file-type-mappings.config";
import { sourceSummarySchema } from "../../../src/schemas/sources.schema";
import { SourceSummaryType } from "../../../src/components/capture/file-summarizer";
import { DynamicPromptConfig } from "../../../src/llm/utils/prompt-templator";

describe("File Handler Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fileTypeMetataDataAndPromptTemplate", () => {
    test("should be a Record with expected file types", () => {
      expect(typeof fileTypeMetadataConfig).toBe("object");
      expect(fileTypeMetadataConfig).not.toBeNull();
    });

    test("should contain expected prompt template keys", () => {
      const expectedPromptTypes = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
      ];

      expectedPromptTypes.forEach((type) => {
        expect(fileTypeMetadataConfig).toHaveProperty(type);
      });
    });

    test("should have correct number of mappings", () => {
  // Updated expected count from 8 to 9 after addition of 'csharp' file type metadata mapping
  expect(Object.keys(fileTypeMetadataConfig).length).toBe(9);
    });

    test("should have valid Zod schemas for each file type", () => {
      Object.entries(fileTypeMetadataConfig).forEach(([, config]) => {
        expect(config.schema).toBeDefined();
        expect(config.schema._def).toBeDefined();
        // Schema should have a parse method indicating it's a Zod schema
        expect(typeof config.schema.parse).toBe("function");
      });
    });

    test("should have contentDesc and instructions for each type", () => {
      Object.entries(fileTypeMetadataConfig).forEach(([, config]) => {
        expect(config).toHaveProperty("contentDesc");
        expect(config).toHaveProperty("instructions");
        expect(config).toHaveProperty("schema");
        expect(typeof config.contentDesc).toBe("string");
        expect(typeof config.instructions).toBe("string");
      });
    });
  });

  describe("DynamicPromptConfig structure", () => {
    test("should enforce correct structure", () => {
      const testConfig: DynamicPromptConfig = {
        contentDesc: "test content",
        instructions: "test instructions",
        schema: sourceSummarySchema,
        hasComplexSchema: false,
      };

      expect(testConfig).toHaveProperty("contentDesc");
      expect(testConfig).toHaveProperty("instructions");
      expect(testConfig).toHaveProperty("schema");
      expect(testConfig).toHaveProperty("hasComplexSchema");
      expect(typeof testConfig.contentDesc).toBe("string");
      expect(typeof testConfig.instructions).toBe("string");
    });

    test("should work with type compatibility", () => {
      // Test that DynamicPromptConfig can work with inline schema types
      const typedConfig: DynamicPromptConfig = {
        contentDesc: "test content",
        instructions: "test instructions",
        schema: sourceSummarySchema.pick({ purpose: true, implementation: true }),
        hasComplexSchema: false,
      };

      expect(typedConfig.schema).toBeDefined();
      expect(typeof typedConfig.schema.parse).toBe("function");
    });
  });

  describe("SummaryType union", () => {
    test("should include all expected summary types", () => {
      // This is a compile-time test that ensures the union type includes all expected types
      // We can't directly test the type at runtime, but we can verify it works with assignments

      const javaSummary: SourceSummaryType = {
        classname: "TestClass",
        classType: "class",
        classpath: "com.example.TestClass",
        purpose: "Test purpose",
        implementation: "Test implementation",
        internalReferences: [],
        externalReferences: [],
        publicConstants: [],
        publicMethods: [],
        databaseIntegration: { mechanism: "NONE", description: "No database", codeExample: "n/a" },
      };

      const jsSummary: SourceSummaryType = {
        purpose: "JS test purpose",
        implementation: "JS test implementation",
        internalReferences: [],
        externalReferences: [],
        databaseIntegration: { mechanism: "NONE", description: "No database", codeExample: "n/a" },
      };

      const defaultSummary: SourceSummaryType = {
        purpose: "Default test purpose",
        implementation: "Default test implementation",
        databaseIntegration: { mechanism: "NONE", description: "No database", codeExample: "n/a" },
      };

      // These should all compile without errors
      expect(javaSummary).toBeDefined();
      expect(jsSummary).toBeDefined();
      expect(defaultSummary).toBeDefined();
    });
  });

  describe("Integration between file suffix mappings and prompt templates", () => {
    test("should have corresponding prompt templates for all canonical types", () => {
      const canonicalTypes = new Set(
        fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.values(),
      );

      for (const canonicalType of canonicalTypes) {
        expect(fileTypeMetadataConfig).toHaveProperty(canonicalType);
      }
    });

    test("should provide fallback to default for unknown types", () => {
      // Test that unknown suffix maps to default
      const unknownSuffix = "unknown";
      const canonicalType =
        fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.get(unknownSuffix) ??
        "default";

      expect(canonicalType).toBe("default");
      expect(fileTypeMetadataConfig).toHaveProperty("default");
    });
  });
});
