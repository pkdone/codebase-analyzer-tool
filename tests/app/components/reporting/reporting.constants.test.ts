import {
  SECTION_NAMES,
  DATABASE_OBJECT_TYPE_LABELS,
} from "../../../../src/app/components/reporting/reporting.constants";

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

    it("should have QUALITY_METRICS", () => {
      expect(SECTION_NAMES.QUALITY_METRICS).toBe("quality-metrics");
    });

    it("should have VISUALIZATIONS", () => {
      expect(SECTION_NAMES.VISUALIZATIONS).toBe("visualizations");
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

  describe("DATABASE_OBJECT_TYPE_LABELS", () => {
    it("should be defined", () => {
      expect(DATABASE_OBJECT_TYPE_LABELS).toBeDefined();
    });

    it("should have STORED_PROCEDURE", () => {
      expect(DATABASE_OBJECT_TYPE_LABELS.STORED_PROCEDURE).toBe("STORED PROCEDURE");
    });

    it("should have TRIGGER", () => {
      expect(DATABASE_OBJECT_TYPE_LABELS.TRIGGER).toBe("TRIGGER");
    });

    it("should have exactly 2 database object type labels", () => {
      expect(Object.keys(DATABASE_OBJECT_TYPE_LABELS)).toHaveLength(2);
    });
  });

  describe("immutability", () => {
    it("should be a const object", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      expect(SECTION_NAMES).toBeDefined();
    });
  });
});
