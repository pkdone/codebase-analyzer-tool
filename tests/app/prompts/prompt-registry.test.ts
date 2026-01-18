import { appSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import { fileTypePromptRegistry } from "../../../src/app/prompts/sources/sources.definitions";
import { AppSummaryCategories } from "../../../src/app/schemas/app-summaries.schema";
import { JSONSchemaPrompt } from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";
import { z } from "zod";

describe("JSONSchemaPrompt Configurations", () => {
  describe("Structure", () => {
    it("should have app summary configs for all categories", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        expect(appSummaryConfigMap).toHaveProperty(category);
        expect(appSummaryConfigMap[category]).toBeDefined();
      });
    });

    it("should have source configs for all file types", () => {
      const expectedFileTypes = [
        "java",
        "javascript",
        "csharp",
        "python",
        "ruby",
        "sql",
        "markdown",
        "xml",
        "jsp",
        "maven",
        "gradle",
        "ant",
        "npm",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "shell-script",
        "batch-script",
        "jcl",
        "default",
      ] as const;

      expectedFileTypes.forEach((fileType) => {
        expect(fileTypePromptRegistry).toHaveProperty(fileType);
        expect(fileTypePromptRegistry[fileType]).toBeDefined();
      });
    });
  });

  describe("App Summary Configs", () => {
    it("should have valid config structure for each category", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];
        // contentDesc, dataBlockHeader, and wrapInCodeBlock are no longer in the config entries;
        // they are set at instantiation time by the consumer (InsightCompletionExecutor)
        expect(config).toHaveProperty("instructions");
        expect(config).toHaveProperty("responseSchema");

        // Verify types
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.responseSchema).toBeInstanceOf(z.ZodType);
      });
    });

    it("should have non-empty instructions for each category", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const instructions = appSummaryConfigMap[category].instructions;
        expect(instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Source Configs", () => {
    it("should have valid config structure for each file type", () => {
      const fileType = "java"; // Test one as representative
      const config = fileTypePromptRegistry[fileType];

      expect(config).toHaveProperty("contentDesc");
      expect(config).toHaveProperty("instructions");
      expect(config).toHaveProperty("responseSchema");
      // dataBlockHeader and wrapInCodeBlock are no longer in the registry entries;
      // they are set at instantiation time by the consumer
    });

    it("should have non-empty instructions for code file types", () => {
      const codeFileTypes = ["java", "javascript", "python", "csharp", "ruby"] as const;
      codeFileTypes.forEach((fileType) => {
        const instructions = fileTypePromptRegistry[fileType].instructions;
        expect(instructions.length).toBeGreaterThan(0);
      });
    });

    it("should create valid JSONSchemaPrompt instances from configs when presentation values are added", () => {
      const config = fileTypePromptRegistry.java;
      // dataBlockHeader and wrapInCodeBlock must now be explicitly provided
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        ...config,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });

      expect(prompt.contentDesc).toBe(config.contentDesc);
      expect(prompt.instructions).toEqual(config.instructions);
      expect(prompt.dataBlockHeader).toBe("CODE");
      expect(prompt.wrapInCodeBlock).toBe(true);
    });
  });

  describe("Schema Validation", () => {
    it("should have valid Zod schemas for all app summary categories", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const schema = appSummaryConfigMap[category].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodType);

        // Verify the schema can be used for parsing
        expect(() => schema.safeParse({})).not.toThrow();
      });
    });

    it("should have valid Zod schemas for all source file types", () => {
      const fileTypes = ["java", "javascript", "python"] as const;
      fileTypes.forEach((fileType) => {
        const schema = fileTypePromptRegistry[fileType].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodType);

        // Verify the schema can be used for parsing
        expect(() => schema.safeParse({})).not.toThrow();
      });
    });
  });
});
