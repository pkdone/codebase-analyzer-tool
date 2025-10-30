import "reflect-metadata";
import { fileTypePromptMetadata } from "../../../src/prompts/definitions/sources";
import { PromptDefinition } from "../../../src/prompts/types/prompt-definition.types";
import { fileTypeMappingsConfig } from "../../../src/config/file-type-mappings.config";
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
      // Updated to 23 after addition of Python source code prompt metadata
      expect(Object.keys(fileTypePromptMetadata).length).toBe(23);
    });

    test("should have valid Zod schemas for each file type", () => {
      for (const [, config] of Object.entries(fileTypePromptMetadata)) {
        expect(config.responseSchema).toBeDefined();
        expect(config.responseSchema._def).toBeDefined();
        // Schema should have a parse method indicating it's a Zod schema
        expect(typeof config.responseSchema.parse).toBe("function");
      }
    });

    test("should have contentDesc, instructions and responseSchema for each type", () => {
      for (const [, config] of Object.entries(fileTypePromptMetadata)) {
        expect(config).toHaveProperty("contentDesc");
        expect(config).toHaveProperty("instructions");
        expect(config).toHaveProperty("responseSchema");
        expect(typeof config.contentDesc).toBe("string");
        expect(typeof config.instructions).toBe("object");
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(
          config.hasComplexSchema === undefined || typeof config.hasComplexSchema === "boolean",
        ).toBe(true);
      }
    });
  });

  describe("DynamicPromptConfig structure", () => {
    test("should enforce correct structure", () => {
      const testConfig: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instructions"] }],
        responseSchema: sourceSummarySchema,
        hasComplexSchema: false,
        template: "Test template",
      };

      expect(testConfig).toHaveProperty("contentDesc");
      expect(testConfig).toHaveProperty("instructions");
      expect(testConfig).toHaveProperty("responseSchema");
      expect(testConfig).toHaveProperty("hasComplexSchema");
      expect(typeof testConfig.contentDesc).toBe("string");
      expect(typeof testConfig.instructions).toBe("object");
      expect(Array.isArray(testConfig.instructions)).toBe(true);
    });

    test("should work with type compatibility", () => {
      // Test that DynamicPromptConfig can work with inline schema types
      const typedConfig: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instructions"] }],
        responseSchema: sourceSummarySchema.pick({ purpose: true, implementation: true }),
        hasComplexSchema: false,
        template: "Test template",
      };

      expect(typedConfig.responseSchema).toBeDefined();
      expect(typeof typedConfig.responseSchema.parse).toBe("function");
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
        import("../../../src/prompts/types/sources.types").CanonicalFileType
      >(Array.from(fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.values()));

      for (const canonicalType of canonicalTypes) {
        expect(fileTypePromptMetadata).toHaveProperty(canonicalType);
      }
    });

    test("should provide fallback to default for unknown types", () => {
      // Test that unknown suffix maps to default
      const unknownSuffix = "unknown";
      const canonicalType =
        fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.get(unknownSuffix) ??
        "default";

      expect(canonicalType).toBe("default");
      expect(fileTypePromptMetadata).toHaveProperty("default");
    });
  });
});
