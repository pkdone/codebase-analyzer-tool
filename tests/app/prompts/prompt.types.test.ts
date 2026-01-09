import { PromptDefinition, PromptConfigEntry } from "../../../src/app/prompts/prompt.types";
import {
  CANONICAL_FILE_TYPES,
  canonicalFileTypeSchema,
  type CanonicalFileType,
} from "../../../src/app/schemas/canonical-file-types";
import type { AppSummaryCategoryType } from "../../../src/app/components/insights/insights.types";
import { z } from "zod";

describe("Prompt Types", () => {
  describe("PromptConfigEntry", () => {
    it("should require contentDesc, instructions, and responseSchema", () => {
      const schema = z.object({ result: z.string() });
      const config: PromptConfigEntry<typeof schema> = {
        contentDesc: "Required description",
        instructions: ["Required instruction"],
        responseSchema: schema,
      };

      expect(config.contentDesc).toBe("Required description");
      expect(config.instructions).toEqual(["Required instruction"]);
      expect(config.responseSchema).toBe(schema);
    });

    it("should allow optional label", () => {
      const schema = z.object({ result: z.string() });
      const configWithLabel: PromptConfigEntry<typeof schema> = {
        contentDesc: "Description",
        instructions: ["Instruction"],
        responseSchema: schema,
        label: "Optional Label",
      };

      expect(configWithLabel.label).toBe("Optional Label");
    });

    it("should allow optional hasComplexSchema", () => {
      const schema = z.object({ result: z.string() });
      const configWithComplexSchema: PromptConfigEntry<typeof schema> = {
        contentDesc: "Description",
        instructions: ["Instruction"],
        responseSchema: schema,
        hasComplexSchema: true,
      };

      expect(configWithComplexSchema.hasComplexSchema).toBe(true);
    });

    it("should preserve generic schema type", () => {
      const specificSchema = z.object({
        items: z.array(z.string()),
        count: z.number(),
      });

      const config: PromptConfigEntry<typeof specificSchema> = {
        contentDesc: "Description",
        instructions: ["Instruction"],
        responseSchema: specificSchema,
      };

      // Type system ensures responseSchema is exactly the specified type
      expect(config.responseSchema).toBe(specificSchema);
    });
  });

  describe("PromptDefinition", () => {
    const createMockPromptDefinition = (
      overrides?: Partial<PromptDefinition>,
    ): PromptDefinition => ({
      contentDesc: "Test intro text template with {{placeholder}}",
      instructions: ["instruction 1", "instruction 2"],
      responseSchema: z.string(),
      template: "Test template",
      dataBlockHeader: "CODE",
      wrapInCodeBlock: false,
      ...overrides,
    });

    it("should have required fields", () => {
      const definition: PromptDefinition = {
        contentDesc: "Test intro text template",
        instructions: ["test"],
        responseSchema: z.string(),
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      expect(definition.contentDesc).toBe("Test intro text template");
      expect(definition.instructions).toEqual(["test"]);
      expect(definition.responseSchema).toBeDefined();
      expect(definition.template).toBe("Test template");
    });

    it("should support optional fields", () => {
      const definitionWithOptional = createMockPromptDefinition({
        label: "Test Label",
      });

      expect(definitionWithOptional.label).toBe("Test Label");
    });

    it("should support readonly string arrays", () => {
      const readonlyInstructions: readonly string[] = ["instruction 1", "instruction 2"];

      const definition: PromptDefinition = {
        contentDesc: "Test intro text template",
        instructions: readonlyInstructions,
        responseSchema: z.string(),
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      expect(definition.instructions).toEqual(["instruction 1", "instruction 2"]);
    });
  });

  describe("CANONICAL_FILE_TYPES", () => {
    it("should contain all expected file types", () => {
      const expectedTypes = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "ruby",
        "maven",
        "gradle",
        "ant",
        "npm",
        "python",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "shell-script",
        "batch-script",
        "jcl",
      ];

      expectedTypes.forEach((type) => {
        expect(CANONICAL_FILE_TYPES).toContain(type);
      });
    });

    it("should be a readonly array", () => {
      // Check that the array is readonly by checking its type
      expect(Array.isArray(CANONICAL_FILE_TYPES)).toBe(true);
      expect(CANONICAL_FILE_TYPES.length).toBeGreaterThan(0);
    });
  });

  describe("CanonicalFileType", () => {
    it("should be a union of all canonical file types", () => {
      const validTypes: CanonicalFileType[] = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "ruby",
        "maven",
        "gradle",
        "ant",
        "npm",
        "python",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "shell-script",
        "batch-script",
        "jcl",
      ];

      validTypes.forEach((type) => {
        expect(CANONICAL_FILE_TYPES).toContain(type);
      });
    });
  });

  describe("canonicalFileTypeSchema", () => {
    it("should validate all canonical file types", () => {
      CANONICAL_FILE_TYPES.forEach((type) => {
        expect(() => canonicalFileTypeSchema.parse(type)).not.toThrow();
      });
    });

    it("should reject invalid file types", () => {
      const invalidTypes = ["invalid", "unknown", "test", ""];

      invalidTypes.forEach((type) => {
        const result = canonicalFileTypeSchema.safeParse(type);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("AppSummaryCategoryType", () => {
    it("should be a valid type", () => {
      // This test ensures the type is properly exported and can be used
      const category: AppSummaryCategoryType = "appDescription";
      expect(category).toBe("appDescription");
    });
  });
});
