import "reflect-metadata";
import * as domainModelExports from "../../../../../src/app/components/reporting/sections/domain-model";
import * as inferredArchitectureExports from "../../../../../src/app/components/reporting/sections/inferred-architecture";
import * as futureArchitectureExports from "../../../../../src/app/components/reporting/sections/future-architecture";
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
  describe("domain-model/index.ts", () => {
    it("should export DomainModelSection", () => {
      expect(domainModelExports.DomainModelSection).toBeDefined();
    });

    it("should export DomainModelTransformer", () => {
      expect(domainModelExports.DomainModelTransformer).toBeDefined();
    });

    it("should export domain model types via the module", () => {
      const exports = Object.keys(domainModelExports);
      expect(exports).toContain("DomainModelSection");
      expect(exports).toContain("DomainModelTransformer");
    });
  });

  describe("inferred-architecture/index.ts", () => {
    it("should export InferredArchitectureSection", () => {
      expect(inferredArchitectureExports.InferredArchitectureSection).toBeDefined();
    });

    it("should export extractInferredArchitectureData", () => {
      expect(inferredArchitectureExports.extractInferredArchitectureData).toBeDefined();
      expect(typeof inferredArchitectureExports.extractInferredArchitectureData).toBe("function");
    });
  });

  describe("future-architecture/index.ts", () => {
    it("should export PotentialMicroservicesSection", () => {
      expect(futureArchitectureExports.PotentialMicroservicesSection).toBeDefined();
    });

    it("should export extractMicroservicesData", () => {
      expect(futureArchitectureExports.extractMicroservicesData).toBeDefined();
      expect(typeof futureArchitectureExports.extractMicroservicesData).toBe("function");
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
    });

    it("should NOT export section-specific extractors (moved to specific sections)", () => {
      // These have been moved to their respective section modules
      const exports = Object.keys(dataProcessingExports);
      expect(exports).not.toContain("extractMicroservicesData");
      expect(exports).not.toContain("extractInferredArchitectureData");
    });
  });
});
