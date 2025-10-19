import "reflect-metadata";
import { fileTypePromptMetadata } from "../../../src/promptTemplates/sources.prompts";
import {
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS,
  SourcePromptTemplate,
} from "../../../src/promptTemplates/prompt.types";
import { sourceSummarySchema } from "../../../src/schemas/sources.schema";
import { SourceSummaryType } from "../../../src/components/capture/file-summarizer";

describe("File Handler Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fileTypeMetataDataAndPromptTemplate", () => {
    test("should be a Record with expected file types", () => {
      expect(typeof fileTypePromptMetadata).toBe("object");
      expect(fileTypePromptMetadata).not.toBeNull();
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

      for (const type of expectedPromptTypes) {
        expect(fileTypePromptMetadata).toHaveProperty(type);
      }
    });

    test("should have correct number of mappings", () => {
      // Updated expected count from 8 to 19 after addition of build tool file type metadata mappings
      // Updated to 22 after addition of batch processing file types (shell-script, batch-script, jcl)
      expect(Object.keys(fileTypePromptMetadata).length).toBe(22);
    });

    test("should have valid Zod schemas for each file type", () => {
      for (const [, config] of Object.entries(fileTypePromptMetadata)) {
        expect(config.promptMetadata).toBeDefined();
        expect(config.promptMetadata._def).toBeDefined();
        // Schema should have a parse method indicating it's a Zod schema
        expect(typeof config.promptMetadata.parse).toBe("function");
      }
    });

    test("should have contentDesc and instructions for each type", () => {
      for (const [, config] of Object.entries(fileTypePromptMetadata)) {
        expect(config).toHaveProperty("contentDesc");
        expect(config).toHaveProperty("instructions");
        // Updated expectation: 'schema' property renamed to 'promptMetadata'
        expect(config).toHaveProperty("promptMetadata");
        expect(typeof config.contentDesc).toBe("string");
        expect(typeof config.instructions).toBe("string");
      }
    });
  });

  describe("DynamicPromptConfig structure", () => {
    test("should enforce correct structure", () => {
      const testConfig: SourcePromptTemplate = {
        contentDesc: "test content",
        instructions: "test instructions",
        promptMetadata: sourceSummarySchema,
        hasComplexSchema: false,
      };

      expect(testConfig).toHaveProperty("contentDesc");
      expect(testConfig).toHaveProperty("instructions");
      // Updated expectation: 'schema' property renamed to 'promptMetadata'
      expect(testConfig).toHaveProperty("promptMetadata");
      expect(testConfig).toHaveProperty("hasComplexSchema");
      expect(typeof testConfig.contentDesc).toBe("string");
      expect(typeof testConfig.instructions).toBe("string");
    });

    test("should work with type compatibility", () => {
      // Test that DynamicPromptConfig can work with inline schema types
      const typedConfig: SourcePromptTemplate = {
        contentDesc: "test content",
        instructions: "test instructions",
        promptMetadata: sourceSummarySchema.pick({ purpose: true, implementation: true }),
        hasComplexSchema: false,
      };

      expect(typedConfig.promptMetadata).toBeDefined();
      expect(typeof typedConfig.promptMetadata.parse).toBe("function");
    });
  });

  describe("SummaryType union", () => {
    test("should include all expected summary types", () => {
      // This is a compile-time test that ensures the union type includes all expected types
      // We can't directly test the type at runtime, but we can verify it works with assignments

      const javaSummary: SourceSummaryType = {
        name: "TestClass",
        kind: "CLASS",
        namespace: "com.example.TestClass",
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
      const canonicalTypes = new Set<
        import("../../../src/promptTemplates/prompt.types").CanonicalFileType
      >(FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.values());

      for (const canonicalType of canonicalTypes) {
        expect(fileTypePromptMetadata).toHaveProperty(canonicalType);
      }
    });

    test("should provide fallback to default for unknown types", () => {
      // Test that unknown suffix maps to default
      const unknownSuffix = "unknown";
      const canonicalType =
        FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.get(unknownSuffix) ?? "default";

      expect(canonicalType).toBe("default");
      expect(fileTypePromptMetadata).toHaveProperty("default");
    });
  });
});
