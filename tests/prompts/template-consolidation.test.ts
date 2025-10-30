import {
  SOURCES_TEMPLATE,
  APP_SUMMARY_TEMPLATE,
  REDUCE_INSIGHTS_TEMPLATE,
} from "../../src/prompts/prompt";
import { Prompt } from "../../src/prompts/prompt";
import { z } from "zod";

describe("Template Consolidation", () => {
  describe("SOURCES_TEMPLATE", () => {
    it("should be defined and exported", () => {
      expect(SOURCES_TEMPLATE).toBeDefined();
      expect(typeof SOURCES_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(SOURCES_TEMPLATE).toContain("{{contentDesc}}");
      expect(SOURCES_TEMPLATE).toContain("{{instructions}}");
      expect(SOURCES_TEMPLATE).toContain("{{jsonSchema}}");
      expect(SOURCES_TEMPLATE).toContain("{{forceJSON}}");
      expect(SOURCES_TEMPLATE).toContain("{{content}}");
    });

    it("should contain expected structure", () => {
      expect(SOURCES_TEMPLATE).toContain("Act as a senior developer analyzing the code");
      expect(SOURCES_TEMPLATE).toContain("CODE:");
      expect(SOURCES_TEMPLATE).toContain("```");
    });

    it("should not contain any undefined placeholders", () => {
      // Check that all placeholders are properly formatted
      const placeholderRegex = /\{\{[^}]+\}\}/g;
      const placeholders = SOURCES_TEMPLATE.match(placeholderRegex) ?? [];

      const expectedPlaceholders = [
        "{{contentDesc}}",
        "{{instructions}}",
        "{{jsonSchema}}",
        "{{forceJSON}}",
        "{{content}}",
      ];

      placeholders.forEach((placeholder) => {
        expect(expectedPlaceholders).toContain(placeholder);
      });
    });
  });

  describe("APP_SUMMARY_TEMPLATE", () => {
    it("should be defined and exported", () => {
      expect(APP_SUMMARY_TEMPLATE).toBeDefined();
      expect(typeof APP_SUMMARY_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(APP_SUMMARY_TEMPLATE).toContain("{{contentDesc}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{instructions}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{jsonSchema}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{forceJSON}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{content}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should contain expected structure", () => {
      expect(APP_SUMMARY_TEMPLATE).toContain("Act as a senior developer analyzing the code");
      expect(APP_SUMMARY_TEMPLATE).toContain("FILE_SUMMARIES:");
    });

    it("should support partial analysis note", () => {
      expect(APP_SUMMARY_TEMPLATE).toContain(
        "{{partialAnalysisNote}}The JSON response must follow this JSON schema:",
      );
    });
  });

  describe("REDUCE_INSIGHTS_TEMPLATE", () => {
    it("should be defined and exported", () => {
      expect(REDUCE_INSIGHTS_TEMPLATE).toBeDefined();
      expect(typeof REDUCE_INSIGHTS_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{contentDesc}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{categoryKey}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{jsonSchema}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{forceJSON}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{content}}");
    });

    it("should contain expected structure", () => {
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("Act as a senior developer analyzing the code");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("FRAGMENTED_DATA:");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain(
        "consolidate these lists into a single, de-duplicated",
      );
    });
  });

  describe("Template Consistency", () => {
    it("should have consistent JSON schema formatting", () => {
      const templates = [SOURCES_TEMPLATE, APP_SUMMARY_TEMPLATE, REDUCE_INSIGHTS_TEMPLATE];

      templates.forEach((template) => {
        expect(template).toContain("```json");
        expect(template).toContain("{{jsonSchema}}");
        expect(template).toContain("```");
      });
    });

    it("should have consistent force JSON formatting", () => {
      const templates = [SOURCES_TEMPLATE, APP_SUMMARY_TEMPLATE, REDUCE_INSIGHTS_TEMPLATE];

      templates.forEach((template) => {
        expect(template).toContain("{{forceJSON}}");
      });
    });

    it("should have consistent instruction formatting", () => {
      const templates = [SOURCES_TEMPLATE, APP_SUMMARY_TEMPLATE];

      templates.forEach((template) => {
        expect(template).toContain("{{instructions}}");
      });

      // REDUCE_INSIGHTS_TEMPLATE has a different structure
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{contentDesc}}");
    });
  });

  describe("Template Usage", () => {
    it("should be usable in Prompt class", () => {
      const mockDefinition = {
        contentDesc: "test content",
        instructions: [{ points: ["test instruction"] }],
        responseSchema: z.string(),
        template: SOURCES_TEMPLATE,
      };

      // This should not throw an error
      expect(() => {
        new Prompt(mockDefinition, "test content");
      }).not.toThrow();
    });
  });
});
