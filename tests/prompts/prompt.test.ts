import { z } from "zod";
import { Prompt } from "../../src/prompts/prompt";
import type { InstructionSection } from "../../src/prompts/types/prompt-definition.types";
import { MASTER_PROMPT_TEMPLATE } from "../../src/prompts/templates/master.prompt";

describe("Prompt", () => {
  describe("constructor", () => {
    it("should create a Prompt instance with all required parameters", () => {
      const prompt = new Prompt(
        MASTER_PROMPT_TEMPLATE,
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
        MASTER_PROMPT_TEMPLATE,
        "text file",
        ["process this text"],
        z.string(),
        "test content",
      );

      const result = prompt.render();

      expect(typeof result).toBe("string");
      expect(result).toContain("Act as a senior developer.");
      expect(result).toContain("* process this text");
      expect(result).toContain('"type": "string"');
      expect(result).toContain("test content");
      expect(result).toContain("CODE:");
      expect(result).toContain("JSON");
    });

    it("should render a prompt with object schema", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const prompt = new Prompt(
        MASTER_PROMPT_TEMPLATE,
        "data file",
        ["extract data"],
        schema,
        "sample data",
      );

      const result = prompt.render();

      expect(result).toContain("Act as a senior developer.");
      expect(result).toContain("* extract data");
      expect(result).toContain('"type": "object"');
      expect(result).toContain('"properties"');
      expect(result).toContain("sample data");
      expect(result).toContain("CODE:");
    });

    it("should format instructions as bullet points", () => {
      const prompt = new Prompt(
        MASTER_PROMPT_TEMPLATE,
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

      const prompt = new Prompt(MASTER_PROMPT_TEMPLATE, "test", ["instruction"], schema, "code");

      const result = prompt.render();

      expect(result).toContain('"type": "object"');
      expect(result).toContain('"field1"');
      expect(result).toContain('"field2"');
      expect(result).toContain("* instruction");
    });

    it("should handle empty instructions array", () => {
      const prompt = new Prompt(MASTER_PROMPT_TEMPLATE, "test", [], z.string(), "code");

      const result = prompt.render();

      expect(result).toContain("Act as a senior developer.");
      expect(result).toContain("code");
      // Should not contain any bullet points
      expect(result).not.toContain("*");
    });

    it("should include force JSON instructions", () => {
      const prompt = new Prompt(
        MASTER_PROMPT_TEMPLATE,
        "test",
        ["instruction"],
        z.string(),
        "code",
      );

      const result = prompt.render();

      expect(result).toContain("NEVER ever respond with XML");
      expect(result).toContain("RFC8259 compliant JSON");
    });
  });

  describe("render with master template", () => {
    it("should render using master template format", () => {
      const prompt = new Prompt(
        MASTER_PROMPT_TEMPLATE,
        "test files",
        ["analyze code", "extract insights"],
        z.object({ data: z.string() }),
        "code content here",
      );

      const result = prompt.render();

      expect(result).toContain("Act as a senior developer.");
      expect(result).toContain("* analyze code");
      expect(result).toContain("* extract insights");
      expect(result).toContain("CODE:");
      expect(result).toContain("code content here");
    });

    it("should support custom role", () => {
      const prompt = new Prompt(
        MASTER_PROMPT_TEMPLATE,
        "test",
        ["instruction"],
        z.string(),
        "code",
      ).withRole("Act as an expert analyst.");

      const result = prompt.render();

      expect(result).toContain("Act as an expert analyst.");
    });

    it("should support custom content header", () => {
      const prompt = new Prompt(
        MASTER_PROMPT_TEMPLATE,
        "test",
        ["instruction"],
        z.string(),
        "data",
      ).withContentHeader("SOURCES:");

      const result = prompt.render();

      expect(result).toContain("SOURCES:");
      expect(result).toContain("data");
    });
  });

  describe("render with instruction sections", () => {
    it("should format section-based instructions with titles", () => {
      const sections: readonly InstructionSection[] = [
        {
          title: "Code Analysis",
          points: ["Analyze the structure", "Identify patterns"],
        },
        {
          title: "Data Extraction",
          points: ["Extract key information", "Document findings"],
        },
      ];

      const prompt = new Prompt(MASTER_PROMPT_TEMPLATE, "test", sections, z.string(), "code");

      const result = prompt.render();

      expect(result).toContain("**Code Analysis**");
      expect(result).toContain("* Analyze the structure");
      expect(result).toContain("* Identify patterns");
      expect(result).toContain("**Data Extraction**");
      expect(result).toContain("* Extract key information");
      expect(result).toContain("* Document findings");
    });

    it("should handle sections without titles", () => {
      const sections: readonly InstructionSection[] = [
        {
          points: ["first point", "second point"],
        },
      ];

      const prompt = new Prompt(MASTER_PROMPT_TEMPLATE, "test", sections, z.string(), "code");

      const result = prompt.render();

      expect(result).toContain("* first point");
      expect(result).toContain("* second point");
      expect(result).not.toContain("**");
    });

    it("should handle mixed sections with and without titles", () => {
      const sections: readonly InstructionSection[] = [
        {
          title: "Section With Title",
          points: ["point 1"],
        },
        {
          points: ["point 2", "point 3"],
        },
      ];

      const prompt = new Prompt(MASTER_PROMPT_TEMPLATE, "test", sections, z.string(), "code");

      const result = prompt.render();

      expect(result).toContain("**Section With Title**");
      expect(result).toContain("* point 1");
      expect(result).toContain("* point 2");
      expect(result).toContain("* point 3");
    });
  });

  describe("withRole and withContentHeader", () => {
    it("should return a new Prompt instance with modified role", () => {
      const prompt1 = new Prompt(MASTER_PROMPT_TEMPLATE, "test", [], z.string(), "code");
      const prompt2 = prompt1.withRole("Custom role");

      expect(prompt2).toBeInstanceOf(Prompt);
      expect(prompt2).not.toBe(prompt1);
    });

    it("should return a new Prompt instance with modified content header", () => {
      const prompt1 = new Prompt(MASTER_PROMPT_TEMPLATE, "test", [], z.string(), "code");
      const prompt2 = prompt1.withContentHeader("CUSTOM:");

      expect(prompt2).toBeInstanceOf(Prompt);
      expect(prompt2).not.toBe(prompt1);

      const result = prompt2.render();
      expect(result).toContain("CUSTOM:");
    });
  });
});
