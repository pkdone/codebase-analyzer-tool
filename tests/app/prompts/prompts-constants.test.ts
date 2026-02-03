/**
 * Tests for prompts.constants.ts
 */

import { fillPrompt } from "type-safe-prompt";
import {
  DEFAULT_PERSONA_INTRODUCTION,
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  FRAGMENTED_DATA_BLOCK_HEADER,
  PARTIAL_ANALYSIS_NOTE_TEMPLATE,
  CODEBASE_QUERY_TEMPLATE,
  INSTRUCTION_SECTION_TITLES,
} from "../../../src/app/prompts/prompts.constants";

describe("prompts.constants", () => {
  describe("DEFAULT_PERSONA_INTRODUCTION", () => {
    it("should be a non-empty string", () => {
      expect(DEFAULT_PERSONA_INTRODUCTION).toBeDefined();
      expect(typeof DEFAULT_PERSONA_INTRODUCTION).toBe("string");
      expect(DEFAULT_PERSONA_INTRODUCTION.length).toBeGreaterThan(0);
    });

    it("should contain key terms", () => {
      expect(DEFAULT_PERSONA_INTRODUCTION).toContain("senior developer");
      expect(DEFAULT_PERSONA_INTRODUCTION).toContain("analyzing");
    });
  });

  describe("data block headers", () => {
    it("should define CODE_DATA_BLOCK_HEADER", () => {
      expect(CODE_DATA_BLOCK_HEADER).toBe("CODE");
    });

    it("should define FILE_SUMMARIES_DATA_BLOCK_HEADER", () => {
      expect(FILE_SUMMARIES_DATA_BLOCK_HEADER).toBe("FILE_SUMMARIES");
    });

    it("should define FRAGMENTED_DATA_BLOCK_HEADER", () => {
      expect(FRAGMENTED_DATA_BLOCK_HEADER).toBe("FRAGMENTED_DATA");
    });
  });

  describe("PARTIAL_ANALYSIS_NOTE_TEMPLATE", () => {
    it("should be defined as a non-empty string", () => {
      expect(PARTIAL_ANALYSIS_NOTE_TEMPLATE).toBeDefined();
      expect(typeof PARTIAL_ANALYSIS_NOTE_TEMPLATE).toBe("string");
      expect(PARTIAL_ANALYSIS_NOTE_TEMPLATE.length).toBeGreaterThan(0);
    });

    it("should contain the {{header}} placeholder", () => {
      expect(PARTIAL_ANALYSIS_NOTE_TEMPLATE).toContain("{{header}}");
    });

    it("should contain expected content", () => {
      expect(PARTIAL_ANALYSIS_NOTE_TEMPLATE).toContain("partial analysis");
      expect(PARTIAL_ANALYSIS_NOTE_TEMPLATE).toContain("subset");
    });

    it("should render correctly with fillPrompt", () => {
      const rendered = fillPrompt(PARTIAL_ANALYSIS_NOTE_TEMPLATE, {
        header: "file summaries",
      });

      expect(rendered).toContain("file summaries");
      expect(rendered).toContain("partial analysis");
      expect(rendered).not.toContain("{{header}}");
    });

    it("should end with double newlines for proper formatting", () => {
      expect(PARTIAL_ANALYSIS_NOTE_TEMPLATE).toMatch(/\n\n$/);
    });

    it("should render with different header values", () => {
      const testCases = [
        { input: "code", expected: "much larger set of code" },
        { input: "fragmented data", expected: "much larger set of fragmented data" },
        { input: "file summaries", expected: "much larger set of file summaries" },
      ];

      testCases.forEach(({ input, expected }) => {
        const rendered = fillPrompt(PARTIAL_ANALYSIS_NOTE_TEMPLATE, { header: input });
        expect(rendered).toContain(expected);
      });
    });
  });

  describe("CODEBASE_QUERY_TEMPLATE", () => {
    it("should be defined with required placeholders", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{personaIntroduction}}");
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{question}}");
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{content}}");
    });

    it("should contain QUESTION and CODE section markers", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("QUESTION:");
      expect(CODEBASE_QUERY_TEMPLATE).toContain("CODE:");
    });

    it("should render correctly with fillPrompt", () => {
      const rendered = fillPrompt(CODEBASE_QUERY_TEMPLATE, {
        personaIntroduction: "Act as a test assistant.",
        question: "How does authentication work?",
        content: "const auth = { login: () => {} };",
      });

      expect(rendered).toContain("Act as a test assistant.");
      expect(rendered).toContain("How does authentication work?");
      expect(rendered).toContain("const auth = { login: () => {} };");
      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe("INSTRUCTION_SECTION_TITLES", () => {
    it("should define all expected section titles", () => {
      expect(INSTRUCTION_SECTION_TITLES.BASIC_INFO).toBe("Basic Information");
      expect(INSTRUCTION_SECTION_TITLES.CLASS_INFO).toBe("Class Information");
      expect(INSTRUCTION_SECTION_TITLES.MODULE_INFO).toBe("Module Information");
      expect(INSTRUCTION_SECTION_TITLES.PURPOSE_AND_IMPLEMENTATION).toBe(
        "Purpose and Implementation",
      );
      expect(INSTRUCTION_SECTION_TITLES.REFERENCES).toBe("References");
      expect(INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS).toBe("References and Dependencies");
      expect(INSTRUCTION_SECTION_TITLES.PUBLIC_API).toBe("Public API");
      expect(INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS).toBe("User Input Fields");
      expect(INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS).toBe("Integration Points");
      expect(INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION).toBe("Database Integration");
      expect(INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS).toBe(
        "Database Integration Analysis",
      );
      expect(INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS).toBe("Code Quality Metrics");
      expect(INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION).toBe("User Interface Framework");
      expect(INSTRUCTION_SECTION_TITLES.DEPENDENCIES).toBe("Dependencies");
      expect(INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS).toBe("Database Objects");
      expect(INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS).toBe("Scheduled Jobs");
      expect(INSTRUCTION_SECTION_TITLES.INSTRUCTIONS).toBe("Instructions");
    });

    it("should have unique values for all titles", () => {
      const values = Object.values(INSTRUCTION_SECTION_TITLES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
});
