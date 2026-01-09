import { z } from "zod";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { BASE_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE } from "../../../src/app/prompts/templates";
import { sourceConfigMap } from "../../../src/app/prompts/definitions/sources/sources.definitions";
import { LLMOutputFormat } from "../../../src/common/llm/types/llm.types";
import type { PromptDefinition, PromptConfigEntry } from "../../../src/app/prompts/prompt.types";

describe("Prompt Refactoring Improvements", () => {
  describe("TEXT-mode Rendering", () => {
    it("should not include JSON schema section for TEXT-mode prompts", () => {
      const textPrompt: PromptDefinition<z.ZodString> = {
        label: "Text Query",
        contentDesc: "source code files",
        instructions: [],
        template: CODEBASE_QUERY_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
        responseSchema: z.string(),
        outputFormat: LLMOutputFormat.TEXT,
      };

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
      const jsonPrompt: PromptDefinition = {
        label: "JSON Test",
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ name: z.string() }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = renderPrompt(jsonPrompt, { content: "sample code" });

      // Should contain JSON schema section
      expect(result).toContain("JSON response must follow");
      expect(result).toContain("```json");
      expect(result).toContain('"name"');
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

  describe("PromptConfigEntry interface compatibility", () => {
    it("should be compatible with SourceConfigEntry", () => {
      // TypeScript compilation test - if this compiles, the interfaces are compatible
      const sourceConfig = sourceConfigMap.java;
      const configEntry: PromptConfigEntry = {
        instructions: sourceConfig.instructions,
        responseSchema: sourceConfig.responseSchema,
        contentDesc: sourceConfig.contentDesc,
      };

      expect(configEntry.instructions).toBe(sourceConfig.instructions);
    });

    it("should require core fields and allow optional label and hasComplexSchema", () => {
      const config: PromptConfigEntry = {
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        // label and hasComplexSchema are optional
      };

      expect(config.label).toBeUndefined();
      expect(config.hasComplexSchema).toBeUndefined();
    });

    it("should support optional hasComplexSchema field", () => {
      const config: PromptConfigEntry = {
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        hasComplexSchema: true,
      };

      expect(config.hasComplexSchema).toBe(true);
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
