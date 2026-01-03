import { z } from "zod";
import {
  DATA_BLOCK_HEADERS,
  type DataBlockHeader,
  type PromptDefinition,
} from "../../../src/app/prompts/prompt.types";
import { buildSchemaSection } from "../../../src/app/prompts/templates";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import {
  promptManager,
  createReduceInsightsPrompt,
} from "../../../src/app/prompts/prompt-registry";
import { sourceConfigMap } from "../../../src/app/prompts/definitions/sources/sources.definitions";
import { appSummaryConfigMap } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.definitions";

/**
 * Tests for the prompt refactoring changes:
 * 1. DATA_BLOCK_HEADERS const object
 * 2. buildSchemaSection moved to templates.ts
 * 3. Self-contained source configs with "the " prefix
 * 4. Self-contained app summary configs with contentDesc
 * 5. Simplified createPromptMetadata factory
 */
describe("Prompt Refactoring", () => {
  describe("DATA_BLOCK_HEADERS const object", () => {
    it("should define all three header types", () => {
      expect(DATA_BLOCK_HEADERS.CODE).toBe("CODE");
      expect(DATA_BLOCK_HEADERS.FILE_SUMMARIES).toBe("FILE_SUMMARIES");
      expect(DATA_BLOCK_HEADERS.FRAGMENTED_DATA).toBe("FRAGMENTED_DATA");
    });

    it("should have as const assertion preventing mutation at compile time", () => {
      // The `as const` assertion makes this a readonly object at TypeScript level.
      // At runtime, JavaScript doesn't enforce this, but the compile-time check ensures
      // that code attempting to modify these values will produce a TypeScript error.

      // This test verifies the values are correct (immutability is enforced by TypeScript)
      expect(DATA_BLOCK_HEADERS.CODE).toBe("CODE");
      expect(DATA_BLOCK_HEADERS.FILE_SUMMARIES).toBe("FILE_SUMMARIES");
      expect(DATA_BLOCK_HEADERS.FRAGMENTED_DATA).toBe("FRAGMENTED_DATA");

      // Note: Object.isFrozen would return false because `as const` doesn't call Object.freeze()
      // The immutability is at the type level, not runtime level
    });

    it("should work as DataBlockHeader type", () => {
      // Type-level test: these should compile without error
      const codeHeader: DataBlockHeader = DATA_BLOCK_HEADERS.CODE;
      const summariesHeader: DataBlockHeader = DATA_BLOCK_HEADERS.FILE_SUMMARIES;
      const fragmentedHeader: DataBlockHeader = DATA_BLOCK_HEADERS.FRAGMENTED_DATA;

      expect([codeHeader, summariesHeader, fragmentedHeader]).toHaveLength(3);
    });
  });

  describe("buildSchemaSection in templates.ts", () => {
    it("should generate proper JSON schema section", () => {
      const testSchema = z.object({
        name: z.string(),
        count: z.number(),
      });

      const result = buildSchemaSection(testSchema);

      // Should contain schema header
      expect(result).toContain("The JSON response must follow this JSON schema:");

      // Should contain JSON code block markers
      expect(result).toContain("```json");
      expect(result).toContain("```");

      // Should contain schema properties
      expect(result).toContain('"name"');
      expect(result).toContain('"count"');
      expect(result).toContain('"type": "object"');

      // Should contain FORCE_JSON_FORMAT instructions
      expect(result).toContain("The response MUST be valid JSON");
    });

    it("should work with array schemas", () => {
      const arraySchema = z.array(
        z.object({
          id: z.string(),
          value: z.number(),
        }),
      );

      const result = buildSchemaSection(arraySchema);

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"id"');
      expect(result).toContain('"value"');
    });

    it("should be used by prompt renderer", () => {
      const definition: PromptDefinition = {
        label: "Test",
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ field: z.string() }),
        template: "Test {{contentDesc}} {{schemaSection}} {{dataBlockHeader}}:{{content}}",
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: false,
      };

      const result = renderPrompt(definition, { content: "test data" });

      // The rendered prompt should contain the schema section
      expect(result).toContain("The JSON response must follow this JSON schema:");
      expect(result).toContain('"field"');
    });
  });

  describe("Source configs with 'the ' prefix", () => {
    const codeFileTypes = ["java", "javascript", "csharp", "python", "ruby", "c", "cpp"] as const;

    it.each(codeFileTypes)("should have 'the ' prefix for %s contentDesc", (fileType) => {
      const config = sourceConfigMap[fileType];
      expect(config.contentDesc).toMatch(/^the /);
    });

    it("should have 'the ' prefix for all source configs", () => {
      Object.entries(sourceConfigMap).forEach(([, config]) => {
        expect(config.contentDesc).toMatch(/^the /);
      });
    });

    it("should propagate contentDesc correctly to prompt definitions", () => {
      expect(promptManager.sources.java.contentDesc).toBe("the JVM code");
      expect(promptManager.sources.javascript.contentDesc).toBe("the JavaScript/TypeScript code");
      expect(promptManager.sources.python.contentDesc).toBe("the Python code");
      expect(promptManager.sources.sql.contentDesc).toBe("the database DDL/DML/SQL code");
      expect(promptManager.sources.default.contentDesc).toBe("the source files");
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

      Object.entries(promptManager.appSummaries).forEach(([, definition]) => {
        expect(definition.contentDesc).toBe(expectedContentDesc);
      });
    });
  });

  describe("Prompt definitions use DATA_BLOCK_HEADERS", () => {
    it("should use CODE header for source prompts", () => {
      Object.values(promptManager.sources).forEach((definition) => {
        expect(definition.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      });
    });

    it("should use FILE_SUMMARIES header for app summary prompts", () => {
      Object.values(promptManager.appSummaries).forEach((definition) => {
        expect(definition.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
      });
    });

    it("should use CODE header for codebase query prompt", () => {
      expect(promptManager.codebaseQuery.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
    });

    it("should use FRAGMENTED_DATA header for reduce insights prompts", () => {
      const testSchema = z.object({ items: z.array(z.string()) });
      const reducePrompt = createReduceInsightsPrompt("technologies", "technologies", testSchema);

      expect(reducePrompt.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
    });
  });

  describe("Rendered prompts maintain correct output", () => {
    it("should render source prompt with correct structure", () => {
      const javaPrompt = promptManager.sources.java;
      const result = renderPrompt(javaPrompt, { content: "public class Test {}" });

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
      const appDescPrompt = promptManager.appSummaries.appDescription;
      const result = renderPrompt(appDescPrompt, { content: "test file summaries" });

      // Should contain contentDesc
      expect(result).toContain("a set of source file summaries");

      // Should contain FILE_SUMMARIES header
      expect(result).toContain("FILE_SUMMARIES:");

      // Should contain the actual content
      expect(result).toContain("test file summaries");
    });

    it("should render reduce insights prompt with correct structure", () => {
      const testSchema = z.object({ technologies: z.array(z.string()) });
      const reducePrompt = createReduceInsightsPrompt("technologies", "technologies", testSchema);
      const result = renderPrompt(reducePrompt, {
        content: JSON.stringify({ technologies: ["TypeScript"] }),
      });

      // Should contain FRAGMENTED_DATA header
      expect(result).toContain("FRAGMENTED_DATA:");

      // Should contain consolidation instructions
      expect(result).toContain("technologies");

      // Should contain the actual content
      expect(result).toContain("TypeScript");
    });
  });

  describe("Type safety", () => {
    it("should enforce DataBlockHeader type", () => {
      // This test verifies that invalid values are caught at compile time
      // The as const assertion ensures type literals are preserved
      const validHeaders: DataBlockHeader[] = [
        DATA_BLOCK_HEADERS.CODE,
        DATA_BLOCK_HEADERS.FILE_SUMMARIES,
        DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
      ];

      expect(validHeaders).toHaveLength(3);
      expect(validHeaders).toContain("CODE");
      expect(validHeaders).toContain("FILE_SUMMARIES");
      expect(validHeaders).toContain("FRAGMENTED_DATA");
    });

    it("should work with PromptDefinition interface", () => {
      const definition: PromptDefinition = {
        label: "Test",
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        template: "test template",
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: true,
      };

      expect(definition.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
    });
  });
});
