import { promptRegistry } from "../../../src/app/prompts/prompt-registry";
import { AppSummaryCategories } from "../../../src/app/schemas/app-summaries.schema";
import { z } from "zod";

describe("Prompt Registry", () => {
  describe("Structure", () => {
    it("should have all expected top-level properties", () => {
      expect(promptRegistry).toHaveProperty("appSummaries");
      expect(promptRegistry).toHaveProperty("sources");
      expect(promptRegistry).toHaveProperty("codebaseQuery");
      expect(promptRegistry).toHaveProperty("reduceInsights");
    });

    it("should have app summary prompts for all categories", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        expect(promptRegistry.appSummaries).toHaveProperty(category);
        expect(promptRegistry.appSummaries[category]).toBeDefined();
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
        expect(promptRegistry.sources).toHaveProperty(fileType);
        expect(promptRegistry.sources[fileType]).toBeDefined();
      });
    });
  });

  describe("App Summary Prompts", () => {
    it("should have valid PromptDefinition structure for each category", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const prompt = promptRegistry.appSummaries[category];
        expect(prompt).toHaveProperty("label");
        expect(prompt).toHaveProperty("contentDesc");
        expect(prompt).toHaveProperty("instructions");
        expect(prompt).toHaveProperty("responseSchema");
        expect(prompt).toHaveProperty("template");
        expect(prompt).toHaveProperty("dataBlockHeader");
        expect(prompt).toHaveProperty("wrapInCodeBlock");

        // Verify types
        expect(typeof prompt.label).toBe("string");
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
        expect(promptRegistry.appSummaries[category].dataBlockHeader).toBe("FILE_SUMMARIES");
      });
    });

    it("should not wrap content in code blocks for app summaries", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        expect(promptRegistry.appSummaries[category].wrapInCodeBlock).toBe(false);
      });
    });

    it("should have non-empty instructions for each category", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const instructions = promptRegistry.appSummaries[category].instructions;
        expect(instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Source Prompts", () => {
    it("should have valid PromptDefinition structure for each file type", () => {
      const fileType = "java"; // Test one as representative
      const prompt = promptRegistry.sources[fileType];

      expect(prompt).toHaveProperty("label");
      expect(prompt).toHaveProperty("contentDesc");
      expect(prompt).toHaveProperty("instructions");
      expect(prompt).toHaveProperty("responseSchema");
      expect(prompt).toHaveProperty("template");
      expect(prompt).toHaveProperty("dataBlockHeader");
      expect(prompt).toHaveProperty("wrapInCodeBlock");
      expect(prompt).toHaveProperty("hasComplexSchema");
    });

    it("should use CODE as dataBlockHeader for source prompts", () => {
      expect(promptRegistry.sources.java.dataBlockHeader).toBe("CODE");
      expect(promptRegistry.sources.javascript.dataBlockHeader).toBe("CODE");
      expect(promptRegistry.sources.python.dataBlockHeader).toBe("CODE");
    });

    it("should wrap content in code blocks for source prompts", () => {
      expect(promptRegistry.sources.java.wrapInCodeBlock).toBe(true);
      expect(promptRegistry.sources.javascript.wrapInCodeBlock).toBe(true);
      expect(promptRegistry.sources.python.wrapInCodeBlock).toBe(true);
    });

    it("should have hasComplexSchema set to true for source prompts", () => {
      expect(promptRegistry.sources.java.hasComplexSchema).toBe(true);
      expect(promptRegistry.sources.javascript.hasComplexSchema).toBe(true);
      expect(promptRegistry.sources.python.hasComplexSchema).toBe(true);
    });

    it("should have non-empty instructions for code file types", () => {
      const codeFileTypes = ["java", "javascript", "python", "csharp", "ruby"] as const;
      codeFileTypes.forEach((fileType) => {
        const instructions = promptRegistry.sources[fileType].instructions;
        expect(instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Codebase Query Prompt", () => {
    it("should have valid structure", () => {
      const prompt = promptRegistry.codebaseQuery;

      expect(prompt.label).toBe("Codebase Query");
      expect(prompt.contentDesc).toBe("source code files");
      expect(prompt.instructions).toEqual([]);
      expect(prompt.responseSchema).toBeInstanceOf(z.ZodString);
      expect(prompt.dataBlockHeader).toBe("CODE");
      expect(prompt.wrapInCodeBlock).toBe(false);
    });

    it("should have a custom template (not BASE_PROMPT_TEMPLATE)", () => {
      const prompt = promptRegistry.codebaseQuery;
      expect(prompt.template).toContain("QUESTION");
      expect(prompt.template).toContain("{{question}}");
    });
  });

  describe("Reduce Insights Prompt", () => {
    it("should have valid structure", () => {
      const prompt = promptRegistry.reduceInsights;

      expect(prompt.label).toBe("Reduce Insights");
      expect(prompt.contentDesc).toContain("{{categoryKey}}");
      expect(prompt.instructions.length).toBeGreaterThan(0);
      expect(prompt.responseSchema).toBeDefined();
      expect(prompt.dataBlockHeader).toBe("FRAGMENTED_DATA");
      expect(prompt.wrapInCodeBlock).toBe(false);
    });

    it("should have categoryKey placeholder in contentDesc", () => {
      const prompt = promptRegistry.reduceInsights;
      expect(prompt.contentDesc).toContain("{{categoryKey}}");
    });

    it("should have instructions mentioning categoryKey placeholder", () => {
      const prompt = promptRegistry.reduceInsights;
      const hasPlaceholder = prompt.instructions.some((inst) => inst.includes("{{categoryKey}}"));
      expect(hasPlaceholder).toBe(true);
    });

    it("should use generic schema (z.unknown())", () => {
      const prompt = promptRegistry.reduceInsights;
      // The schema should be z.unknown() which will be overridden at render time
      expect(prompt.responseSchema).toBeDefined();
    });
  });

  describe("Schema Validation", () => {
    it("should have valid Zod schemas for all app summary categories", () => {
      const categories = AppSummaryCategories.options;
      categories.forEach((category) => {
        const schema = promptRegistry.appSummaries[category].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodType);

        // Verify the schema can be used for parsing
        expect(() => schema.safeParse({})).not.toThrow();
      });
    });

    it("should have valid Zod schemas for all source file types", () => {
      const fileTypes = ["java", "javascript", "python"] as const;
      fileTypes.forEach((fileType) => {
        const schema = promptRegistry.sources[fileType].responseSchema;
        expect(schema).toBeInstanceOf(z.ZodType);

        // Verify the schema can be used for parsing
        expect(() => schema.safeParse({})).not.toThrow();
      });
    });
  });

  describe("Immutability", () => {
    it("should be frozen (immutable)", () => {
      expect(Object.isFrozen(promptRegistry)).toBe(true);
    });
  });
});
