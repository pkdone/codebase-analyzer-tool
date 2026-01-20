import { z } from "zod";
import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";
import {
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
} from "../../../src/app/prompts/prompts.constants";
import { fileTypePromptRegistry } from "../../../src/app/prompts/sources/sources.definitions";
import { appSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import { APP_SUMMARY_CONTENT_DESC } from "../../../src/app/prompts/app-summaries/app-summaries.constants";

/**
 * Helper to create a JSONSchemaPrompt from fileTypePromptRegistry config.
 * Adds dataBlockHeader and wrapInCodeBlock which are no longer in the registry entries.
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

/**
 * Helper to create a JSONSchemaPrompt from appSummaryConfigMap config.
 * Adds contentDesc, dataBlockHeader, and wrapInCodeBlock which are no longer in the config entries.
 */
function createAppSummaryPrompt(category: keyof typeof appSummaryConfigMap): JSONSchemaPrompt {
  const config = appSummaryConfigMap[category];
  return new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    ...config,
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    wrapInCodeBlock: false,
  } as JSONSchemaPromptConfig);
}

/**
 * Tests for the prompt refactoring changes:
 * 1. Schema section rendering via renderPrompt
 * 2. Self-contained source configs with "the " prefix
 * 3. Self-contained app summary configs with contentDesc
 * 4. Simplified JSONSchemaPrompt class constructor
 */
describe("JSONSchemaPrompt Refactoring", () => {
  describe("Schema section rendering via renderPrompt", () => {
    it("should generate proper JSON schema section", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ name: z.string(), count: z.number() }),
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      });

      const result = prompt.renderPrompt("test data");

      // Should contain schema header
      expect(result).toContain("The JSON response must follow this JSON schema:");

      // Should contain JSON code block markers
      expect(result).toContain("```json");
      expect(result).toContain("```");

      // Should contain schema properties
      expect(result).toContain('"name"');
      expect(result).toContain('"count"');
      expect(result).toContain('"type": "object"');

      // Should contain JSON format enforcement instructions
      expect(result).toContain("The response MUST be valid JSON");
    });

    it("should work with array schemas", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.array(z.object({ id: z.string(), value: z.number() })),
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      });

      const result = prompt.renderPrompt("test data");

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"id"');
      expect(result).toContain('"value"');
    });

    it("should include schema section in full prompt", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ field: z.string() }),
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      });

      const result = prompt.renderPrompt("test data");

      // The rendered prompt should contain the schema section
      expect(result).toContain("The JSON response must follow this JSON schema:");
      expect(result).toContain('"field"');
    });
  });

  describe("Source configs with 'the ' prefix", () => {
    const codeFileTypes = ["java", "javascript", "csharp", "python", "ruby", "c", "cpp"] as const;

    it.each(codeFileTypes)("should have 'the ' prefix for %s contentDesc", (fileType) => {
      const config = fileTypePromptRegistry[fileType];
      expect(config.contentDesc).toMatch(/^the /);
    });

    it("should have 'the ' prefix for all source configs", () => {
      Object.entries(fileTypePromptRegistry).forEach(([, config]) => {
        expect(config.contentDesc).toMatch(/^the /);
      });
    });

    it("should have correct contentDesc in config", () => {
      expect(fileTypePromptRegistry.java.contentDesc).toBe("the JVM code");
      expect(fileTypePromptRegistry.javascript.contentDesc).toBe("the JavaScript/TypeScript code");
      expect(fileTypePromptRegistry.python.contentDesc).toBe("the Python code");
      expect(fileTypePromptRegistry.sql.contentDesc).toBe("the database DDL/DML/SQL code");
      expect(fileTypePromptRegistry.default.contentDesc).toBe("the source files");
    });
  });

  describe("App summary configs structure", () => {
    it("should have required fields for all app summary categories", () => {
      // contentDesc, dataBlockHeader, wrapInCodeBlock are no longer in config entries
      // They are set at instantiation time by the consumer (InsightCompletionExecutor)
      Object.entries(appSummaryConfigMap).forEach(([, config]) => {
        expect(config.instructions).toBeDefined();
        expect(config.responseSchema).toBeDefined();
      });
    });
  });

  describe("Config DATA_BLOCK_HEADERS", () => {
    it("should use CODE header for source prompts (set at instantiation time)", () => {
      // Source configs no longer include dataBlockHeader; it's added at instantiation
      const prompt = createSourcePrompt("java");
      expect(prompt.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
    });

    it("should use FILE_SUMMARIES header for app summary prompts (set at instantiation time)", () => {
      // App summary configs no longer include dataBlockHeader; it's added at instantiation
      const prompt = createAppSummaryPrompt("appDescription");
      expect(prompt.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
    });
  });

  describe("Rendered prompts maintain correct output", () => {
    it("should render source prompt with correct structure", () => {
      const javaPrompt = createSourcePrompt("java");
      const result = javaPrompt.renderPrompt("public class Test {}");

      // Should contain contentDesc with "the " prefix
      expect(result).toContain("the JVM code");

      // Should contain CODE header
      expect(result).toContain("CODE:");

      // Should contain the actual content
      expect(result).toContain("public class Test {}");

      // Should contain JSON schema section
      expect(result).toContain("The JSON response must follow this JSON schema:");
    });

    it("should render app summary prompt with correct structure", () => {
      const appDescPrompt = createAppSummaryPrompt("appDescription");
      const result = appDescPrompt.renderPrompt("test file summaries");

      // Should contain contentDesc
      expect(result).toContain("a set of source file summaries");

      // Should contain FILE_SUMMARIES header
      expect(result).toContain("FILE_SUMMARIES:");

      // Should contain the actual content
      expect(result).toContain("test file summaries");
    });
  });

  describe("Type safety", () => {
    it("should work with JSONSchemaPrompt class", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        dataBlockHeader: CODE_DATA_BLOCK_HEADER,
        wrapInCodeBlock: true,
      });

      expect(prompt.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
    });
  });
});
