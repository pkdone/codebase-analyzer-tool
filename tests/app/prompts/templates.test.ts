import {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt-builders";
import { z } from "zod";

describe("prompts/templates", () => {
  describe("JSON_SCHEMA_PROMPT_TEMPLATE", () => {
    it("should be defined", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof JSON_SCHEMA_PROMPT_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentWrapper}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contextNote}}");
    });

    it("should contain the persona introduction placeholder", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{personaIntroduction}}");
    });
  });

  describe("contextNote handling", () => {
    const testConfig = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "test content",
      instructions: ["test instruction"],
      responseSchema: z.object({ name: z.string() }),
      dataBlockHeader: "TEST",
      wrapInCodeBlock: false,
    };

    it("should include context note when contextNote is provided", () => {
      const contextNote =
        "Note, this is a partial analysis of what is a much larger set of test; focus on extracting insights from this subset of test only.\n\n";
      const prompt = new JSONSchemaPrompt({ ...testConfig, contextNote });
      const rendered = prompt.renderPrompt("test data");

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });

    it("should NOT include context note when contextNote is empty string", () => {
      const prompt = new JSONSchemaPrompt({ ...testConfig, contextNote: "" });
      const rendered = prompt.renderPrompt("test data");

      expect(rendered).not.toContain("partial analysis");
      expect(rendered).not.toContain("focus on extracting insights from this subset");
    });

    it("should NOT include context note when contextNote is omitted", () => {
      const prompt = new JSONSchemaPrompt(testConfig);
      const rendered = prompt.renderPrompt("test data");

      expect(rendered).not.toContain("partial analysis");
      expect(rendered).not.toContain("focus on extracting insights from this subset");
    });
  });
});
