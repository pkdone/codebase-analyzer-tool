/**
 * Tests for centralized prompt constants.
 */

import { describe, test, expect } from "@jest/globals";
import {
  DEFAULT_PERSONA_INTRODUCTION,
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  FRAGMENTED_DATA_BLOCK_HEADER,
  CODEBASE_QUERY_TEMPLATE,
} from "../../../src/app/prompts/prompts.constants";

describe("Prompt Constants", () => {
  describe("DEFAULT_PERSONA_INTRODUCTION", () => {
    test("should be a non-empty string", () => {
      expect(typeof DEFAULT_PERSONA_INTRODUCTION).toBe("string");
      expect(DEFAULT_PERSONA_INTRODUCTION.length).toBeGreaterThan(0);
    });

    test("should contain senior developer persona", () => {
      expect(DEFAULT_PERSONA_INTRODUCTION).toContain("senior developer");
    });

    test("should reference code analysis", () => {
      expect(DEFAULT_PERSONA_INTRODUCTION).toContain("analyzing the code");
    });
  });

  describe("Data Block Headers", () => {
    test("CODE_DATA_BLOCK_HEADER should be 'CODE'", () => {
      expect(CODE_DATA_BLOCK_HEADER).toBe("CODE");
    });

    test("FILE_SUMMARIES_DATA_BLOCK_HEADER should be 'FILE_SUMMARIES'", () => {
      expect(FILE_SUMMARIES_DATA_BLOCK_HEADER).toBe("FILE_SUMMARIES");
    });

    test("FRAGMENTED_DATA_BLOCK_HEADER should be 'FRAGMENTED_DATA'", () => {
      expect(FRAGMENTED_DATA_BLOCK_HEADER).toBe("FRAGMENTED_DATA");
    });

    test("all data block headers should be uppercase with underscores only", () => {
      const headers = [
        CODE_DATA_BLOCK_HEADER,
        FILE_SUMMARIES_DATA_BLOCK_HEADER,
        FRAGMENTED_DATA_BLOCK_HEADER,
      ];

      for (const header of headers) {
        expect(header).toMatch(/^[A-Z_]+$/);
      }
    });
  });

  describe("CODEBASE_QUERY_TEMPLATE", () => {
    test("should be a non-empty string", () => {
      expect(typeof CODEBASE_QUERY_TEMPLATE).toBe("string");
      expect(CODEBASE_QUERY_TEMPLATE.length).toBeGreaterThan(0);
    });

    test("should contain personaIntroduction placeholder", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{personaIntroduction}}");
    });

    test("should contain question placeholder", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{question}}");
    });

    test("should contain content placeholder", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{content}}");
    });

    test("should contain QUESTION section marker", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("QUESTION:");
    });

    test("should contain CODE section marker", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("CODE:");
    });
  });
});
