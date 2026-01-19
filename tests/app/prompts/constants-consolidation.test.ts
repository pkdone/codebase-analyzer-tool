/**
 * Tests for consolidated prompt constants.
 *
 * These tests verify that INSTRUCTION_SECTION_TITLES are properly exported
 * from prompts.constants.ts and re-exported from the utils module for
 * backward compatibility.
 */

import {
  INSTRUCTION_SECTION_TITLES,
  type InstructionSectionTitle,
} from "../../../src/app/prompts/prompts.constants";
import {
  INSTRUCTION_SECTION_TITLES as TITLES_FROM_UTILS,
  type InstructionSectionTitle as TitleFromUtils,
  buildInstructionBlock,
} from "../../../src/app/prompts/sources/utils";

describe("Consolidated Prompt Constants", () => {
  describe("INSTRUCTION_SECTION_TITLES in prompts.constants.ts", () => {
    it("should export all section titles", () => {
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

    it("should be frozen (as const)", () => {
      // Object.isFrozen returns true for const assertions in TypeScript
      expect(typeof INSTRUCTION_SECTION_TITLES).toBe("object");
      expect(Object.keys(INSTRUCTION_SECTION_TITLES).length).toBeGreaterThan(0);
    });
  });

  describe("Re-exports from sources/utils", () => {
    it("should re-export INSTRUCTION_SECTION_TITLES identically", () => {
      // The re-exported constant should be the exact same object reference
      expect(TITLES_FROM_UTILS).toBe(INSTRUCTION_SECTION_TITLES);
    });

    it("should have identical values when imported from either location", () => {
      expect(TITLES_FROM_UTILS.BASIC_INFO).toBe(INSTRUCTION_SECTION_TITLES.BASIC_INFO);
      expect(TITLES_FROM_UTILS.REFERENCES_AND_DEPS).toBe(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
      );
      expect(TITLES_FROM_UTILS.CODE_QUALITY_METRICS).toBe(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
      );
    });
  });

  describe("InstructionSectionTitle type", () => {
    it("should accept valid section title values", () => {
      const basicInfo: InstructionSectionTitle = "Basic Information";
      const codeQuality: InstructionSectionTitle = "Code Quality Metrics";
      const dbIntegration: InstructionSectionTitle = "Database Integration Analysis";

      expect(basicInfo).toBe(INSTRUCTION_SECTION_TITLES.BASIC_INFO);
      expect(codeQuality).toBe(INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS);
      expect(dbIntegration).toBe(INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS);
    });

    it("should be compatible when imported from either location", () => {
      // Both types should be interchangeable
      const fromConstants: InstructionSectionTitle = "Basic Information";
      const fromUtils: TitleFromUtils = fromConstants;

      expect(fromUtils).toBe("Basic Information");
    });
  });

  describe("buildInstructionBlock with consolidated constants", () => {
    it("should work with constants from prompts.constants.ts", () => {
      const block = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        "Extract the name",
        "Extract the purpose",
      );

      expect(block).toBe("__Basic Information__\nExtract the name\nExtract the purpose");
    });

    it("should work with constants from utils re-export", () => {
      const block = buildInstructionBlock(TITLES_FROM_UTILS.REFERENCES_AND_DEPS, [
        "Internal refs",
        "External refs",
      ]);

      expect(block).toBe("__References and Dependencies__\nInternal refs\nExternal refs");
    });

    it("should format title with double underscores", () => {
      const block = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        "Metric 1",
      );

      expect(block).toContain("__Code Quality Metrics__");
      expect(block).toContain("Metric 1");
    });

    it("should handle empty parts", () => {
      const block = buildInstructionBlock(INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS);

      expect(block).toBe("__Scheduled Jobs__");
    });
  });
});
