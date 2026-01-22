import "reflect-metadata";
import * as visualizationsExports from "../../../../../src/app/components/reporting/sections/visualizations";
import * as overviewExports from "../../../../../src/app/components/reporting/sections/overview";
import * as dataProcessingExports from "../../../../../src/app/components/reporting/data-processing";

/**
 * Tests to verify barrel exports are correct and prevent regression.
 *
 * These tests ensure that:
 * 1. Section barrel files export only their own components (no re-exports from data-processing)
 * 2. Data-processing module is the canonical location for data extraction utilities
 */
describe("barrel exports", () => {
  describe("visualizations/index.ts", () => {
    it("should export section classes", () => {
      expect(visualizationsExports.DomainModelSection).toBeDefined();
      expect(visualizationsExports.MicroservicesArchitectureSection).toBeDefined();
      expect(visualizationsExports.CurrentArchitectureSection).toBeDefined();
    });

    it("should export DomainModelDataProvider", () => {
      expect(visualizationsExports.DomainModelDataProvider).toBeDefined();
    });

    it("should NOT re-export data extractors from data-processing module", () => {
      // These should be imported from data-processing, not visualizations
      const exports = Object.keys(visualizationsExports);
      expect(exports).not.toContain("extractMicroservicesData");
      expect(exports).not.toContain("extractInferredArchitectureData");
      expect(exports).not.toContain("extractKeyBusinessActivities");
      expect(exports).not.toContain("extractMicroserviceFields");
      expect(exports).not.toContain("isInferredArchitectureCategoryData");
    });

    it("should export domain model types", () => {
      // Type exports won't show up in Object.keys at runtime, but we can verify
      // the barrel file structure by checking that the expected exports exist
      const exports = Object.keys(visualizationsExports);
      expect(exports).toContain("DomainModelSection");
      expect(exports).toContain("MicroservicesArchitectureSection");
      expect(exports).toContain("CurrentArchitectureSection");
      expect(exports).toContain("DomainModelDataProvider");
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

  describe("data-processing/index.ts (canonical location)", () => {
    it("should export CategorizedSectionDataBuilder", () => {
      expect(dataProcessingExports.CategorizedSectionDataBuilder).toBeDefined();
    });

    it("should export type guards", () => {
      expect(dataProcessingExports.isCategorizedDataNameDescArray).toBeDefined();
      expect(typeof dataProcessingExports.isCategorizedDataNameDescArray).toBe("function");

      expect(dataProcessingExports.isCategorizedDataInferredArchitecture).toBeDefined();
      expect(typeof dataProcessingExports.isCategorizedDataInferredArchitecture).toBe("function");
    });

    it("should export visualization data extractors", () => {
      expect(dataProcessingExports.extractKeyBusinessActivities).toBeDefined();
      expect(typeof dataProcessingExports.extractKeyBusinessActivities).toBe("function");

      expect(dataProcessingExports.extractMicroserviceFields).toBeDefined();
      expect(typeof dataProcessingExports.extractMicroserviceFields).toBe("function");

      expect(dataProcessingExports.extractMicroservicesData).toBeDefined();
      expect(typeof dataProcessingExports.extractMicroservicesData).toBe("function");

      expect(dataProcessingExports.extractInferredArchitectureData).toBeDefined();
      expect(typeof dataProcessingExports.extractInferredArchitectureData).toBe("function");

      expect(dataProcessingExports.isInferredArchitectureCategoryData).toBeDefined();
      expect(typeof dataProcessingExports.isInferredArchitectureCategoryData).toBe("function");
    });
  });
});
