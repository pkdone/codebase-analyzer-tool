import { SOURCE_FIELDS } from "../../../../src/app/schemas/source-file.schema";

describe("SOURCE_FIELDS Constants", () => {
  describe("top-level field paths", () => {
    it("should have PROJECT_NAME defined", () => {
      expect(SOURCE_FIELDS.PROJECT_NAME).toBe("projectName");
    });

    it("should have FILEPATH defined", () => {
      expect(SOURCE_FIELDS.FILEPATH).toBe("filepath");
    });

    it("should have TYPE defined", () => {
      expect(SOURCE_FIELDS.TYPE).toBe("type");
    });

    it("should have CANONICAL_TYPE defined", () => {
      expect(SOURCE_FIELDS.CANONICAL_TYPE).toBe("canonicalType");
    });
  });

  describe("summary nested field paths", () => {
    it("should have SUMMARY_NAMESPACE with correct dot notation", () => {
      expect(SOURCE_FIELDS.SUMMARY_NAMESPACE).toBe("summary.namespace");
    });

    it("should have SUMMARY_PUBLIC_FUNCTIONS with correct dot notation", () => {
      expect(SOURCE_FIELDS.SUMMARY_PUBLIC_FUNCTIONS).toBe("summary.publicFunctions");
    });

    it("should have SUMMARY_INTEGRATION_POINTS with correct dot notation", () => {
      expect(SOURCE_FIELDS.SUMMARY_INTEGRATION_POINTS).toBe("summary.integrationPoints");
    });

    it("should have SUMMARY_CODE_QUALITY_FILE_SMELLS with correct nested dot notation", () => {
      expect(SOURCE_FIELDS.SUMMARY_CODE_QUALITY_FILE_SMELLS).toBe(
        "summary.codeQualityMetrics.fileSmells",
      );
    });

    it("should have SUMMARY_DB_INTEGRATION with correct dot notation", () => {
      expect(SOURCE_FIELDS.SUMMARY_DB_INTEGRATION).toBe("summary.databaseIntegration");
    });

    it("should have SUMMARY_DB_INTEGRATION_MECHANISM with correct nested dot notation", () => {
      expect(SOURCE_FIELDS.SUMMARY_DB_INTEGRATION_MECHANISM).toBe(
        "summary.databaseIntegration.mechanism",
      );
    });
  });

  describe("vector field paths", () => {
    it("should have CONTENT_VECTOR defined", () => {
      expect(SOURCE_FIELDS.CONTENT_VECTOR).toBe("contentVector");
    });

    it("should have SUMMARY_VECTOR defined", () => {
      expect(SOURCE_FIELDS.SUMMARY_VECTOR).toBe("summaryVector");
    });
  });

  describe("MongoDB index compatibility", () => {
    it("should provide valid field paths for MongoDB index spec", () => {
      // MongoDB index spec uses objects like { "field.path": 1 }
      const indexSpec = {
        [SOURCE_FIELDS.PROJECT_NAME]: 1,
        [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1,
      };

      expect(indexSpec).toEqual({
        projectName: 1,
        "summary.namespace": 1,
      });
    });

    it("should allow building compound indexes", () => {
      const compoundIndexSpec = {
        [SOURCE_FIELDS.PROJECT_NAME]: 1,
        [SOURCE_FIELDS.TYPE]: 1,
      };

      expect(Object.keys(compoundIndexSpec)).toHaveLength(2);
      expect(compoundIndexSpec.projectName).toBe(1);
      expect(compoundIndexSpec.type).toBe(1);
    });
  });

  describe("constants structure", () => {
    it("should be an object with all expected keys", () => {
      const expectedKeys = [
        "PROJECT_NAME",
        "FILEPATH",
        "TYPE",
        "CANONICAL_TYPE",
        "SUMMARY_NAMESPACE",
        "SUMMARY_PUBLIC_FUNCTIONS",
        "SUMMARY_INTEGRATION_POINTS",
        "SUMMARY_CODE_QUALITY_FILE_SMELLS",
        "SUMMARY_DB_INTEGRATION",
        "SUMMARY_DB_INTEGRATION_MECHANISM",
        "CONTENT_VECTOR",
        "SUMMARY_VECTOR",
      ];

      for (const key of expectedKeys) {
        expect(SOURCE_FIELDS).toHaveProperty(key);
      }
    });

    it("should have all string values", () => {
      for (const [_key, value] of Object.entries(SOURCE_FIELDS)) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });
});
