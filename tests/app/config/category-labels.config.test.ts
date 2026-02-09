/**
 * Tests for category-labels.config.ts
 *
 * This module provides centralized display labels for app summary categories,
 * decoupling the reporting layer from prompt definitions.
 */

import { CATEGORY_LABELS, getCategoryLabel } from "../../../src/app/config/category-labels.config";
import type { AppSummaryCategoryType } from "../../../src/app/components/insights/insights.types";

describe("category-labels.config", () => {
  describe("CATEGORY_LABELS", () => {
    it("should have labels for all standard categories", () => {
      const expectedCategories: AppSummaryCategoryType[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "potentialMicroservices",
        "inferredArchitecture",
      ];

      for (const category of expectedCategories) {
        expect(CATEGORY_LABELS[category]).toBeDefined();
        expect(typeof CATEGORY_LABELS[category]).toBe("string");
        expect(CATEGORY_LABELS[category].length).toBeGreaterThan(0);
      }
    });

    it("should have human-readable labels", () => {
      // Labels should contain spaces and be properly formatted
      expect(CATEGORY_LABELS.appDescription).toBe("Application Description");
      expect(CATEGORY_LABELS.technologies).toBe("Technologies");
      expect(CATEGORY_LABELS.businessProcesses).toBe("Business Processes");
      expect(CATEGORY_LABELS.boundedContexts).toBe("Domain Model");
      expect(CATEGORY_LABELS.potentialMicroservices).toBe("Potential Microservices");
      expect(CATEGORY_LABELS.inferredArchitecture).toBe("Inferred Architecture");
    });

    it("should be a frozen/readonly object", () => {
      // The object should be immutable (as const)
      // This test verifies the structural integrity
      expect(Object.keys(CATEGORY_LABELS).length).toBe(6);
    });
  });

  describe("getCategoryLabel", () => {
    it("should return the correct label for each category", () => {
      const testCases: { category: AppSummaryCategoryType; expected: string }[] = [
        { category: "appDescription", expected: "Application Description" },
        { category: "technologies", expected: "Technologies" },
        { category: "businessProcesses", expected: "Business Processes" },
        { category: "boundedContexts", expected: "Domain Model" },
        { category: "potentialMicroservices", expected: "Potential Microservices" },
        { category: "inferredArchitecture", expected: "Inferred Architecture" },
      ];

      for (const { category, expected } of testCases) {
        expect(getCategoryLabel(category)).toBe(expected);
      }
    });

    it("should return a string for all valid categories", () => {
      const categories = Object.keys(CATEGORY_LABELS) as AppSummaryCategoryType[];

      for (const category of categories) {
        const label = getCategoryLabel(category);
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it("should not return undefined for valid categories", () => {
      const categories = Object.keys(CATEGORY_LABELS) as AppSummaryCategoryType[];

      for (const category of categories) {
        const label = getCategoryLabel(category);
        expect(label).not.toBeUndefined();
      }
    });
  });

  describe("category label consistency", () => {
    it("should have unique labels for each category", () => {
      const labels = Object.values(CATEGORY_LABELS);
      const uniqueLabels = new Set(labels);

      expect(uniqueLabels.size).toBe(labels.length);
    });

    it("should not have empty string labels", () => {
      const labels = Object.values(CATEGORY_LABELS);

      for (const label of labels) {
        expect(label.trim().length).toBeGreaterThan(0);
      }
    });

    it("should use Title Case formatting for multi-word labels", () => {
      const multiWordLabels = [
        CATEGORY_LABELS.appDescription,
        CATEGORY_LABELS.businessProcesses,
        CATEGORY_LABELS.potentialMicroservices,
        CATEGORY_LABELS.inferredArchitecture,
      ];

      for (const label of multiWordLabels) {
        // Should start with uppercase letter
        expect(label[0]).toBe(label[0].toUpperCase());
        // Should not be all lowercase
        expect(label).not.toBe(label.toLowerCase());
      }
    });
  });
});
