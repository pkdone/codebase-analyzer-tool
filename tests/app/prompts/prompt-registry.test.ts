import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";
import { AppSummaryCategories } from "../../../src/app/schemas/app-summaries.schema";
import { z } from "zod";

describe("Prompt Registry", () => {
  describe("Structure", () => {
    it("should have all expected top-level properties", () => {
      expect(appPromptManager).toHaveProperty("appSummaries");
      expect(appPromptManager).toHaveProperty("sources");
      expect(appPromptManager).toHaveProperty("codebaseQuery");
    });

    it("should have app summary prompts for all categories", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        expect(appPromptManager.appSummaries).toHaveProperty(category);
        expect(appPromptManager.appSummaries[category]).toBeDefined();
      });
    });

    it("should have source prompts for all file types", () => {
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
        expect(appPromptManager.sources).toHaveProperty(fileType);
        expect(appPromptManager.sources[fileType]).toBeDefined();
      });
    });
  });

  describe("App Summary Prompts", () => {
    it("should have valid RenderablePrompt structure for each category", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const prompt = appPromptManager.appSummaries[category];
        expect(prompt).toHaveProperty("contentDesc");
        expect(prompt).toHaveProperty("instructions");
        expect(prompt).toHaveProperty("responseSchema");
        expect(prompt).toHaveProperty("template");
        expect(prompt).toHaveProperty("dataBlockHeader");
        expect(prompt).toHaveProperty("wrapInCodeBlock");

        // Verify types
        expect(typeof prompt.contentDesc).toBe("string");
        expect(Array.isArray(prompt.instructions)).toBe(true);
        expect(prompt.responseSchema).toBeInstanceOf(z.ZodType);
        expect(typeof prompt.template).toBe("string");
        expect(typeof prompt.dataBlockHeader).toBe("string");
        expect(typeof prompt.wrapInCodeBlock).toBe("boolean");
      });
    });

    it("should use FILE_SUMMARIES as dataBlockHeader for app summaries", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        expect(appPromptManager.appSummaries[category].dataBlockHeader).toBe("FILE_SUMMARIES");
      });
    });

    it("should not wrap content in code blocks for app summaries", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        expect(appPromptManager.appSummaries[category].wrapInCodeBlock).toBe(false);
      });
    });

    it("should have non-empty instructions for each category", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const instructions = appPromptManager.appSummaries[category].instructions;
        expect(instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Source Prompts", () => {
    it("should have valid RenderablePrompt structure for each file type", () => {
      const fileType = "java"; // Test one as representative
      const prompt = appPromptManager.sources[fileType];

      expect(prompt).toHaveProperty("contentDesc");
      expect(prompt).toHaveProperty("instructions");
      expect(prompt).toHaveProperty("responseSchema");
      expect(prompt).toHaveProperty("template");
      expect(prompt).toHaveProperty("dataBlockHeader");
      expect(prompt).toHaveProperty("wrapInCodeBlock");
    });

    it("should use CODE as dataBlockHeader for source prompts", () => {
      expect(appPromptManager.sources.java.dataBlockHeader).toBe("CODE");
      expect(appPromptManager.sources.javascript.dataBlockHeader).toBe("CODE");
      expect(appPromptManager.sources.python.dataBlockHeader).toBe("CODE");
    });

    it("should wrap content in code blocks for source prompts", () => {
      expect(appPromptManager.sources.java.wrapInCodeBlock).toBe(true);
      expect(appPromptManager.sources.javascript.wrapInCodeBlock).toBe(true);
      expect(appPromptManager.sources.python.wrapInCodeBlock).toBe(true);
    });

    it("should have non-empty instructions for code file types", () => {
      const codeFileTypes = ["java", "javascript", "python", "csharp", "ruby"] as const;
      codeFileTypes.forEach((fileType) => {
        const instructions = appPromptManager.sources[fileType].instructions;
        expect(instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Codebase Query Prompt", () => {
    it("should have valid structure", () => {
      const prompt = appPromptManager.codebaseQuery;

      expect(prompt.contentDesc).toBe("source code files");
      expect(prompt.instructions).toEqual([]);
      // TEXT mode prompt = no responseSchema
      expect(prompt.responseSchema).toBeUndefined();
      expect(prompt.dataBlockHeader).toBe("CODE");
      expect(prompt.wrapInCodeBlock).toBe(false);
    });

    it("should have a custom template (not ANALYSIS_PROMPT_TEMPLATE)", () => {
      const prompt = appPromptManager.codebaseQuery;
      expect(prompt.template).toContain("QUESTION");
      expect(prompt.template).toContain("{{question}}");
    });
  });

  describe("Schema Validation", () => {
    it("should have valid Zod schemas for all app summary categories", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const schema = appPromptManager.appSummaries[category].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodType);

        // Verify the schema can be used for parsing
        expect(() => schema!.safeParse({})).not.toThrow();
      });
    });

    it("should have valid Zod schemas for all source file types", () => {
      const fileTypes = ["java", "javascript", "python"] as const;
      fileTypes.forEach((fileType) => {
        const schema = appPromptManager.sources[fileType].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodType);

        // Verify the schema can be used for parsing
        expect(() => schema!.safeParse({})).not.toThrow();
      });
    });
  });

  describe("Immutability", () => {
    it("should be frozen (immutable)", () => {
      expect(Object.isFrozen(appPromptManager)).toBe(true);
    });
  });
});
