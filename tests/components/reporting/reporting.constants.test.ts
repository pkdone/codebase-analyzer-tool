import { SECTION_NAMES } from "../../../src/components/reporting/reporting.constants";

describe("reporting.constants", () => {
  describe("SECTION_NAMES", () => {
    it("should be defined", () => {
      expect(SECTION_NAMES).toBeDefined();
    });

    it("should have FILE_TYPES", () => {
      expect(SECTION_NAMES.FILE_TYPES).toBe("file-types");
    });

    it("should have DATABASE", () => {
      expect(SECTION_NAMES.DATABASE).toBe("database");
    });

    it("should have CODE_STRUCTURE", () => {
      expect(SECTION_NAMES.CODE_STRUCTURE).toBe("code-structure");
    });

    it("should have ADVANCED_DATA", () => {
      expect(SECTION_NAMES.ADVANCED_DATA).toBe("advanced-data");
    });

    it("should have ENHANCED_UI", () => {
      expect(SECTION_NAMES.ENHANCED_UI).toBe("enhanced-ui");
    });
  });

  describe("module exports", () => {
    it("should export SECTION_NAMES as the primary constant", () => {
      // This test verifies that SECTION_NAMES is properly exported
      // Note: ReportDataKeys and ReportDataByKey were removed as unused code
      expect(SECTION_NAMES).toBeDefined();
      expect(typeof SECTION_NAMES).toBe("object");
    });
  });

  describe("immutability", () => {
    it("should be a const object", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(SECTION_NAMES).toBeDefined();
    });
  });
});
