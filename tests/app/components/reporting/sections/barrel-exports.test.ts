import "reflect-metadata";
import * as visualizationsExports from "../../../../../src/app/components/reporting/sections/visualizations";
import * as overviewExports from "../../../../../src/app/components/reporting/sections/overview";
import * as dataProcessingExports from "../../../../../src/app/components/reporting/data-processing";

/**
 * Tests to verify barrel exports are correct and prevent regression.
 *
 * These tests ensure that:
 * 1. Section barrel files export appropriate components and utilities
 * 2. Data-processing module exports general-purpose utilities
 * 3. Section-specific extractors are co-located with their consuming sections
 */
describe("barrel exports", () => {
  describe("visualizations/index.ts", () => {
    it("should export section classes", () => {
      expect(visualizationsExports.DomainModelSection).toBeDefined();
      expect(visualizationsExports.MicroservicesArchitectureSection).toBeDefined();
      expect(visualizationsExports.CurrentArchitectureSection).toBeDefined();
    });

    it("should export DomainModelTransformer", () => {
      expect(visualizationsExports.DomainModelTransformer).toBeDefined();
    });

    it("should export co-located data extractors for this section", () => {
      // These are now co-located with the visualizations section
      expect(visualizationsExports.extractMicroservicesData).toBeDefined();
      expect(typeof visualizationsExports.extractMicroservicesData).toBe("function");

      expect(visualizationsExports.extractInferredArchitectureData).toBeDefined();
      expect(typeof visualizationsExports.extractInferredArchitectureData).toBe("function");

      expect(visualizationsExports.isInferredArchitectureCategoryData).toBeDefined();
      expect(typeof visualizationsExports.isInferredArchitectureCategoryData).toBe("function");
    });

    it("should NOT export general-purpose extractors that stay in data-processing", () => {
      // These remain in data-processing as they are general-purpose
      const exports = Object.keys(visualizationsExports);
      expect(exports).not.toContain("extractKeyBusinessActivities");
      expect(exports).not.toContain("extractMicroserviceFields");
    });

    it("should export domain model types", () => {
      // Type exports won't show up in Object.keys at runtime, but we can verify
      // the barrel file structure by checking that the expected exports exist
      const exports = Object.keys(visualizationsExports);
      expect(exports).toContain("DomainModelSection");
      expect(exports).toContain("MicroservicesArchitectureSection");
      expect(exports).toContain("CurrentArchitectureSection");
      expect(exports).toContain("DomainModelTransformer");
    });
  });

  describe("overview/index.ts", () => {
    it("should export AppStatisticsDataProvider", () => {
      expect(overviewExports.AppStatisticsDataProvider).toBeDefined();
    });

    it("should NOT re-export data processing utilities from data-processing module", () => {
      // These should be imported from data-processing, not overview
      const exports = Object.keys(overviewExports);
      expect(exports).not.toContain("CategorizedSectionDataBuilder");
      expect(exports).not.toContain("isCategorizedDataNameDescArray");
      expect(exports).not.toContain("isCategorizedDataInferredArchitecture");
    });

    it("should have minimal exports (only data provider)", () => {
      const exports = Object.keys(overviewExports);
      expect(exports).toEqual(["AppStatisticsDataProvider"]);
    });
  });

  describe("data-processing/index.ts (general-purpose utilities)", () => {
    it("should export CategorizedSectionDataBuilder", () => {
      expect(dataProcessingExports.CategorizedSectionDataBuilder).toBeDefined();
    });

    it("should export type guards", () => {
      expect(dataProcessingExports.isCategorizedDataNameDescArray).toBeDefined();
      expect(typeof dataProcessingExports.isCategorizedDataNameDescArray).toBe("function");

      expect(dataProcessingExports.isCategorizedDataInferredArchitecture).toBeDefined();
      expect(typeof dataProcessingExports.isCategorizedDataInferredArchitecture).toBe("function");
    });

    it("should export general-purpose visualization data extractors", () => {
      // These general-purpose extractors remain in data-processing
      expect(dataProcessingExports.extractKeyBusinessActivities).toBeDefined();
      expect(typeof dataProcessingExports.extractKeyBusinessActivities).toBe("function");

      expect(dataProcessingExports.extractMicroserviceFields).toBeDefined();
      expect(typeof dataProcessingExports.extractMicroserviceFields).toBe("function");
    });

    it("should NOT export section-specific extractors (moved to visualizations)", () => {
      // These have been moved to visualizations section
      const exports = Object.keys(dataProcessingExports);
      expect(exports).not.toContain("extractMicroservicesData");
      expect(exports).not.toContain("extractInferredArchitectureData");
      expect(exports).not.toContain("isInferredArchitectureCategoryData");
    });
  });
});
