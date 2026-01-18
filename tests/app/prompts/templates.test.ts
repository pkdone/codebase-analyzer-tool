import {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";
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
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should contain the persona introduction placeholder", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{personaIntroduction}}");
    });
  });

  describe("forPartialAnalysis flag", () => {
    const testConfig = {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "test content",
      instructions: ["test instruction"],
      responseSchema: z.object({ name: z.string() }),
      dataBlockHeader: "TEST",
      wrapInCodeBlock: false,
    };

    it("should include partial analysis note when forPartialAnalysis is true", () => {
      const prompt = new JSONSchemaPrompt({ ...testConfig, forPartialAnalysis: true });
      const rendered = prompt.renderPrompt("test data");

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });

    it("should NOT include partial analysis note when forPartialAnalysis is false", () => {
      const prompt = new JSONSchemaPrompt({ ...testConfig, forPartialAnalysis: false });
      const rendered = prompt.renderPrompt("test data");

      expect(rendered).not.toContain("partial analysis");
      expect(rendered).not.toContain("focus on extracting insights from this subset");
    });

    it("should NOT include partial analysis note when forPartialAnalysis is omitted", () => {
      const prompt = new JSONSchemaPrompt(testConfig);
      const rendered = prompt.renderPrompt("test data");

      expect(rendered).not.toContain("partial analysis");
      expect(rendered).not.toContain("focus on extracting insights from this subset");
    });
  });
});
