import { JSONSchemaPrompt } from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";
import { z } from "zod";

describe("JSONSchemaPrompt Rendering Refactoring Tests", () => {
  describe("Single-step rendering with contentDesc", () => {
    test("should render prompt with contentDesc directly in template", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "JVM code",
        instructions: ["Extract class name", "Extract methods"],
        responseSchema: z.object({ name: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });

      const rendered = prompt.renderPrompt("class Test {}");

      // Should contain the intro text directly from the template
      expect(rendered).toContain(
        "Act as a senior developer analyzing the code in an existing application",
      );
      // Should contain the contentDesc
      expect(rendered).toContain("the JVM code");
      // Should contain the instructions
      expect(rendered).toContain("Extract class name");
      expect(rendered).toContain("Extract methods");
      // Should contain the content
      expect(rendered).toContain("class Test {}");
    });

    test("should render prompt with app summary contentDesc", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "a set of source file summaries",
        instructions: ["a list of entities"],
        responseSchema: z.object({ technologies: z.array(z.string()) }),
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      });

      const rendered = prompt.renderPrompt("summaries...");

      // Should use contentDesc without "the" article (since it's already "a set of")
      expect(rendered).toContain("a set of source file summaries");
      expect(rendered).toContain("a list of entities");
    });

    test("should render reduce insights prompt with complex contentDesc", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc:
          "several JSON objects, each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized",
        instructions: ["a consolidated list of 'Entities'"],
        responseSchema: z.object({ technologies: z.array(z.string()) }),
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      });

      const rendered = prompt.renderPrompt('[{"technologies": ["User"]}]');

      // Should contain the contentDesc
      expect(rendered).toContain("consolidate these lists");
      expect(rendered).toContain("a consolidated list of 'Entities'");
    });

    test("should join multiple instructions with double newlines", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "Python code",
        instructions: ["First instruction", "Second instruction", "Third instruction"],
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });

      const rendered = prompt.renderPrompt("print('test')");

      // Instructions should be joined with \n\n
      expect(rendered).toContain("First instruction\n\nSecond instruction\n\nThird instruction");
    });

    test("should render without partialAnalysisNote placeholder", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "JavaScript code",
        instructions: ["Analyze the code"],
        responseSchema: z.object({ result: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });

      const rendered = prompt.renderPrompt("const x = 1;");

      // Should not contain any placeholder
      expect(rendered).not.toContain("{{partialAnalysisNote}}");
      expect(rendered).toContain("The JSON response must follow this JSON schema:");
    });

    test("should render with partial analysis note when forPartialAnalysis is true", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "Ruby code",
        instructions: ["Extract class info"],
        responseSchema: z.object({ className: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
        forPartialAnalysis: true,
      });

      const rendered = prompt.renderPrompt("class Foo; end");

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
      expect(rendered).toContain("The JSON response must follow this JSON schema:");
    });

    test("should wrap content in code blocks when wrapInCodeBlock is true", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "C# code",
        instructions: ["Find classes"],
        responseSchema: z.object({ classes: z.array(z.string()) }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });

      const content = "public class MyClass { }";
      const rendered = prompt.renderPrompt(content);

      // Should have triple backticks around content
      // Format is: CODE:\n```\n{content}```
      expect(rendered).toContain("CODE:\n```\n" + content + "```");
    });

    test("should not wrap content when wrapInCodeBlock is false", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "XML configuration",
        instructions: ["Extract framework info"],
        responseSchema: z.object({ framework: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });

      const content = "<config></config>";
      const rendered = prompt.renderPrompt(content);

      // Should not have triple backticks
      expect(rendered).not.toContain("```\n" + content + "\n```");
      expect(rendered).toContain(content);
    });
  });

  describe("Backward compatibility - contentDesc in data passed to renderPrompt", () => {
    test("should use contentDesc from definition", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "TypeScript code",
        instructions: ["Analyze"],
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });

      // Definition's contentDesc should be used
      const rendered = prompt.renderPrompt("const x = 1;");

      expect(rendered).toContain("TypeScript code");
    });
  });
});
