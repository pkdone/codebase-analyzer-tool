import { Prompt } from "../../src/prompts/prompt";
import { fileTypePromptMetadata } from "../../src/prompts/definitions/sources";
import { appSummaryPromptMetadata } from "../../src/prompts/definitions/app-summaries";
import { PromptDefinition } from "../../src/prompts/types/prompt-definition.types";
import { sourceConfigMap } from "../../src/prompts/definitions/sources/sources.config";
import { appSummaryConfigMap } from "../../src/prompts/definitions/app-summaries/app-summaries.config";
import { z } from "zod";

describe("Prompt Refactoring", () => {
  describe("Prompt class", () => {
    it("should create prompts using constructor with template from definition", () => {
      const mockDefinition: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.object({ name: z.string() }),
        template: "Test template with {{contentDesc}}",
      };

      const prompt = new Prompt(mockDefinition, "test content");
      expect(prompt).toBeInstanceOf(Prompt);
    });

    it("should render prompts correctly with new structure", () => {
      const mockDefinition: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.object({ name: z.string() }),
        template: "Test template with {{contentDesc}}",
      };

      const prompt = new Prompt(mockDefinition, "test content");
      const rendered = prompt.render();
      expect(rendered).toContain("test content");
    });

    it("should maintain backward compatibility with factory methods", () => {
      const mockDefinition: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.object({ name: z.string() }),
        template: "Test template with {{contentDesc}}",
      };

      const sourcePrompt = Prompt.forSource(mockDefinition, "test content");
      const appSummaryPrompt = Prompt.forAppSummary(mockDefinition, "test content");

      expect(sourcePrompt).toBeInstanceOf(Prompt);
      expect(appSummaryPrompt).toBeInstanceOf(Prompt);
    });

    it("should handle forReduce with template modification", () => {
      const mockDefinition: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.object({ name: z.string() }),
        template: "Test template with {{categoryKey}}",
      };

      const prompt = Prompt.forReduce(mockDefinition, "test content", "entities");
      expect(prompt).toBeInstanceOf(Prompt);
    });
  });

  describe("Source prompt metadata", () => {
    it("should generate metadata dynamically from config", () => {
      expect(fileTypePromptMetadata.java).toBeDefined();
      expect(fileTypePromptMetadata.java.contentDesc).toBe("JVM code");
      expect(fileTypePromptMetadata.java.template).toBeDefined();
      expect(fileTypePromptMetadata.java.hasComplexSchema).toBe(true);
    });

    it("should have consistent structure across all file types", () => {
      Object.values(fileTypePromptMetadata).forEach((metadata) => {
        expect(metadata.contentDesc).toBeDefined();
        expect(metadata.instructions).toBeDefined();
        expect(metadata.responseSchema).toBeDefined();
        expect(metadata.template).toBeDefined();
        expect(Array.isArray(metadata.instructions)).toBe(true);
      });
    });

    it("should include all required file types", () => {
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
      ];

      expectedFileTypes.forEach((fileType) => {
        expect(
          fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata],
        ).toBeDefined();
      });
    });

    it("should have proper instruction structure for complex file types", () => {
      const javaMetadata = fileTypePromptMetadata.java;
      expect(javaMetadata.instructions.length).toBeGreaterThan(0);

      // Check that instructions have proper structure
      javaMetadata.instructions.forEach((section) => {
        expect(section.points).toBeDefined();
        expect(Array.isArray(section.points)).toBe(true);
        expect(section.points.length).toBeGreaterThan(0);
      });
    });

    it("should use dynamic schema picking", () => {
      const javaMetadata = fileTypePromptMetadata.java;
      expect(javaMetadata.responseSchema).toBeDefined();

      // The schema should be a picked version of the master schema
      expect(typeof javaMetadata.responseSchema.parse).toBe("function");
    });
  });

  describe("App summary prompt metadata", () => {
    it("should include templates in all entries", () => {
      Object.values(appSummaryPromptMetadata).forEach((metadata) => {
        expect(metadata.template).toBeDefined();
        expect(typeof metadata.template).toBe("string");
      });
    });

    it("should have consistent structure across all categories", () => {
      Object.values(appSummaryPromptMetadata).forEach((metadata) => {
        expect(metadata.contentDesc).toBeDefined();
        expect(metadata.instructions).toBeDefined();
        expect(metadata.responseSchema).toBeDefined();
        expect(metadata.template).toBeDefined();
        expect(metadata.label).toBeDefined();
      });
    });

    it("should include all required categories", () => {
      const expectedCategories = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "aggregates",
        "entities",
        "repositories",
        "potentialMicroservices",
        "billOfMaterials",
        "codeQualitySummary",
        "scheduledJobsSummary",
        "moduleCoupling",
        "uiTechnologyAnalysis",
      ];

      expectedCategories.forEach((category) => {
        expect(
          appSummaryPromptMetadata[category as keyof typeof appSummaryPromptMetadata],
        ).toBeDefined();
      });
    });
  });

  describe("Source configuration", () => {
    it("should have all file types in configuration", () => {
      const configKeys = Object.keys(sourceConfigMap);
      expect(configKeys.length).toBeGreaterThan(20); // Should have many file types

      // Check a few key file types
      expect(sourceConfigMap.java).toBeDefined();
      expect(sourceConfigMap.javascript).toBeDefined();
      expect(sourceConfigMap.python).toBeDefined();
    });

    it("should have consistent structure in config entries", () => {
      Object.values(sourceConfigMap).forEach((config) => {
        expect(config.contentDesc).toBeDefined();
        expect(config.schemaFields).toBeDefined();
        expect(config.instructions).toBeDefined();
        expect(config.template).toBeDefined();
        expect(Array.isArray(config.schemaFields)).toBe(true);
        expect(Array.isArray(config.instructions)).toBe(true);
      });
    });

    it("should have appropriate schema fields for different file types", () => {
      // Java should have complex schema fields
      expect(sourceConfigMap.java.schemaFields).toContain("databaseIntegration");
      expect(sourceConfigMap.java.schemaFields).toContain("integrationPoints");
      expect(sourceConfigMap.java.hasComplexSchema).toBe(true);

      // Markdown should have simpler schema (defaults to false when undefined)
      expect(sourceConfigMap.markdown.hasComplexSchema).toBeUndefined();
    });
  });

  describe("App summary configuration", () => {
    it("should have all categories in configuration", () => {
      const configKeys = Object.keys(appSummaryConfigMap);
      expect(configKeys.length).toBeGreaterThan(10);

      // Check a few key categories
      expect(appSummaryConfigMap.appDescription).toBeDefined();
      expect(appSummaryConfigMap.technologies).toBeDefined();
      expect(appSummaryConfigMap.entities).toBeDefined();
    });

    it("should have consistent structure in config entries", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.label).toBeDefined();
        expect(config.instruction).toBeDefined();
        expect(config.responseSchema).toBeDefined();
        expect(config.template).toBeDefined();
        expect(typeof config.label).toBe("string");
        expect(typeof config.instruction).toBe("string");
        expect(typeof config.template).toBe("string");
      });
    });
  });

  describe("Backward compatibility", () => {
    it("should maintain existing API for Prompt factory methods", () => {
      const mockDefinition: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.object({ name: z.string() }),
        template: "Test template with {{contentDesc}}",
      };

      // These should work exactly as before
      const sourcePrompt = Prompt.forSource(mockDefinition, "test content");
      const appSummaryPrompt = Prompt.forAppSummary(mockDefinition, "test content");
      const reducePrompt = Prompt.forReduce(mockDefinition, "test content", "test");

      expect(sourcePrompt).toBeInstanceOf(Prompt);
      expect(appSummaryPrompt).toBeInstanceOf(Prompt);
      expect(reducePrompt).toBeInstanceOf(Prompt);
    });

    it("should generate identical prompts for same input", () => {
      const mockDefinition: PromptDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.object({ name: z.string() }),
        template: "Test template with {{contentDesc}}",
      };

      const prompt1 = new Prompt(mockDefinition, "test content");
      const prompt2 = Prompt.forSource(mockDefinition, "test content");

      expect(prompt1.render()).toBe(prompt2.render());
    });
  });

  describe("Error handling", () => {
    it("should handle missing template gracefully", () => {
      const mockDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.object({ name: z.string() }),
        // Missing template
      } as any;

      // The constructor should not throw, but render() might fail
      const prompt = new Prompt(mockDefinition, "test content");
      expect(() => prompt.render()).toThrow();
    });

    it("should handle empty instructions", () => {
      const mockDefinition: PromptDefinition = {
        contentDesc: "test content",
        instructions: [],
        responseSchema: z.object({ name: z.string() }),
        template: "Test template with {{contentDesc}}",
      };

      const prompt = new Prompt(mockDefinition, "test content");
      const rendered = prompt.render();
      expect(rendered).toContain("test content");
    });
  });
});
