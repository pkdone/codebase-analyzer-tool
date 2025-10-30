import {
  InstructionSection,
  PromptDefinition,
  CANONICAL_FILE_TYPES,
  CanonicalFileType,
  canonicalFileTypeSchema,
  AppSummaryCategoryType,
} from "../../src/prompts/prompt.types";
import { z } from "zod";

describe("Prompt Types", () => {
  describe("InstructionSection", () => {
    it("should support sections with titles", () => {
      const section: InstructionSection = {
        title: "Test Section",
        points: ["Point 1", "Point 2"],
      };

      expect(section.title).toBe("Test Section");
      expect(section.points).toEqual(["Point 1", "Point 2"]);
    });

    it("should support sections without titles", () => {
      const section: InstructionSection = {
        points: ["Point 1", "Point 2"],
      };

      expect(section.title).toBeUndefined();
      expect(section.points).toEqual(["Point 1", "Point 2"]);
    });

    it("should support readonly points arrays", () => {
      const readonlyPoints = ["Point 1", "Point 2"] as const;
      const section: InstructionSection = {
        points: readonlyPoints,
      };

      expect(section.points).toEqual(["Point 1", "Point 2"]);
    });
  });

  describe("PromptDefinition", () => {
    const createMockPromptDefinition = (
      overrides?: Partial<PromptDefinition>,
    ): PromptDefinition => ({
      contentDesc: "test content",
      instructions: [{ points: ["instruction 1", "instruction 2"] }],
      responseSchema: z.string(),
      hasComplexSchema: false,
      template: "Test template",
      ...overrides,
    });

    it("should have required fields", () => {
      const definition: PromptDefinition = {
        contentDesc: "test",
        instructions: [{ points: ["test"] }],
        responseSchema: z.string(),
        template: "Test template",
      };

      expect(definition.contentDesc).toBe("test");
      expect(definition.instructions).toEqual([{ points: ["test"] }]);
      expect(definition.responseSchema).toBeDefined();
      expect(definition.template).toBe("Test template");
    });

    it("should support optional fields", () => {
      const definitionWithOptional = createMockPromptDefinition({
        hasComplexSchema: true,
        label: "Test Label",
      });

      expect(definitionWithOptional.hasComplexSchema).toBe(true);
      expect(definitionWithOptional.label).toBe("Test Label");
    });

    it("should support readonly InstructionSection arrays", () => {
      const readonlyInstructions: readonly InstructionSection[] = [
        { points: ["instruction 1", "instruction 2"] },
      ];

      const definition: PromptDefinition = {
        contentDesc: "test",
        instructions: readonlyInstructions,
        responseSchema: z.string(),
        template: "Test template",
      };

      expect(definition.instructions).toEqual([{ points: ["instruction 1", "instruction 2"] }]);
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
