import { z } from "zod";
import { Prompt } from "../../../src/prompts/prompt";

describe("Prompt", () => {
  const mockTemplate = `Template with {{contentDesc}}, {{specificInstructions}}, {{jsonSchema}}, and {{forceJSON}}.
And code content: {{codeContent}}`;

  describe("constructor", () => {
    it("should create a Prompt instance with all required parameters", () => {
      const prompt = new Prompt(
        mockTemplate,
        "test description",
        ["instruction 1", "instruction 2"],
        z.string(),
        "code content",
      );

      expect(prompt).toBeInstanceOf(Prompt);
    });
  });

  describe("render", () => {
    it("should render a simple prompt with string schema", () => {
      const prompt = new Prompt(
        mockTemplate,
        "text file",
        ["process this text"],
        z.string(),
        "test content",
      );

      const result = prompt.render();

      expect(typeof result).toBe("string");
      expect(result).toContain("text file");
      expect(result).toContain("process this text");
      expect(result).toContain('"type": "string"');
      expect(result).toContain("test content");
      expect(result).toContain("JSON");
    });

    it("should render a prompt with object schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const prompt = new Prompt(mockTemplate, "data file", ["extract data"], schema, "sample data");

      const result = prompt.render();

      expect(result).toContain("data file");
      expect(result).toContain("extract data");
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain("sample data");
    });

    it("should format instructions as bullet points", () => {
      const prompt = new Prompt(
        mockTemplate,
        "test",
        ["first instruction", "second instruction", "third instruction"],
        z.string(),
        "code",
      );

      const result = prompt.render();

      expect(result).toContain("* first instruction");
      expect(result).toContain("* second instruction");
      expect(result).toContain("* third instruction");
    });

    it("should include JSON schema in the rendered output", () => {
      const schema = z.object({
        field1: z.string(),
        field2: z.number(),
      });

      const prompt = new Prompt(mockTemplate, "test", ["instruction"], schema, "code");

      const result = prompt.render();

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"field1"');
      expect(result).toContain('"field2"');
    });

    it("should handle empty instructions array", () => {
      const prompt = new Prompt(mockTemplate, "test", [], z.string(), "code");

      const result = prompt.render();

      expect(result).toContain("test");
      expect(result).toContain("code");
      // Should not contain any bullet points
      expect(result).not.toContain("*");
    });

    it("should include force JSON instructions", () => {
      const prompt = new Prompt(mockTemplate, "test", ["instruction"], z.string(), "code");

      const result = prompt.render();

      expect(result).toContain("NEVER ever respond with XML");
      expect(result).toContain("RFC8259 compliant JSON");
    });
  });
});
