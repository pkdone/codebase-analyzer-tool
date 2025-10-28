import { z } from "zod";
import { buildPrompt } from "../../../src/llm/utils/prompt-templator";
import { SourcePromptTemplate } from "../../../src/prompt-templates/types/sources.types";

describe("prompt-utils", () => {
  describe("buildPrompt", () => {
    it("should create a prompt with simple string schema", () => {
      const template =
        "Generate JSON following this schema: {{jsonSchema}}\n\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.string(),
        contentDesc: "text file",
        instructions: ["process this text"],
        hasComplexSchema: false,
      };
      const content = "test content";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(typeof result).toBe("string");
      expect(result).toContain('"type": "string"');
      expect(result).toContain("test content");
    });

    it("should create a prompt with object schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        contentDesc: "data file",
        instructions: ["extract data"],
        hasComplexSchema: false,
      };
      const content = "sample data";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain("sample data");
    });

    it("should create a prompt with array schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.array(z.string()),
        contentDesc: "list file",
        instructions: ["create list"],
        hasComplexSchema: false,
      };
      const content = "item1, item2, item3";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"items"');
      expect(result).toContain("item1, item2, item3");
    });

    it("should create a prompt with union schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.union([z.string(), z.number()]),
        contentDesc: "mixed file",
        instructions: ["process mixed data"],
        hasComplexSchema: false,
      };
      const content = "mixed content";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"type": [');
      expect(result).toContain('"string"');
      expect(result).toContain('"number"');
      expect(result).toContain("mixed content");
    });

    it("should create a prompt with enum schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.enum(["option1", "option2", "option3"]),
        contentDesc: "choice file",
        instructions: ["select option"],
        hasComplexSchema: false,
      };
      const content = "selection data";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"enum"');
      expect(result).toContain("option1");
      expect(result).toContain("selection data");
    });

    it("should create a prompt with literal schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.literal("exactValue"),
        contentDesc: "literal file",
        instructions: ["match exact value"],
        hasComplexSchema: false,
      };
      const content = "exact match test";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"const": "exactValue"');
      expect(result).toContain("exact match test");
    });

    it("should create a prompt with optional schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        contentDesc: "optional file",
        instructions: ["handle optional fields"],
        hasComplexSchema: false,
      };
      const content = "optional data";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"required"');
      expect(result).toContain("optional data");
    });

    it("should create a prompt with nested schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.object({
          user: z.object({
            profile: z.object({
              name: z.string(),
              settings: z.object({
                theme: z.string(),
              }),
            }),
          }),
        }),
        contentDesc: "nested file",
        instructions: ["handle nested structure"],
        hasComplexSchema: false,
      };
      const content = "nested content";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"type": "object"');
      expect(result).toContain("nested content");
    });

    it("should create a prompt with complex schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: SourcePromptTemplate = {
        responseSchema: z.object({
          data: z.array(
            z.object({
              id: z.string(),
              values: z.array(z.number()),
              metadata: z.record(z.string(), z.unknown()),
            }),
          ),
        }),
        contentDesc: "complex file",
        instructions: ["handle complex structure"],
        hasComplexSchema: false,
      };
      const content = "complex data";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"type": "array"');
      expect(result).toContain("complex data");
    });

    it("should replace all template variables", () => {
      const template = `
        File: {{contentDesc}}
        Instructions: {{specificInstructions}}
        Schema: {{jsonSchema}}
        Content: {{codeContent}}
        Force: {{forceJSON}}
      `;
      const config: SourcePromptTemplate = {
        responseSchema: z.string(),
        contentDesc: "test file",
        instructions: ["test instructions"],
        hasComplexSchema: false,
      };
      const content = "test content";

      const result = buildPrompt(
        template,
        config.contentDesc,
        config.instructions,
        config.responseSchema,
        content,
      );

      expect(result).toContain("File: test file");
      expect(result).toContain("Instructions: * test instructions");
      expect(result).toContain("Content: test content");
      expect(result).toContain("ONLY provide an RFC8259 compliant JSON response");
    });
  });
});
