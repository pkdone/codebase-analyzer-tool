import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";
import { z } from "zod";
import type { PromptDefinition } from "../../../src/app/prompts/prompt.types";

describe("Prompt Rendering Refactoring Tests", () => {
  describe("Single-step rendering with contentDesc", () => {
    test("should render prompt with contentDesc directly in template", () => {
      const definition: PromptDefinition = {
        contentDesc: "JVM code",
        instructions: ["Extract class name", "Extract methods"],
        responseSchema: z.object({ name: z.string() }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      const rendered = renderPrompt(definition, { content: "class Test {}" });

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
      const definition: PromptDefinition = {
        contentDesc: "a set of source file summaries",
        instructions: ["a list of entities"],
        responseSchema: z.object({ technologies: z.array(z.string()) }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, { content: "summaries..." });

      // Should use contentDesc without "the" article (since it's already "a set of")
      expect(rendered).toContain("a set of source file summaries");
      expect(rendered).toContain("a list of entities");
    });

    test("should render reduce insights prompt with complex contentDesc", () => {
      const definition: PromptDefinition = {
        contentDesc:
          "several JSON objects, each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized",
        instructions: ["a consolidated list of 'Entities'"],
        responseSchema: z.object({ technologies: z.array(z.string()) }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, {
        content: '[{"technologies": ["User"]}]',
        categoryKey: "technologies",
      });

      // Should contain the contentDesc with template placeholder replaced
      expect(rendered).toContain("consolidate these lists");
      expect(rendered).toContain("a consolidated list of 'Entities'");
    });

    test("should join multiple instructions with double newlines", () => {
      const definition: PromptDefinition = {
        contentDesc: "Python code",
        instructions: ["First instruction", "Second instruction", "Third instruction"],
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, { content: "print('test')" });

      // Instructions should be joined with \n\n
      expect(rendered).toContain("First instruction\n\nSecond instruction\n\nThird instruction");
    });

    test("should handle empty partialAnalysisNote gracefully", () => {
      const definition: PromptDefinition = {
        contentDesc: "JavaScript code",
        instructions: ["Analyze the code"],
        responseSchema: z.object({ result: z.string() }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, { content: "const x = 1;" });

      // Should not contain any placeholder or empty lines from partialAnalysisNote
      expect(rendered).not.toContain("{{partialAnalysisNote}}");
      expect(rendered).toContain("The JSON response must follow this JSON schema:");
    });

    test("should use provided partialAnalysisNote when available", () => {
      const definition: PromptDefinition = {
        contentDesc: "Ruby code",
        instructions: ["Extract class info"],
        responseSchema: z.object({ className: z.string() }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      const partialNote =
        "Note: This is a partial analysis of a larger codebase. Some references may be incomplete.\n\n";
      const rendered = renderPrompt(definition, {
        content: "class Foo; end",
        partialAnalysisNote: partialNote,
      });

      expect(rendered).toContain(partialNote);
      expect(rendered).toContain("The JSON response must follow this JSON schema:");
    });

    test("should wrap content in code blocks when wrapInCodeBlock is true", () => {
      const definition: PromptDefinition = {
        contentDesc: "C# code",
        instructions: ["Find classes"],
        responseSchema: z.object({ classes: z.array(z.string()) }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      const content = "public class MyClass { }";
      const rendered = renderPrompt(definition, { content });

      // Should have triple backticks around content
      // Format is: CODE:\n```\n{content}```
      expect(rendered).toContain("CODE:\n```\n" + content + "```");
    });

    test("should not wrap content when wrapInCodeBlock is false", () => {
      const definition: PromptDefinition = {
        contentDesc: "XML configuration",
        instructions: ["Extract framework info"],
        responseSchema: z.object({ framework: z.string() }),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      const content = "<config></config>";
      const rendered = renderPrompt(definition, { content });

      // Should not have triple backticks
      expect(rendered).not.toContain("```\n" + content + "\n```");
      expect(rendered).toContain(content);
    });
  });

  describe("Backward compatibility - contentDesc in data passed to renderPrompt", () => {
    test("should prioritize contentDesc from definition over data", () => {
      const definition: PromptDefinition = {
        contentDesc: "TypeScript code",
        instructions: ["Analyze"],
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      // Even if contentDesc is passed in data, definition's contentDesc takes precedence
      const rendered = renderPrompt(definition, {
        content: "const x = 1;",
        contentDesc: "this should be ignored",
      });

      expect(rendered).toContain("TypeScript code");
      expect(rendered).not.toContain("this should be ignored");
    });
  });
});
