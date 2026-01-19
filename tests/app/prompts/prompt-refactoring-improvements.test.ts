import { z } from "zod";
import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt-builders";
import { fileTypePromptRegistry } from "../../../src/app/prompts/sources/sources.definitions";

describe("JSONSchemaPrompt Refactoring Improvements", () => {
  describe("JSON Schema Rendering", () => {
    it("should include JSON schema section for JSON-mode prompts", () => {
      // JSON mode = responseSchema is provided (now mandatory)
      const jsonPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ name: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });

      const result = jsonPrompt.renderPrompt("sample code");

      // Should contain JSON schema section
      expect(result).toContain("JSON response must follow");
      expect(result).toContain("```json");
      expect(result).toContain('"name"');
      // Should contain the expected content
      expect(result).toContain("sample code");
    });
  });

  describe("createStandardCodeConfig (via fileTypePromptRegistry)", () => {
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
      const config = fileTypePromptRegistry[language];

      expect(config).toBeDefined();
      expect(config.contentDesc).toBeDefined();
      expect(config.responseSchema).toBeDefined();
      expect(config.instructions).toBeDefined();
      expect(Array.isArray(config.instructions)).toBe(true);
    });

    it.each(standardLanguages)("should have 5 instruction blocks for %s", (language) => {
      const config = fileTypePromptRegistry[language];
      expect(config.instructions).toHaveLength(5);
    });

    it.each(standardLanguages)("should have correct section titles for %s", (language) => {
      const config = fileTypePromptRegistry[language];
      const [basicInfo, refs, integration, db, quality] = config.instructions;

      expect(basicInfo).toContain("__Basic Information__");
      expect(refs).toContain("__References and Dependencies__");
      expect(integration).toContain("__Integration Points__");
      expect(db).toContain("__Database Integration Analysis__");
      expect(quality).toContain("__Code Quality Metrics__");
    });

    it("should use MODULE base for C", () => {
      const config = fileTypePromptRegistry.c;
      expect(config.instructions[0]).toContain("module");
    });

    it("should use CLASS base for other languages", () => {
      const classBasedLanguages = ["java", "javascript", "csharp", "python", "ruby", "cpp"];
      for (const lang of classBasedLanguages) {
        const config = fileTypePromptRegistry[lang as keyof typeof fileTypePromptRegistry];
        expect(config.instructions[0]).toContain("class/interface");
      }
    });

    it("should include Python complexity metrics", () => {
      const config = fileTypePromptRegistry.python;
      const qualityBlock = config.instructions[4];
      expect(qualityBlock).toContain("Cyclomatic complexity (Python)");
    });

    it("should include kind override for C#", () => {
      const config = fileTypePromptRegistry.csharp;
      expect(config.instructions[0]).toContain("record");
      expect(config.instructions[0]).toContain("struct");
    });

    it("should include kind override for C++", () => {
      const config = fileTypePromptRegistry.cpp;
      expect(config.instructions[0]).toContain("namespace");
      expect(config.instructions[0]).toContain("union");
    });
  });

  describe("JSONSchemaPrompt text preservation", () => {
    it("should preserve Java prompt text structure", () => {
      const config = fileTypePromptRegistry.java;
      const fullInstructions = config.instructions.join("\n\n");

      // Key Java-specific content should be preserved
      expect(fullInstructions).toContain("JPA");
      expect(fullInstructions).toContain("JDBC");
      expect(fullInstructions).toContain("Spring");
      expect(fullInstructions).toContain("JAX-RS");
    });

    it("should preserve JavaScript prompt text structure", () => {
      const config = fileTypePromptRegistry.javascript;
      const fullInstructions = config.instructions.join("\n\n");

      // Key JS-specific content should be preserved
      expect(fullInstructions).toContain("Mongoose");
      expect(fullInstructions).toContain("Prisma");
      expect(fullInstructions).toContain("Express");
    });

    it("should preserve database integration instructions", () => {
      const config = fileTypePromptRegistry.java;
      const dbBlock = config.instructions[3];

      expect(dbBlock).toContain("mechanism");
      expect(dbBlock).toContain("description");
      expect(dbBlock).toContain("codeExample");
      expect(dbBlock).toContain("tablesAccessed");
    });

    it("should preserve code quality instructions", () => {
      const config = fileTypePromptRegistry.java;
      const qualityBlock = config.instructions[4];

      expect(qualityBlock).toContain("cyclomaticComplexity");
      expect(qualityBlock).toContain("linesOfCode");
      expect(qualityBlock).toContain("codeSmells");
      expect(qualityBlock).toContain("LONG METHOD");
      expect(qualityBlock).toContain("GOD CLASS");
    });
  });

  describe("JSONSchemaPromptConfig interface compatibility", () => {
    it("should be compatible with SourceConfigEntry when presentation values are added", () => {
      // TypeScript compilation test - if this compiles, the interfaces are compatible
      // Note: dataBlockHeader and wrapInCodeBlock must now be added at instantiation time
      const sourceConfig = fileTypePromptRegistry.java;
      const configEntry: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        instructions: sourceConfig.instructions,
        responseSchema: sourceConfig.responseSchema,
        contentDesc: sourceConfig.contentDesc,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(configEntry.instructions).toBe(sourceConfig.instructions);
    });

    it("should require core fields including dataBlockHeader and wrapInCodeBlock", () => {
      const config: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
        // hasComplexSchema is optional
      };

      expect(config.hasComplexSchema).toBeUndefined();
      expect(config.hasComplexSchema).toBeUndefined();
      expect(config.dataBlockHeader).toBe("CODE");
      expect(config.wrapInCodeBlock).toBe(true);
    });

    it("should support optional hasComplexSchema field", () => {
      const config: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
        hasComplexSchema: true,
      };

      expect(config.hasComplexSchema).toBe(true);
    });
  });

  describe("Rendered prompt comparison", () => {
    it("should render Java prompt with correct structure", () => {
      const testPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: `the ${fileTypePromptRegistry.java.contentDesc}`,
        instructions: fileTypePromptRegistry.java.instructions,
        responseSchema: fileTypePromptRegistry.java.responseSchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });

      const result = testPrompt.renderPrompt("public class Test {}");

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
