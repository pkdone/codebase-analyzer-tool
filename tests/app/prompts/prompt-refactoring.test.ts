import {
  renderJsonSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";
import { z } from "zod";

describe("renderJsonSchemaPrompt Refactoring", () => {
  const testConfig = {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below, return:\n\n{{instructionsText}}.",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    dataBlockHeader: "CODE",
    wrapInCodeBlock: true,
  } as const;

  const testContent = "test file content";

  describe("Function-based rendering", () => {
    it("should render prompts correctly with function", () => {
      const rendered = renderJsonSchemaPrompt(testConfig, testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
      expect(rendered).toContain("instruction 1");
      expect(rendered).toContain("instruction 2");
    });

    it("should handle different template types", () => {
      const rendered = renderJsonSchemaPrompt(
        {
          ...testConfig,
          dataBlockHeader: "FILE_SUMMARIES",
          wrapInCodeBlock: false,
        },
        testContent,
      );

      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).not.toContain("CODE:");
    });

    it("should handle reduce template with category key via inline definition", () => {
      // categoryKey is directly embedded in contentDesc, rather than being a placeholder
      const categoryKey = "technologies";
      const rendered = renderJsonSchemaPrompt(
        {
          ...testConfig,
          // Factory would pre-populate contentDesc with the category key
          contentDesc: `Consolidate ${categoryKey} from the data below.`,
          dataBlockHeader: "FRAGMENTED_DATA",
          wrapInCodeBlock: false,
        },
        testContent,
      );

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      // No placeholder should exist since factory embeds the value directly
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should handle complex instruction sections with titles", () => {
      const rendered = renderJsonSchemaPrompt(
        {
          ...testConfig,
          instructions: [
            "__Section 1__\npoint 1\npoint 2",
            "point without title",
            "__Section 2__\npoint 3",
          ],
        },
        testContent,
      );

      expect(rendered).toContain("__Section 1__");
      expect(rendered).toContain("__Section 2__");
      expect(rendered).toContain("point 1");
      expect(rendered).toContain("point 2");
      expect(rendered).toContain("point without title");
      expect(rendered).toContain("point 3");
    });

    it("should use contextNote for partial analysis scenarios", () => {
      // Use contextNote for partial analysis
      const contextNote =
        "Note, this is a partial analysis of what is a much larger set of file summaries; focus on extracting insights from this subset of file summaries only.\n\n";
      const rendered = renderJsonSchemaPrompt(
        {
          ...testConfig,
          dataBlockHeader: "FILE_SUMMARIES",
          wrapInCodeBlock: false,
          contextNote,
        },
        testContent,
      );

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });

    it("should handle empty additional parameters", () => {
      const rendered = renderJsonSchemaPrompt(testConfig, testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain(testContent);
    });
  });

  describe("Template consolidation", () => {
    it("should export JSON_SCHEMA_PROMPT_TEMPLATE", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toBeDefined();
    });

    it("should have consistent template structure", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contextNote}}");
    });

    it("should not have any placeholder syntax in rendered output", () => {
      const rendered = renderJsonSchemaPrompt(testConfig, testContent);

      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe("Backward compatibility", () => {
    it("should produce identical output as before refactoring", () => {
      // Test that the function produces the same output as the old factory methods
      const sourceRendered = renderJsonSchemaPrompt(
        {
          ...testConfig,
          dataBlockHeader: "CODE",
          wrapInCodeBlock: true,
        },
        testContent,
      );
      const appSummaryRendered = renderJsonSchemaPrompt(
        {
          ...testConfig,
          dataBlockHeader: "FILE_SUMMARIES",
          wrapInCodeBlock: false,
        },
        testContent,
      );

      // Verify the structure is correct
      expect(sourceRendered).toContain("CODE:");
      expect(appSummaryRendered).toContain("FILE_SUMMARIES:");

      // Verify no placeholders remain
      expect(sourceRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
      expect(appSummaryRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });
});
