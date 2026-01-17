import { z } from "zod";
import { Prompt } from "../../../src/common/prompts/prompt";
import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";
import { fileTypePromptRegistry } from "../../../src/app/prompts/definitions/sources/sources.definitions";
import { appSummaryConfigMap } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.definitions";
import { CODE_DATA_BLOCK_HEADER } from "../../../src/app/prompts/definitions/sources/definitions/source-config-factories";
import { FILE_SUMMARIES_DATA_BLOCK_HEADER } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.factories";

/**
 * Tests for the prompt refactoring changes:
 * 1. Schema section rendering via renderPrompt
 * 2. Self-contained source configs with "the " prefix
 * 3. Self-contained app summary configs with contentDesc
 * 4. Simplified Prompt class constructor
 */
describe("Prompt Refactoring", () => {
  describe("Schema section rendering via renderPrompt", () => {
    it("should generate proper JSON schema section", () => {
      const prompt = new Prompt(
        {
          contentDesc: "test content",
          instructions: ["test instruction"],
          responseSchema: z.object({ name: z.string(), count: z.number() }),
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        "{{schemaSection}}",
      );

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
      const prompt = new Prompt(
        {
          contentDesc: "test content",
          instructions: ["test instruction"],
          responseSchema: z.array(z.object({ id: z.string(), value: z.number() })),
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        "{{schemaSection}}",
      );

      const result = prompt.renderPrompt("test data");

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"id"');
      expect(result).toContain('"value"');
    });

    it("should include schema section in full prompt", () => {
      const prompt = new Prompt(
        {
          contentDesc: "test content",
          instructions: ["test instruction"],
          responseSchema: z.object({ field: z.string() }),
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: false,
        },
        "Test {{contentDesc}} {{schemaSection}} {{dataBlockHeader}}:{{content}}",
      );

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

    it("should propagate contentDesc correctly to prompt definitions", () => {
      expect(appPromptManager.sources.java.contentDesc).toBe("the JVM code");
      expect(appPromptManager.sources.javascript.contentDesc).toBe(
        "the JavaScript/TypeScript code",
      );
      expect(appPromptManager.sources.python.contentDesc).toBe("the Python code");
      expect(appPromptManager.sources.sql.contentDesc).toBe("the database DDL/DML/SQL code");
      expect(appPromptManager.sources.default.contentDesc).toBe("the source files");
    });
  });

  describe("App summary configs with contentDesc", () => {
    it("should have contentDesc defined for all app summary categories", () => {
      Object.entries(appSummaryConfigMap).forEach(([, config]) => {
        expect(config.contentDesc).toBeDefined();
        expect(typeof config.contentDesc).toBe("string");
        expect(config.contentDesc.length).toBeGreaterThan(0);
      });
    });

    it("should have consistent contentDesc value", () => {
      const expectedContentDesc = "a set of source file summaries";

      Object.entries(appSummaryConfigMap).forEach(([, config]) => {
        expect(config.contentDesc).toBe(expectedContentDesc);
      });
    });

    it("should propagate contentDesc to prompt definitions", () => {
      const expectedContentDesc = "a set of source file summaries";

      Object.entries(appPromptManager.appSummaries).forEach(([, definition]) => {
        expect(definition.contentDesc).toBe(expectedContentDesc);
      });
    });
  });

  describe("Prompt definitions use DATA_BLOCK_HEADERS", () => {
    it("should use CODE header for source prompts", () => {
      Object.values(appPromptManager.sources).forEach((definition) => {
        expect(definition.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
      });
    });

    it("should use FILE_SUMMARIES header for app summary prompts", () => {
      Object.values(appPromptManager.appSummaries).forEach((definition) => {
        expect(definition.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
      });
    });

    it("should use CODE header for codebase query prompt", () => {
      expect(appPromptManager.codebaseQuery.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
    });
  });

  describe("Rendered prompts maintain correct output", () => {
    it("should render source prompt with correct structure", () => {
      const javaPrompt = appPromptManager.sources.java;
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
      const appDescPrompt = appPromptManager.appSummaries.appDescription;
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
    it("should work with Prompt class", () => {
      const prompt = new Prompt(
        {
          contentDesc: "test content",
          instructions: ["test instruction"],
          responseSchema: z.string(),
          dataBlockHeader: CODE_DATA_BLOCK_HEADER,
          wrapInCodeBlock: true,
        },
        "test template",
      );

      expect(prompt.dataBlockHeader).toBe(CODE_DATA_BLOCK_HEADER);
    });
  });
});
