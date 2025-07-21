import { z } from "zod";
import {
  createPromptFromConfig,
  DynamicPromptConfig,
} from "../../../../src/llm/core/utils/msgProcessing/prompt-templator";

describe("prompt-utils", () => {
  describe("createPromptFromConfig", () => {
    it("should create a prompt with simple string schema", () => {
      const template =
        "Generate JSON following this schema: {{jsonSchema}}\n\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.string(),
        contentDesc: "text file",
        instructions: "process this text",
        trickySchema: false,
      };
      const content = "test content";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(typeof result).toBe("string");
      expect(result).toContain('"type": "string"');
      expect(result).toContain("test content");
    });

    it("should create a prompt with object schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        contentDesc: "data file",
        instructions: "extract data",
        trickySchema: false,
      };
      const content = "sample data";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain("sample data");
    });

    it("should create a prompt with array schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.array(z.string()),
        contentDesc: "list file",
        instructions: "create list",
        trickySchema: false,
      };
      const content = "item1, item2, item3";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"items"');
      expect(result).toContain("item1, item2, item3");
    });

    it("should create a prompt with union schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.union([z.string(), z.number()]),
        contentDesc: "mixed file",
        instructions: "process mixed data",
        trickySchema: false,
      };
      const content = "mixed content";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain('"type": [');
      expect(result).toContain('"string"');
      expect(result).toContain('"number"');
      expect(result).toContain("mixed content");
    });

    it("should create a prompt with enum schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.enum(["option1", "option2", "option3"]),
        contentDesc: "choice file",
        instructions: "select option",
        trickySchema: false,
      };
      const content = "selection data";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain('"enum"');
      expect(result).toContain("option1");
      expect(result).toContain("selection data");
    });

    it("should create a prompt with literal schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.literal("exactValue"),
        contentDesc: "literal file",
        instructions: "match exact value",
        trickySchema: false,
      };
      const content = "exact match test";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain('"const": "exactValue"');
      expect(result).toContain("exact match test");
    });

    it("should create a prompt with optional schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        contentDesc: "optional file",
        instructions: "handle optional fields",
        trickySchema: false,
      };
      const content = "optional data";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain('"required"');
      expect(result).toContain("optional data");
    });

    it("should create a prompt with nested schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.object({
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
        instructions: "handle nested structure",
        trickySchema: false,
      };
      const content = "nested content";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain('"type": "object"');
      expect(result).toContain("nested content");
    });

    it("should create a prompt with complex schema", () => {
      const template = "Schema: {{jsonSchema}}\nContent: {{codeContent}}";
      const config: DynamicPromptConfig = {
        schema: z.object({
          data: z.array(
            z.object({
              id: z.string(),
              values: z.array(z.number()),
              metadata: z.record(z.string(), z.unknown()),
            }),
          ),
        }),
        contentDesc: "complex file",
        instructions: "handle complex structure",
        trickySchema: false,
      };
      const content = "complex data";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

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
      const config: DynamicPromptConfig = {
        schema: z.string(),
        contentDesc: "test file",
        instructions: "test instructions",
        trickySchema: false,
      };
      const content = "test content";

      const result = createPromptFromConfig(template, config.contentDesc, config.instructions, config.schema, content);

      expect(result).toContain("File: test file");
      expect(result).toContain("Instructions: test instructions");
      expect(result).toContain("Content: test content");
      expect(result).toContain("ONLY provide an RFC8259 compliant JSON response");
    });
  });
});
