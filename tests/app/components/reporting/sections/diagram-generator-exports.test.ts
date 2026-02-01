/**
 * Tests for diagram generator exports from their respective section modules.
 * Validates that domain-specific diagram generators are correctly co-located with their sections.
 */
import "reflect-metadata";
import * as DomainModelModule from "../../../../../src/app/components/reporting/sections/domain-model";
import * as InferredArchModule from "../../../../../src/app/components/reporting/sections/inferred-architecture";
import * as FutureArchModule from "../../../../../src/app/components/reporting/sections/future-architecture";

describe("diagram generator section exports", () => {
  describe("domain-model section", () => {
    it("should export DomainModelSection", () => {
      expect(DomainModelModule.DomainModelSection).toBeDefined();
      expect(typeof DomainModelModule.DomainModelSection).toBe("function");
    });

    it("should export DomainModelDiagramGenerator", () => {
      expect(DomainModelModule.DomainModelDiagramGenerator).toBeDefined();
      expect(typeof DomainModelModule.DomainModelDiagramGenerator).toBe("function");
    });

    it("should export DomainModelTransformer", () => {
      expect(DomainModelModule.DomainModelTransformer).toBeDefined();
      expect(typeof DomainModelModule.DomainModelTransformer).toBe("function");
    });
  });

  describe("inferred-architecture section", () => {
    it("should export InferredArchitectureSection", () => {
      expect(InferredArchModule.InferredArchitectureSection).toBeDefined();
      expect(typeof InferredArchModule.InferredArchitectureSection).toBe("function");
    });

    it("should export CurrentArchitectureDiagramGenerator", () => {
      expect(InferredArchModule.CurrentArchitectureDiagramGenerator).toBeDefined();
      expect(typeof InferredArchModule.CurrentArchitectureDiagramGenerator).toBe("function");
    });

    it("should export extractInferredArchitectureData", () => {
      expect(InferredArchModule.extractInferredArchitectureData).toBeDefined();
      expect(typeof InferredArchModule.extractInferredArchitectureData).toBe("function");
    });
  });

  describe("future-architecture section", () => {
    it("should export PotentialMicroservicesSection", () => {
      expect(FutureArchModule.PotentialMicroservicesSection).toBeDefined();
      expect(typeof FutureArchModule.PotentialMicroservicesSection).toBe("function");
    });

    it("should export ArchitectureDiagramGenerator", () => {
      expect(FutureArchModule.ArchitectureDiagramGenerator).toBeDefined();
      expect(typeof FutureArchModule.ArchitectureDiagramGenerator).toBe("function");
    });

    it("should export extractMicroservicesData", () => {
      expect(FutureArchModule.extractMicroservicesData).toBeDefined();
      expect(typeof FutureArchModule.extractMicroservicesData).toBe("function");
    });
  });

  describe("diagram generator instantiation", () => {
    it("should be able to instantiate DomainModelDiagramGenerator", () => {
      const generator = new DomainModelModule.DomainModelDiagramGenerator();
      expect(generator).toBeDefined();
      expect(typeof generator.generateContextDiagram).toBe("function");
      expect(typeof generator.generateMultipleContextDiagrams).toBe("function");
    });

    it("should be able to instantiate CurrentArchitectureDiagramGenerator", () => {
      const generator = new InferredArchModule.CurrentArchitectureDiagramGenerator();
      expect(generator).toBeDefined();
      expect(typeof generator.generateCurrentArchitectureDiagram).toBe("function");
    });

    it("should be able to instantiate ArchitectureDiagramGenerator", () => {
      const generator = new FutureArchModule.ArchitectureDiagramGenerator();
      expect(generator).toBeDefined();
      expect(typeof generator.generateArchitectureDiagram).toBe("function");
    });
  });
});
