import "reflect-metadata";
import { filesTypeMetatadataConfig } from "../../../src/components/capture/files-types-metadata.config";
import { appConfig } from "../../../src/config/app.config";
import {
  SourceSummaryType,
  sourceFileSummarySchema,
} from "../../../src/schemas/source-summaries.schema";
import { FileHandler } from "../../../src/components/capture/file-handler";
import { DynamicPromptReplaceVars } from "../../../src/llm/processing/prompting/prompt-templator";

describe("File Handler Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fileTypeMetataDataAndPromptTemplate", () => {
    test("should be a Record with expected file types", () => {
      expect(typeof filesTypeMetatadataConfig).toBe("object");
      expect(filesTypeMetatadataConfig).not.toBeNull();
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
      ];

      expectedPromptTypes.forEach((type) => {
        expect(filesTypeMetatadataConfig).toHaveProperty(type);
      });
    });

    test("should have correct number of mappings", () => {
      expect(Object.keys(filesTypeMetatadataConfig).length).toBe(7);
    });

    test("should have valid Zod schemas for each file type", () => {
      Object.entries(filesTypeMetatadataConfig).forEach(([, config]) => {
        expect(config.schema).toBeDefined();
        expect(config.schema._def).toBeDefined();
        // Schema should have a parse method indicating it's a Zod schema
        expect(typeof config.schema.parse).toBe("function");
      });
    });

    test("should have fileContentDesc and instructions for each type", () => {
      Object.entries(filesTypeMetatadataConfig).forEach(([, config]) => {
        expect(config).toHaveProperty("fileContentDesc");
        expect(config).toHaveProperty("instructions");
        expect(config).toHaveProperty("schema");
        expect(typeof config.fileContentDesc).toBe("string");
        expect(typeof config.instructions).toBe("string");
      });
    });
  });

  describe("FileHandler class", () => {
    test("should enforce correct structure", () => {
      const testConfig: DynamicPromptReplaceVars = {
        fileContentDesc: "test content",
        instructions: "test instructions",
        schema: sourceFileSummarySchema,
        trickySchema: false,
      };
      const testHandler = new FileHandler(testConfig);

      expect(testHandler).toHaveProperty("createPrompt");
      expect(testHandler).toHaveProperty("schema");
      expect(typeof testHandler.createPrompt).toBe("function");
    });

    test("should work with type compatibility", () => {
      // Test that FileHandler can work with inline schema types
      const typedConfig: DynamicPromptReplaceVars = {
        fileContentDesc: "test content",
        instructions: "test instructions",
        schema: sourceFileSummarySchema.pick({ purpose: true, implementation: true }),
        trickySchema: false,
      };
      const typedHandler = new FileHandler(typedConfig);

      expect(typedHandler.schema).toBeDefined();
      expect(typeof typedHandler.createPrompt).toBe("function");
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
      const canonicalTypes = new Set(appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.values());

      canonicalTypes.forEach((canonicalType) => {
        expect(filesTypeMetatadataConfig).toHaveProperty(canonicalType);
      });
    });

    test("should provide fallback to default for unknown types", () => {
      // Test that unknown suffix maps to default
      const unknownSuffix = "unknown";
      const canonicalType =
        appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.get(unknownSuffix) ?? "default";

      expect(canonicalType).toBe("default");
      expect(filesTypeMetatadataConfig).toHaveProperty("default");
    });
  });
});
