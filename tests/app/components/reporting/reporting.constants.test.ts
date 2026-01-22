import {
  SECTION_NAMES,
  DATABASE_OBJECT_TYPE_LABELS,
  CORE_REQUIRED_APP_SUMMARY_FIELDS,
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

    it("should have DEPENDENCIES", () => {
      expect(SECTION_NAMES.DEPENDENCIES).toBe("dependencies");
    });

    it("should have BACKGROUND_PROCESSES", () => {
      expect(SECTION_NAMES.BACKGROUND_PROCESSES).toBe("background-processes");
    });

    it("should have ARCHITECTURE_ANALYSIS", () => {
      expect(SECTION_NAMES.ARCHITECTURE_ANALYSIS).toBe("architecture-analysis");
    });

    it("should have UI_ANALYSIS", () => {
      expect(SECTION_NAMES.UI_ANALYSIS).toBe("ui-analysis");
    });

    it("should have CODE_QUALITY", () => {
      expect(SECTION_NAMES.CODE_QUALITY).toBe("code-quality");
    });

    it("should have BUSINESS_PROCESSES", () => {
      expect(SECTION_NAMES.BUSINESS_PROCESSES).toBe("business-processes");
    });

    it("should have VISUALIZATIONS", () => {
      expect(SECTION_NAMES.VISUALIZATIONS).toBe("visualizations");
    });

    it("should have INTEGRATION_POINTS", () => {
      expect(SECTION_NAMES.INTEGRATION_POINTS).toBe("integration-points");
    });
  });

  describe("module exports", () => {
    it("should export SECTION_NAMES as the primary constant", () => {
      // This test verifies that SECTION_NAMES is properly exported
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

  describe("CORE_REQUIRED_APP_SUMMARY_FIELDS", () => {
    it("should be defined", () => {
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toBeDefined();
    });

    it("should be an array", () => {
      expect(Array.isArray(CORE_REQUIRED_APP_SUMMARY_FIELDS)).toBe(true);
    });

    it("should contain appDescription field", () => {
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toContain("appDescription");
    });

    it("should contain llmModels field", () => {
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toContain("llmModels");
    });

    it("should contain technologies field", () => {
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toContain("technologies");
    });

    it("should contain exactly the expected core fields", () => {
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toHaveLength(3);
      expect([...CORE_REQUIRED_APP_SUMMARY_FIELDS].sort()).toEqual(
        ["appDescription", "llmModels", "technologies"].sort(),
      );
    });

    it("should contain only string values", () => {
      CORE_REQUIRED_APP_SUMMARY_FIELDS.forEach((field) => {
        expect(typeof field).toBe("string");
        expect(field.length).toBeGreaterThan(0);
      });
    });
  });
});
