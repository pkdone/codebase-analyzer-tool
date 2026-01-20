/**
 * Tests for contextNote functionality in JSONSchemaPrompt.
 *
 * These tests verify that the contextNote mechanism works correctly,
 * allowing the application layer to inject context-specific information
 * into prompts without the common layer having domain-specific knowledge.
 */

import { z } from "zod";
import { JSONSchemaPrompt } from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";

describe("JSONSchemaPrompt contextNote", () => {
  const baseConfig = {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc: "test content",
    instructions: ["test instruction"],
    responseSchema: z.object({ result: z.string() }),
    dataBlockHeader: "TEST_DATA",
    wrapInCodeBlock: false,
  } as const;

  describe("contextNote rendering", () => {
    it("should include contextNote text when provided", () => {
      const contextNote = "This is a custom context note for the prompt.\n\n";
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        contextNote,
      });

      const rendered = prompt.renderPrompt("sample content");

      expect(rendered).toContain("This is a custom context note for the prompt.");
    });

    it("should not include any context note when contextNote is undefined", () => {
      const prompt = new JSONSchemaPrompt(baseConfig);

      const rendered = prompt.renderPrompt("sample content");

      // Should not contain undefined text
      expect(rendered).not.toContain("undefined");
      // Should still render correctly
      expect(rendered).toContain("sample content");
      expect(rendered).toContain("TEST_DATA:");
    });

    it("should not include any context note when contextNote is empty string", () => {
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        contextNote: "",
      });

      const rendered = prompt.renderPrompt("sample content");

      // Should render without any extra whitespace issues
      expect(rendered).toContain("sample content");
      expect(rendered).not.toContain("undefined");
    });

    it("should position contextNote before the schema section", () => {
      const contextNote = "CONTEXT_NOTE_MARKER\n\n";
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        contextNote,
      });

      const rendered = prompt.renderPrompt("sample content");

      const contextNoteIndex = rendered.indexOf("CONTEXT_NOTE_MARKER");
      const schemaIndex = rendered.indexOf("JSON schema");

      expect(contextNoteIndex).toBeGreaterThan(-1);
      expect(schemaIndex).toBeGreaterThan(-1);
      expect(contextNoteIndex).toBeLessThan(schemaIndex);
    });
  });

  describe("partial analysis use case", () => {
    /**
     * Helper to build a partial analysis note (mimics the app layer function).
     */
    function buildPartialAnalysisNote(dataBlockHeader: string): string {
      const formattedHeader = dataBlockHeader.toLowerCase().replace(/_/g, " ");
      return `Note, this is a partial analysis of what is a much larger set of ${formattedHeader}; focus on extracting insights from this subset of ${formattedHeader} only.\n\n`;
    }

    it("should support partial analysis note via contextNote", () => {
      const contextNote = buildPartialAnalysisNote("FILE_SUMMARIES");
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        dataBlockHeader: "FILE_SUMMARIES",
        contextNote,
      });

      const rendered = prompt.renderPrompt("file summaries content");

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("file summaries");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });

    it("should correctly format different dataBlockHeaders in partial analysis notes", () => {
      const testCases = [
        { header: "FILE_SUMMARIES", expected: "file summaries" },
        { header: "CODE", expected: "code" },
        { header: "FRAGMENTED_DATA", expected: "fragmented data" },
      ];

      testCases.forEach(({ header, expected }) => {
        const contextNote = buildPartialAnalysisNote(header);
        const prompt = new JSONSchemaPrompt({
          ...baseConfig,
          dataBlockHeader: header,
          contextNote,
        });

        const rendered = prompt.renderPrompt("test content");

        expect(rendered).toContain(`much larger set of ${expected}`);
      });
    });
  });

  describe("contextNote with different content types", () => {
    it("should work with JSON content", () => {
      const contextNote = "Processing multiple JSON fragments.\n\n";
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        contextNote,
      });

      const jsonContent = JSON.stringify({ key: "value", nested: { data: [1, 2, 3] } });
      const rendered = prompt.renderPrompt(jsonContent);

      expect(rendered).toContain("Processing multiple JSON fragments.");
      expect(rendered).toContain(jsonContent);
    });

    it("should work with multiline code content", () => {
      const contextNote = "Analyzing a code snippet.\n\n";
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        wrapInCodeBlock: true,
        contextNote,
      });

      const codeContent = `function test() {
  return "hello";
}`;
      const rendered = prompt.renderPrompt(codeContent);

      expect(rendered).toContain("Analyzing a code snippet.");
      expect(rendered).toContain(codeContent);
    });
  });

  describe("contextNote property access", () => {
    it("should expose contextNote as a readonly property", () => {
      const contextNote = "Test context note\n\n";
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        contextNote,
      });

      expect(prompt.contextNote).toBe(contextNote);
    });

    it("should default contextNote to empty string when not provided", () => {
      const prompt = new JSONSchemaPrompt(baseConfig);

      expect(prompt.contextNote).toBe("");
    });
  });
});
