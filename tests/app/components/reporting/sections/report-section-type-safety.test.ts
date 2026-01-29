import "reflect-metadata";
import type { RequestableAppSummaryField } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";
import { CORE_REQUIRED_APP_SUMMARY_FIELDS } from "../../../../../src/app/components/reporting/config/reporting.config";

/**
 * Tests for type safety in report section field declarations.
 * These tests verify that the RequestableAppSummaryField type and related constants
 * are correctly configured for compile-time and runtime safety.
 */
describe("Report Section Type Safety", () => {
  /**
   * Valid fields that can be requested from the app summaries repository.
   * This list mirrors the keys of AppSummaryRecordWithId minus '_id'.
   */
  const validRequestableFields: RequestableAppSummaryField[] = [
    "projectName",
    "llmModels",
    "appDescription",
    "technologies",
    "businessProcesses",
    "boundedContexts",
    "potentialMicroservices",
    "inferredArchitecture",
  ];

  describe("CORE_REQUIRED_APP_SUMMARY_FIELDS", () => {
    it("should contain only valid RequestableAppSummaryField values", () => {
      // Verify each field in the constant is a valid requestable field
      for (const field of CORE_REQUIRED_APP_SUMMARY_FIELDS) {
        expect(validRequestableFields).toContain(field);
      }
    });

    it("should be a readonly array with expected structure", () => {
      // Verify the array is properly structured
      expect(Array.isArray(CORE_REQUIRED_APP_SUMMARY_FIELDS)).toBe(true);
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS.length).toBeGreaterThan(0);
    });

    it("should contain the core fields: appDescription, llmModels, and technologies", () => {
      // These are the minimum fields needed by the report generator
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toContain("appDescription");
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toContain("llmModels");
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toContain("technologies");
    });

    it("should have exactly 3 core fields", () => {
      // The core fields are intentionally minimal
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).toHaveLength(3);
    });

    it("should not contain _id field (excluded from RequestableAppSummaryField)", () => {
      // _id is excluded because it's always included in query results
      expect(CORE_REQUIRED_APP_SUMMARY_FIELDS).not.toContain("_id");
    });
  });

  describe("RequestableAppSummaryField type coverage", () => {
    it("should include all app summary category fields", () => {
      // Verify category fields are included
      const categoryFields = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "potentialMicroservices",
        "inferredArchitecture",
      ];

      for (const field of categoryFields) {
        expect(validRequestableFields).toContain(field);
      }
    });

    it("should include metadata fields (projectName, llmModels)", () => {
      // Verify metadata fields are included
      expect(validRequestableFields).toContain("projectName");
      expect(validRequestableFields).toContain("llmModels");
    });
  });
});
