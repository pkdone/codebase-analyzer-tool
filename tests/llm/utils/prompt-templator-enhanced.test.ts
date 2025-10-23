import { z } from "zod";
import {
  createPromptFromConfigWithFragments,
  createPromptFromConfig,
} from "../../../src/llm/utils/prompt-templator";

describe("prompt-templator-enhanced", () => {
  describe("createPromptFromConfigWithFragments", () => {
    it("should create a prompt with instruction fragments", () => {
      const template = "Generate JSON: {{specificInstructions}}\nContent: {{codeContent}}";
      const fragments = ["Extract the name", "Extract the purpose", "Extract the implementation"];
      const schema = z.object({
        name: z.string(),
        purpose: z.string(),
        implementation: z.string(),
      });
      const content = "test content";

      const result = createPromptFromConfigWithFragments(
        template,
        "test file",
        fragments,
        schema,
        content,
      );

      expect(result).toContain("* Extract the name");
      expect(result).toContain("* Extract the purpose");
      expect(result).toContain("* Extract the implementation");
      expect(result).toContain("test content");
    });

    it("should handle empty fragments array", () => {
      const template = "Generate JSON: {{specificInstructions}}\nContent: {{codeContent}}";
      const fragments: string[] = [];
      const schema = z.string();
      const content = "test content";

      const result = createPromptFromConfigWithFragments(
        template,
        "test file",
        fragments,
        schema,
        content,
      );

      expect(result).toContain("Generate JSON:");
      expect(result).toContain("test content");
    });

    it("should format fragments with asterisk prefixes", () => {
      const template = "Instructions: {{specificInstructions}}";
      const fragments = ["First instruction", "Second instruction"];
      const schema = z.string();
      const content = "content";

      const result = createPromptFromConfigWithFragments(
        template,
        "test",
        fragments,
        schema,
        content,
      );

      expect(result).toContain("* First instruction");
      expect(result).toContain("* Second instruction");
    });

    it("should join fragments with newlines", () => {
      const template = "Instructions: {{specificInstructions}}";
      const fragments = ["First", "Second", "Third"];
      const schema = z.string();
      const content = "content";

      const result = createPromptFromConfigWithFragments(
        template,
        "test",
        fragments,
        schema,
        content,
      );

      const lines = result.split("\n");
      const instructionLines = lines.filter((line) => line.includes("*"));
      expect(instructionLines).toHaveLength(3);
    });
  });

  describe("createPromptFromConfig", () => {
    it("should handle string instructions", () => {
      const template = "Generate JSON: {{specificInstructions}}\nContent: {{codeContent}}";
      const instructions = ["Extract data"];
      const schema = z.string();
      const content = "test content";

      const result = createPromptFromConfig(template, "test file", instructions, schema, content);

      expect(result).toContain("* Extract data");
      expect(result).toContain("test content");
    });

    it("should handle array instructions", () => {
      const template = "Generate JSON: {{specificInstructions}}\nContent: {{codeContent}}";
      const instructions = ["Extract name", "Extract purpose"];
      const schema = z.string();
      const content = "test content";

      const result = createPromptFromConfig(template, "test file", instructions, schema, content);

      expect(result).toContain("* Extract name");
      expect(result).toContain("* Extract purpose");
      expect(result).toContain("test content");
    });
  });
});
