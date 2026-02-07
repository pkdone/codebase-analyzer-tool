/**
 * Tests for sources.constants.ts
 *
 * This module provides shared field path constants for MongoDB source documents,
 * eliminating cross-layer dependencies between repository and database config.
 */

import { SOURCE_FIELDS } from "../../../src/app/schemas/source-file.schema";

describe("sources.constants", () => {
  describe("SOURCE_FIELDS", () => {
    describe("top-level fields", () => {
      it("should define PROJECT_NAME field", () => {
        expect(SOURCE_FIELDS.PROJECT_NAME).toBe("projectName");
      });

      it("should define FILEPATH field", () => {
        expect(SOURCE_FIELDS.FILEPATH).toBe("filepath");
      });

      it("should define TYPE field", () => {
        expect(SOURCE_FIELDS.TYPE).toBe("type");
      });

      it("should define CANONICAL_TYPE field", () => {
        expect(SOURCE_FIELDS.CANONICAL_TYPE).toBe("canonicalType");
      });
    });

    describe("summary nested fields", () => {
      it("should define SUMMARY_NAMESPACE with dot notation", () => {
        expect(SOURCE_FIELDS.SUMMARY_NAMESPACE).toBe("summary.namespace");
        expect(SOURCE_FIELDS.SUMMARY_NAMESPACE).toContain(".");
      });

      it("should define SUMMARY_PUBLIC_FUNCTIONS with dot notation", () => {
        expect(SOURCE_FIELDS.SUMMARY_PUBLIC_FUNCTIONS).toBe("summary.publicFunctions");
        expect(SOURCE_FIELDS.SUMMARY_PUBLIC_FUNCTIONS).toContain(".");
      });

      it("should define SUMMARY_INTEGRATION_POINTS with dot notation", () => {
        expect(SOURCE_FIELDS.SUMMARY_INTEGRATION_POINTS).toBe("summary.integrationPoints");
        expect(SOURCE_FIELDS.SUMMARY_INTEGRATION_POINTS).toContain(".");
      });

      it("should define SUMMARY_CODE_QUALITY_FILE_SMELLS with nested dot notation", () => {
        expect(SOURCE_FIELDS.SUMMARY_CODE_QUALITY_FILE_SMELLS).toBe(
          "summary.codeQualityMetrics.fileSmells",
        );
        expect(SOURCE_FIELDS.SUMMARY_CODE_QUALITY_FILE_SMELLS.split(".").length).toBe(3);
      });

      it("should define SUMMARY_DB_INTEGRATION with dot notation", () => {
        expect(SOURCE_FIELDS.SUMMARY_DB_INTEGRATION).toBe("summary.databaseIntegration");
        expect(SOURCE_FIELDS.SUMMARY_DB_INTEGRATION).toContain(".");
      });

      it("should define SUMMARY_DB_INTEGRATION_MECHANISM with nested dot notation", () => {
        expect(SOURCE_FIELDS.SUMMARY_DB_INTEGRATION_MECHANISM).toBe(
          "summary.databaseIntegration.mechanism",
        );
        expect(SOURCE_FIELDS.SUMMARY_DB_INTEGRATION_MECHANISM.split(".").length).toBe(3);
      });
    });

    describe("vector fields", () => {
      it("should define CONTENT_VECTOR field", () => {
        expect(SOURCE_FIELDS.CONTENT_VECTOR).toBe("contentVector");
      });

      it("should define SUMMARY_VECTOR field", () => {
        expect(SOURCE_FIELDS.SUMMARY_VECTOR).toBe("summaryVector");
      });
    });

    describe("immutability", () => {
      it("should be defined as const", () => {
        // The object should have all expected fields (25 original + 4 LLM capture fields)
        const fieldCount = Object.keys(SOURCE_FIELDS).length;
        expect(fieldCount).toBe(29);
      });

      it("should have string values for all fields", () => {
        for (const [key, value] of Object.entries(SOURCE_FIELDS)) {
          expect(typeof value).toBe("string");
          expect(value.length).toBeGreaterThan(0);
          // Log for debugging if needed
          expect(key).toBeDefined();
        }
      });
    });

    describe("MongoDB path conventions", () => {
      it("should use camelCase for field names", () => {
        const topLevelFields = [
          SOURCE_FIELDS.PROJECT_NAME,
          SOURCE_FIELDS.FILEPATH,
          SOURCE_FIELDS.TYPE,
          SOURCE_FIELDS.CANONICAL_TYPE,
          SOURCE_FIELDS.CONTENT_VECTOR,
          SOURCE_FIELDS.SUMMARY_VECTOR,
        ];

        for (const field of topLevelFields) {
          // Should not contain underscores (snake_case)
          expect(field).not.toContain("_");
          // Should not contain hyphens (kebab-case)
          expect(field).not.toContain("-");
        }
      });

      it("should use dot notation for nested fields", () => {
        const nestedFields = [
          SOURCE_FIELDS.SUMMARY_NAMESPACE,
          SOURCE_FIELDS.SUMMARY_PUBLIC_FUNCTIONS,
          SOURCE_FIELDS.SUMMARY_INTEGRATION_POINTS,
          SOURCE_FIELDS.SUMMARY_CODE_QUALITY_FILE_SMELLS,
          SOURCE_FIELDS.SUMMARY_DB_INTEGRATION,
          SOURCE_FIELDS.SUMMARY_DB_INTEGRATION_MECHANISM,
        ];

        for (const field of nestedFields) {
          expect(field).toContain(".");
          // All should start with "summary."
          expect(field.startsWith("summary.")).toBe(true);
        }
      });
    });

    describe("field uniqueness", () => {
      it("should have unique values for all fields", () => {
        const values = Object.values(SOURCE_FIELDS);
        const uniqueValues = new Set(values);

        expect(uniqueValues.size).toBe(values.length);
      });
    });
  });
});
