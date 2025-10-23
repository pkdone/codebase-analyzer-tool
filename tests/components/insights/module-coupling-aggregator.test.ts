import "reflect-metadata";
import { ModuleCouplingAggregator } from "../../../src/components/insights/data-aggregators/module-coupling-aggregator";
import { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";

describe("ModuleCouplingAggregator", () => {
  let aggregator: ModuleCouplingAggregator;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSourcesRepository = {
      getProjectSourcesSummaries: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    aggregator = new ModuleCouplingAggregator(mockSourcesRepository);
  });

  describe("aggregateModuleCoupling", () => {
    it("should aggregate module coupling from source files with internal references", async () => {
      const mockSourceFiles = [
        {
          filepath: "src/components/user-service.ts",
          summary: {
            internalReferences: ["src.utils.validator", "src.models.User"],
          },
        },
        {
          filepath: "src/components/auth-service.ts",
          summary: {
            internalReferences: ["src.utils.validator", "src.models.User"],
          },
        },
        {
          filepath: "src/utils/validator.ts",
          summary: {
            internalReferences: [],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);

      expect(result.totalModules).toBe(3); // src/components, src/utils, src/models
      expect(result.totalCouplings).toBe(2); // src/components -> src/utils, src/components -> src/models
      expect(result.moduleDepth).toBe(2);
      expect(result.couplings).toHaveLength(2);

      // Verify couplings are sorted by reference count (descending)
      expect(result.couplings[0].referenceCount).toBeGreaterThanOrEqual(
        result.couplings[1].referenceCount,
      );
    });

    it("should handle source files with no internal references", async () => {
      const mockSourceFiles = [
        {
          filepath: "src/components/user-service.ts",
          summary: {},
        },
        {
          filepath: "src/utils/validator.ts",
          summary: {
            internalReferences: [],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project");

      expect(result.totalModules).toBe(0);
      expect(result.totalCouplings).toBe(0);
      expect(result.couplings).toHaveLength(0);
      expect(result.highestCouplingCount).toBe(0);
    });

    it("should handle empty project", async () => {
      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue([]);

      const result = await aggregator.aggregateModuleCoupling("test-project");

      expect(result.totalModules).toBe(0);
      expect(result.totalCouplings).toBe(0);
      expect(result.couplings).toHaveLength(0);
    });

    it("should skip self-references", async () => {
      const mockSourceFiles = [
        {
          filepath: "src/components/user-service.ts",
          summary: {
            // Reference to same module should be ignored
            internalReferences: ["src/components/helper.ts"],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);

      // Should have 1 module but 0 couplings (self-reference excluded)
      expect(result.totalModules).toBe(1);
      expect(result.totalCouplings).toBe(0);
      expect(result.couplings).toHaveLength(0);
    });

    it("should count multiple references between same modules", async () => {
      const mockSourceFiles = [
        {
          filepath: "src/services/user-service.ts",
          summary: {
            internalReferences: ["src.models.User", "src.models.Role", "src.models.Permission"],
          },
        },
        {
          filepath: "src/services/auth-service.ts",
          summary: {
            internalReferences: ["src.models.User", "src.models.Session"],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);

      // Find the coupling from src/services to src.models (dot-notation namespace)
      const coupling = result.couplings.find(
        (c) => c.fromModule === "src/services" && c.toModule === "src.models",
      );

      expect(coupling).toBeDefined();
      // Should count all 5 references (3 from user-service + 2 from auth-service)
      expect(coupling?.referenceCount).toBe(5);
      expect(result.highestCouplingCount).toBe(5);
    });

    it("should respect custom module depth", async () => {
      const mockSourceFiles = [
        {
          filepath: "app/modules/user/services/user-service.ts",
          summary: {
            internalReferences: ["app/modules/common/utils/validator"],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      // With depth 3, modules should be app/modules/user and app/modules/common
      const result = await aggregator.aggregateModuleCoupling("test-project", 3);

      expect(result.moduleDepth).toBe(3);
      expect(result.totalModules).toBe(2);

      const coupling = result.couplings[0];
      expect(coupling.fromModule).toBe("app/modules/user");
      expect(coupling.toModule).toBe("app/modules/common");
    });

    it("should handle files with insufficient path depth", async () => {
      const mockSourceFiles = [
        {
          filepath: "main.ts",
          summary: {
            internalReferences: ["utils"],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);

      // Files with insufficient depth should be skipped
      expect(result.totalModules).toBe(0);
      expect(result.totalCouplings).toBe(0);
    });

    it("should sort couplings by reference count descending, then by module names", async () => {
      const mockSourceFiles = [
        {
          filepath: "src/services/a.ts",
          summary: {
            internalReferences: ["src.models.X"], // 1 reference
          },
        },
        {
          filepath: "src/services/b.ts",
          summary: {
            internalReferences: ["src.models.Y", "src.models.Y", "src.models.Y"], // 3 references to Y (all to same module)
          },
        },
        {
          filepath: "src/services/c.ts",
          summary: {
            internalReferences: ["src.utils.Z", "src.utils.Z"], // 2 references
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);

      // All references from src/services to src.models are aggregated together (1+3=4)
      // References to src.utils are aggregated (2)
      // Total: 2 couplings
      expect(result.couplings).toHaveLength(2);
      // Should be sorted by reference count descending
      expect(result.couplings[0].referenceCount).toBe(4); // src.models (1+3)
      expect(result.couplings[1].referenceCount).toBe(2); // src.utils
    });

    it("should handle Java-style namespace references with dots", async () => {
      const mockSourceFiles = [
        {
          filepath: "com/example/services/UserService.java",
          summary: {
            internalReferences: [
              "com.example.models.User",
              "com.example.utils.Validator",
              "com.example.models.Role",
            ],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 3);

      // With depth 3:
      // - filepath "com/example/services/UserService.java" -> module "com/example/services"
      // - references "com.example.models.*" -> module "com.example.models"
      // - reference "com.example.utils.*" -> module "com.example.utils"
      expect(result.totalModules).toBe(3); // com/example/services, com.example.models, com.example.utils
      expect(result.totalCouplings).toBe(2); // services -> models (2 refs), services -> utils (1 ref)

      // Find coupling to models (should have 2 references: User and Role)
      const modelsCouple = result.couplings.find((c) => c.toModule === "com.example.models");
      expect(modelsCouple).toBeDefined();
      expect(modelsCouple?.referenceCount).toBe(2);
    });
  });

  describe("module name extraction", () => {
    it("should extract module name from path-based references", async () => {
      const mockSourceFiles = [
        {
          filepath: "app/services/user.ts",
          summary: {
            internalReferences: ["app/models/user-model.ts", "app/utils/validator.ts"],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);
      expect(result.totalModules).toBe(3);
      // Should have couplings from app/services to both app/models and app/utils
      expect(result.totalCouplings).toBe(2);
    });

    it("should handle Windows-style path separators", async () => {
      const mockSourceFiles = [
        {
          filepath: "src\\components\\user-service.ts",
          summary: {
            internalReferences: ["src\\models\\User"],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);

      // Should normalize and create coupling
      expect(result.totalCouplings).toBeGreaterThan(0);
    });

    it("should ignore references without sufficient module information", async () => {
      const mockSourceFiles = [
        {
          filepath: "src/services/user.ts",
          summary: {
            // Simple class name without path or namespace
            internalReferences: ["UserModel"],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregateModuleCoupling("test-project", 2);

      // Should have 1 module (src/services) but 0 couplings (can't determine module for "UserModel")
      expect(result.totalModules).toBe(1);
      expect(result.totalCouplings).toBe(0);
    });
  });
});
