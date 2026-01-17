import { Prompt } from "../../../src/common/prompts/prompt";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";
import { z } from "zod";

describe("Prompt Rendering Refactoring Tests", () => {
  describe("Single-step rendering with contentDesc", () => {
    test("should render prompt with contentDesc directly in template", () => {
      const prompt = new Prompt(
        {
          contentDesc: "JVM code",
          instructions: ["Extract class name", "Extract methods"],
          responseSchema: z.object({ name: z.string() }),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: true,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

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
      const prompt = new Prompt(
        {
          contentDesc: "a set of source file summaries",
          instructions: ["a list of entities"],
          responseSchema: z.object({ technologies: z.array(z.string()) }),
          dataBlockHeader: "FILE_SUMMARIES",
          wrapInCodeBlock: false,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const rendered = prompt.renderPrompt("summaries...");

      // Should use contentDesc without "the" article (since it's already "a set of")
      expect(rendered).toContain("a set of source file summaries");
      expect(rendered).toContain("a list of entities");
    });

    test("should render reduce insights prompt with complex contentDesc", () => {
      const prompt = new Prompt(
        {
          contentDesc:
            "several JSON objects, each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized",
          instructions: ["a consolidated list of 'Entities'"],
          responseSchema: z.object({ technologies: z.array(z.string()) }),
          dataBlockHeader: "FRAGMENTED_DATA",
          wrapInCodeBlock: false,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const rendered = prompt.renderPrompt('[{"technologies": ["User"]}]', {
        categoryKey: "technologies",
      });

      // Should contain the contentDesc with template placeholder replaced
      expect(rendered).toContain("consolidate these lists");
      expect(rendered).toContain("a consolidated list of 'Entities'");
    });

    test("should join multiple instructions with double newlines", () => {
      const prompt = new Prompt(
        {
          contentDesc: "Python code",
          instructions: ["First instruction", "Second instruction", "Third instruction"],
          responseSchema: z.string(),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const rendered = prompt.renderPrompt("print('test')");

      // Instructions should be joined with \n\n
      expect(rendered).toContain("First instruction\n\nSecond instruction\n\nThird instruction");
    });

    test("should render ANALYSIS_PROMPT_TEMPLATE without partialAnalysisNote placeholder", () => {
      const prompt = new Prompt(
        {
          contentDesc: "JavaScript code",
          instructions: ["Analyze the code"],
          responseSchema: z.object({ result: z.string() }),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const rendered = prompt.renderPrompt("const x = 1;");

      // Should not contain any placeholder
      expect(rendered).not.toContain("{{partialAnalysisNote}}");
      expect(rendered).toContain("The JSON response must follow this JSON schema:");
    });

    test("should render PARTIAL_ANALYSIS_TEMPLATE with partial analysis note", () => {
      const prompt = new Prompt(
        {
          contentDesc: "Ruby code",
          instructions: ["Extract class info"],
          responseSchema: z.object({ className: z.string() }),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        PARTIAL_ANALYSIS_TEMPLATE,
      );

      const rendered = prompt.renderPrompt("class Foo; end");

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
      expect(rendered).toContain("The JSON response must follow this JSON schema:");
    });

    test("should wrap content in code blocks when wrapInCodeBlock is true", () => {
      const prompt = new Prompt(
        {
          contentDesc: "C# code",
          instructions: ["Find classes"],
          responseSchema: z.object({ classes: z.array(z.string()) }),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: true,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const content = "public class MyClass { }";
      const rendered = prompt.renderPrompt(content);

      // Should have triple backticks around content
      // Format is: CODE:\n```\n{content}```
      expect(rendered).toContain("CODE:\n```\n" + content + "```");
    });

    test("should not wrap content when wrapInCodeBlock is false", () => {
      const prompt = new Prompt(
        {
          contentDesc: "XML configuration",
          instructions: ["Extract framework info"],
          responseSchema: z.object({ framework: z.string() }),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const content = "<config></config>";
      const rendered = prompt.renderPrompt(content);

      // Should not have triple backticks
      expect(rendered).not.toContain("```\n" + content + "\n```");
      expect(rendered).toContain(content);
    });
  });

  describe("Backward compatibility - contentDesc in data passed to renderPrompt", () => {
    test("should prioritize contentDesc from definition over data", () => {
      const prompt = new Prompt(
        {
          contentDesc: "TypeScript code",
          instructions: ["Analyze"],
          responseSchema: z.string(),
          dataBlockHeader: "CODE",
          wrapInCodeBlock: false,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      // Even if contentDesc is passed in extras, definition's contentDesc takes precedence
      const rendered = prompt.renderPrompt("const x = 1;", {
        contentDesc: "this should be ignored",
      });

      expect(rendered).toContain("TypeScript code");
      expect(rendered).not.toContain("this should be ignored");
    });
  });
});
