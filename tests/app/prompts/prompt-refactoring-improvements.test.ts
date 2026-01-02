import { z } from "zod";
import {
  createTextPromptDefinition,
  createJsonPromptDefinition,
} from "../../../src/app/prompts/definitions/prompt-factory";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { BASE_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE } from "../../../src/app/prompts/templates";
import { sourceConfigMap } from "../../../src/app/prompts/definitions/sources/sources.definitions";
import { PREBUILT_BLOCKS } from "../../../src/app/prompts/definitions/sources/sources.fragments";
import { INSTRUCTION_SECTION_TITLES } from "../../../src/app/prompts/definitions/instruction-utils";
import { LLMOutputFormat } from "../../../src/common/llm/types/llm.types";
import { createReduceInsightsPrompt } from "../../../src/app/prompts/prompt-registry";
import type {
  PromptDefinition,
  BasePromptConfigEntry,
} from "../../../src/app/prompts/prompt.types";

describe("Prompt Refactoring Improvements", () => {
  describe("createJsonPromptDefinition", () => {
    const testSchema = z.object({
      name: z.string(),
      value: z.number(),
    });

    it("should create a JSON-mode prompt definition with correct defaults", () => {
      const result = createJsonPromptDefinition({
        label: "Test Prompt",
        contentDesc: "test content",
        instructions: ["instruction 1"],
        responseSchema: testSchema,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
      });

      expect(result.outputFormat).toBe(LLMOutputFormat.JSON);
      expect(result.wrapInCodeBlock).toBe(false);
      expect(result.hasComplexSchema).toBe(false);
      expect(result.label).toBe("Test Prompt");
      expect(result.contentDesc).toBe("test content");
      expect(result.responseSchema).toBe(testSchema);
    });

    it("should allow overriding default values", () => {
      const result = createJsonPromptDefinition({
        label: "Test Prompt",
        contentDesc: "test content",
        instructions: [],
        responseSchema: testSchema,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
        hasComplexSchema: true,
      });

      expect(result.wrapInCodeBlock).toBe(true);
      expect(result.hasComplexSchema).toBe(true);
    });

    it("should preserve responseSchema type", () => {
      const result = createJsonPromptDefinition({
        label: "Test",
        contentDesc: "test",
        instructions: [],
        responseSchema: testSchema,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
      });

      // Verify schema works for parsing
      const parseResult = result.responseSchema.safeParse({ name: "test", value: 42 });
      expect(parseResult.success).toBe(true);
    });
  });

  describe("createReduceInsightsPrompt uses createJsonPromptDefinition", () => {
    it("should have outputFormat set to JSON", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.outputFormat).toBe(LLMOutputFormat.JSON);
    });

    it("should have default values from createJsonPromptDefinition", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const result = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(result.wrapInCodeBlock).toBe(false);
      expect(result.hasComplexSchema).toBe(false);
    });
  });

  describe("TEXT-mode Rendering", () => {
    it("should not include JSON schema section for TEXT-mode prompts", () => {
      const textPrompt = createTextPromptDefinition({
        label: "Text Query",
        contentDesc: "source code files",
        instructions: [],
        template: CODEBASE_QUERY_TEMPLATE,
        dataBlockHeader: "CODE",
      });

      const result = renderPrompt(textPrompt, {
        content: "sample code",
        question: "What does this code do?",
      });

      // Should not contain JSON schema section
      expect(result).not.toContain("JSON response must follow");
      expect(result).not.toContain("```json");
      expect(result).not.toContain('"type": "string"');

      // Should contain the expected content
      expect(result).toContain("What does this code do?");
      expect(result).toContain("sample code");
    });

    it("should include JSON schema section for JSON-mode prompts", () => {
      const jsonPrompt = createJsonPromptDefinition({
        label: "JSON Test",
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ name: z.string() }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
      });

      const result = renderPrompt(jsonPrompt, { content: "sample code" });

      // Should contain JSON schema section
      expect(result).toContain("JSON response must follow");
      expect(result).toContain("```json");
      expect(result).toContain('"name"');
    });
  });

  describe("PREBUILT_BLOCKS", () => {
    it("should have BASIC_INFO_CLASS block with correct structure", () => {
      expect(PREBUILT_BLOCKS.BASIC_INFO_CLASS).toBeDefined();
      expect(PREBUILT_BLOCKS.BASIC_INFO_CLASS).toContain("__Basic Information__");
      expect(PREBUILT_BLOCKS.BASIC_INFO_CLASS).toContain("class/interface");
      expect(PREBUILT_BLOCKS.BASIC_INFO_CLASS).toContain("purpose");
      expect(PREBUILT_BLOCKS.BASIC_INFO_CLASS).toContain("implementation");
    });

    it("should have BASIC_INFO_MODULE block with correct structure", () => {
      expect(PREBUILT_BLOCKS.BASIC_INFO_MODULE).toBeDefined();
      expect(PREBUILT_BLOCKS.BASIC_INFO_MODULE).toContain("__Basic Information__");
      expect(PREBUILT_BLOCKS.BASIC_INFO_MODULE).toContain("module");
      expect(PREBUILT_BLOCKS.BASIC_INFO_MODULE).toContain("purpose");
    });

    it("should have CODE_QUALITY_METRICS block with correct structure", () => {
      expect(PREBUILT_BLOCKS.CODE_QUALITY_METRICS).toBeDefined();
      expect(PREBUILT_BLOCKS.CODE_QUALITY_METRICS).toContain("__Code Quality Metrics__");
      expect(PREBUILT_BLOCKS.CODE_QUALITY_METRICS).toContain("cyclomaticComplexity");
      expect(PREBUILT_BLOCKS.CODE_QUALITY_METRICS).toContain("linesOfCode");
    });

    it("should have consistent title-fragment pairing", () => {
      // Verify BASIC_INFO blocks use correct title
      expect(PREBUILT_BLOCKS.BASIC_INFO_CLASS).toContain(
        `__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`,
      );
      expect(PREBUILT_BLOCKS.BASIC_INFO_MODULE).toContain(
        `__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`,
      );
      expect(PREBUILT_BLOCKS.CODE_QUALITY_METRICS).toContain(
        `__${INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS}__`,
      );
    });
  });

  describe("createStandardCodeConfig (via sourceConfigMap)", () => {
    const standardLanguages = [
      "java",
      "javascript",
      "csharp",
      "python",
      "ruby",
      "c",
      "cpp",
    ] as const;

    it.each(standardLanguages)("should create valid config for %s", (language) => {
      const config = sourceConfigMap[language];

      expect(config).toBeDefined();
      expect(config.contentDesc).toBeDefined();
      expect(config.responseSchema).toBeDefined();
      expect(config.instructions).toBeDefined();
      expect(Array.isArray(config.instructions)).toBe(true);
    });

    it.each(standardLanguages)("should have 5 instruction blocks for %s", (language) => {
      const config = sourceConfigMap[language];
      expect(config.instructions).toHaveLength(5);
    });

    it.each(standardLanguages)("should have correct section titles for %s", (language) => {
      const config = sourceConfigMap[language];
      const [basicInfo, refs, integration, db, quality] = config.instructions;

      expect(basicInfo).toContain("__Basic Information__");
      expect(refs).toContain("__References and Dependencies__");
      expect(integration).toContain("__Integration Points__");
      expect(db).toContain("__Database Integration Analysis__");
      expect(quality).toContain("__Code Quality Metrics__");
    });

    it("should use MODULE base for C", () => {
      const config = sourceConfigMap.c;
      expect(config.instructions[0]).toContain("module");
    });

    it("should use CLASS base for other languages", () => {
      const classBasedLanguages = ["java", "javascript", "csharp", "python", "ruby", "cpp"];
      for (const lang of classBasedLanguages) {
        const config = sourceConfigMap[lang as keyof typeof sourceConfigMap];
        expect(config.instructions[0]).toContain("class/interface");
      }
    });

    it("should include Python complexity metrics", () => {
      const config = sourceConfigMap.python;
      const qualityBlock = config.instructions[4];
      expect(qualityBlock).toContain("Cyclomatic complexity (Python)");
    });

    it("should include kind override for C#", () => {
      const config = sourceConfigMap.csharp;
      expect(config.instructions[0]).toContain("record");
      expect(config.instructions[0]).toContain("struct");
    });

    it("should include kind override for C++", () => {
      const config = sourceConfigMap.cpp;
      expect(config.instructions[0]).toContain("namespace");
      expect(config.instructions[0]).toContain("union");
    });
  });

  describe("Prompt text preservation", () => {
    it("should preserve Java prompt text structure", () => {
      const config = sourceConfigMap.java;
      const fullInstructions = config.instructions.join("\n\n");

      // Key Java-specific content should be preserved
      expect(fullInstructions).toContain("JPA");
      expect(fullInstructions).toContain("JDBC");
      expect(fullInstructions).toContain("Spring");
      expect(fullInstructions).toContain("JAX-RS");
    });

    it("should preserve JavaScript prompt text structure", () => {
      const config = sourceConfigMap.javascript;
      const fullInstructions = config.instructions.join("\n\n");

      // Key JS-specific content should be preserved
      expect(fullInstructions).toContain("Mongoose");
      expect(fullInstructions).toContain("Prisma");
      expect(fullInstructions).toContain("Express");
    });

    it("should preserve database integration instructions", () => {
      const config = sourceConfigMap.java;
      const dbBlock = config.instructions[3];

      expect(dbBlock).toContain("mechanism");
      expect(dbBlock).toContain("description");
      expect(dbBlock).toContain("codeExample");
      expect(dbBlock).toContain("tablesAccessed");
    });

    it("should preserve code quality instructions", () => {
      const config = sourceConfigMap.java;
      const qualityBlock = config.instructions[4];

      expect(qualityBlock).toContain("cyclomaticComplexity");
      expect(qualityBlock).toContain("linesOfCode");
      expect(qualityBlock).toContain("codeSmells");
      expect(qualityBlock).toContain("LONG METHOD");
      expect(qualityBlock).toContain("GOD CLASS");
    });
  });

  describe("BasePromptConfigEntry interface compatibility", () => {
    it("should be compatible with SourceConfigEntry", () => {
      // TypeScript compilation test - if this compiles, the interfaces are compatible
      const sourceConfig = sourceConfigMap.java;
      const baseCompatible: BasePromptConfigEntry = {
        instructions: sourceConfig.instructions,
        responseSchema: sourceConfig.responseSchema,
        contentDesc: sourceConfig.contentDesc,
      };

      expect(baseCompatible.instructions).toBe(sourceConfig.instructions);
    });

    it("should allow optional fields", () => {
      const minimalConfig: BasePromptConfigEntry = {
        instructions: ["test instruction"],
      };

      expect(minimalConfig.label).toBeUndefined();
      expect(minimalConfig.contentDesc).toBeUndefined();
      expect(minimalConfig.responseSchema).toBeUndefined();
      expect(minimalConfig.hasComplexSchema).toBeUndefined();
    });
  });

  describe("Rendered prompt comparison", () => {
    it("should render Java prompt with correct structure", () => {
      const testPromptDef: PromptDefinition = {
        label: "Java",
        contentDesc: `the ${sourceConfigMap.java.contentDesc}`,
        instructions: sourceConfigMap.java.instructions,
        responseSchema: sourceConfigMap.java.responseSchema,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      const result = renderPrompt(testPromptDef, {
        content: "public class Test {}",
      });

      expect(result).toContain("JVM code");
      expect(result).toContain("__Basic Information__");
      expect(result).toContain("__References and Dependencies__");
      expect(result).toContain("__Integration Points__");
      expect(result).toContain("__Database Integration Analysis__");
      expect(result).toContain("__Code Quality Metrics__");
      expect(result).toContain("public class Test {}");
    });
  });
});
