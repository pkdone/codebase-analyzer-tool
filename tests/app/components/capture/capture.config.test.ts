import "reflect-metadata";
import {
  fileTypePromptRegistry,
  CODE_DATA_BLOCK_HEADER,
} from "../../../../src/app/prompts/sources/sources.definitions";
import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../../src/app/prompts/prompt.config";
import { getCanonicalFileType } from "../../../../src/app/config/file-handling";
import { sourceSummarySchema } from "../../../../src/app/schemas/sources.schema";
import { SourceSummaryType } from "../../../../src/app/components/capture/file-summarizer.service";

/**
 * Helper to create a JSONSchemaPrompt from fileTypePromptRegistry config.
 * Adds dataBlockHeader and wrapInCodeBlock which are not in the registry entries.
 */
function createSourcePrompt(fileType: keyof typeof fileTypePromptRegistry): JSONSchemaPrompt {
  const config = fileTypePromptRegistry[fileType];
  return new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    ...config,
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
  } as JSONSchemaPromptConfig);
}

describe("File Handler Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fileTypePromptRegistry", () => {
    test("should be a Record with expected file types", () => {
      expect(typeof fileTypePromptRegistry).toBe("object");
      expect(fileTypePromptRegistry).not.toBeNull();
    });

    test("should contain expected file types", () => {
      const expectedPromptTypes = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "c",
        "cpp",
        "makefile",
      ];

      for (const type of expectedPromptTypes) {
        expect(fileTypePromptRegistry).toHaveProperty(type);
      }
    });

    test("should have correct number of mappings", () => {
      // Updated expected count from 8 to 19 after addition of build tool file type metadata mappings
      // Updated to 23 after addition of Python source code prompt metadata
      // Updated to 26 after addition of C, C++, and makefile support
      expect(Object.keys(fileTypePromptRegistry).length).toBe(26);
    });

    test("should have valid Zod schemas for each file type", () => {
      for (const [, config] of Object.entries(fileTypePromptRegistry)) {
        expect(config.responseSchema).toBeDefined();
        expect(config.responseSchema._def).toBeDefined();
        // Schema should have a parse method indicating it's a Zod schema
        expect(typeof config.responseSchema.parse).toBe("function");
      }
    });

    test("should have contentDesc, instructions and responseSchema for each type", () => {
      for (const [, config] of Object.entries(fileTypePromptRegistry)) {
        expect(config).toHaveProperty("contentDesc");
        expect(config).toHaveProperty("instructions");
        expect(config).toHaveProperty("responseSchema");
        expect(typeof config.contentDesc).toBe("string");
        expect(typeof config.instructions).toBe("object");
        expect(Array.isArray(config.instructions)).toBe(true);
      }
    });
  });

  describe("JSONSchemaPrompt structure", () => {
    test("should enforce correct structure", () => {
      const testPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instructions"],
        responseSchema: sourceSummarySchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });

      expect(testPrompt).toHaveProperty("contentDesc");
      expect(testPrompt).toHaveProperty("instructions");
      expect(testPrompt).toHaveProperty("responseSchema");
      expect(typeof testPrompt.contentDesc).toBe("string");
      expect(typeof testPrompt.instructions).toBe("object");
      expect(Array.isArray(testPrompt.instructions)).toBe(true);
    });

    test("should work with type compatibility", () => {
      // Test that JSONSchemaPrompt can work with inline schema types
      const typedPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instructions"],
        responseSchema: sourceSummarySchema.pick({ purpose: true, implementation: true }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });

      expect(typedPrompt.responseSchema).toBeDefined();
      expect(typeof typedPrompt.responseSchema.parse).toBe("function");
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
        publicFunctions: [],
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

  describe("Integration between file suffix mappings and prompt configs", () => {
    test("should have corresponding configs for all canonical types", () => {
      // Get all unique canonical types by testing various file types
      const testFileTypes = [
        { path: "/path/to/file.java", ext: "java" },
        { path: "/path/to/file.ts", ext: "ts" },
        { path: "/path/to/file.py", ext: "py" },
        { path: "/path/to/file.rb", ext: "rb" },
        { path: "/path/to/pom.xml", ext: "xml" },
        { path: "/path/to/package.json", ext: "json" },
        { path: "/path/to/readme.md", ext: "md" },
        { path: "/path/to/unknown.xyz", ext: "xyz" },
      ];
      const canonicalTypes = new Set(
        testFileTypes.map(({ path, ext }) => getCanonicalFileType(path, ext)),
      );

      for (const canonicalType of canonicalTypes) {
        expect(fileTypePromptRegistry).toHaveProperty(canonicalType);
      }
    });

    test("should provide fallback to default for unknown types", () => {
      // Test that unknown suffix maps to default
      const unknownSuffix = "unknown";
      const filename = "test.unknown";
      const canonicalType = getCanonicalFileType(filename, unknownSuffix);

      expect(canonicalType).toBe("default");
      expect(fileTypePromptRegistry).toHaveProperty("default");
    });
  });

  describe("Creating Prompts from configs", () => {
    test("should create valid JSONSchemaPrompt instances from configs", () => {
      const javaPrompt = createSourcePrompt("java");

      expect(javaPrompt.contentDesc).toBe("the JVM code");
      expect(javaPrompt.instructions.length).toBeGreaterThan(0);
      expect(javaPrompt.responseSchema).toBeDefined();
    });

    test("should render prompts correctly", () => {
      const javaPrompt = createSourcePrompt("java");
      const rendered = javaPrompt.renderPrompt("public class Test {}");

      expect(rendered).toContain("Act as a senior developer");
      expect(rendered).toContain("public class Test {}");
      expect(rendered).toContain("JVM code");
    });
  });
});
