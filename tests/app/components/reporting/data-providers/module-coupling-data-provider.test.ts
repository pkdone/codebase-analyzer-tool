import "reflect-metadata";
import { ModuleCouplingDataProvider } from "../../../../../src/app/components/reporting/sections/architecture-analysis/module-coupling-data-provider";
import type { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import type { ProjectedSourceSummaryFields } from "../../../../../src/app/repositories/sources/sources.model";

/**
 * Helper to create mock source data with only the fields needed for testing.
 * Uses type assertion to avoid requiring all fields from the full type.
 */
function createMockSource(
  filepath: string,
  internalReferences?: string[],
): ProjectedSourceSummaryFields {
  return {
    filepath,
    summary: internalReferences ? { internalReferences } : undefined,
  } as ProjectedSourceSummaryFields;
}

describe("ModuleCouplingDataProvider", () => {
  let moduleCouplingDataProvider: ModuleCouplingDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockSourcesRepository = {
      getProjectSourcesSummariesByFileExtension: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    moduleCouplingDataProvider = new ModuleCouplingDataProvider(mockSourcesRepository);
  });

  describe("getModuleCoupling", () => {
    it("should return empty result for project with no source files", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue([]);

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project");

      expect(result.couplings).toEqual([]);
      expect(result.totalModules).toBe(0);
      expect(result.totalCouplings).toBe(0);
      expect(result.highestCouplingCount).toBe(0);
    });

    it("should return empty result for files without internal references", async () => {
      const sourcesWithoutRefs = [
        createMockSource("src/components/Button.tsx", []),
        createMockSource("src/utils/helpers.ts"),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithoutRefs,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project");

      expect(result.couplings).toEqual([]);
      expect(result.totalModules).toBe(0);
    });

    it("should correctly aggregate coupling between modules", async () => {
      const sourcesWithRefs = [
        createMockSource("src/components/Button.tsx", [
          "src/utils/helpers",
          "src/utils/formatters",
        ]),
        createMockSource("src/components/Modal.tsx", ["src/utils/helpers"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithRefs,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // src/components -> src/utils should have 3 references (2 from Button, 1 from Modal)
      expect(result.couplings.length).toBe(1);
      expect(result.couplings[0]).toEqual({
        fromModule: "src/components",
        toModule: "src/utils",
        referenceCount: 3,
        couplingLevel: "Very High",
        couplingLevelClass: "badge-danger",
      });
      expect(result.totalModules).toBe(2);
      expect(result.totalCouplings).toBe(1);
      expect(result.highestCouplingCount).toBe(3);
    });

    it("should skip self-references within the same module", async () => {
      const sourcesWithSelfRef = [
        createMockSource("src/components/Button.tsx", ["src/components/Icon"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithSelfRef,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      expect(result.couplings).toEqual([]);
      expect(result.totalModules).toBe(1); // Only src/components counted
    });

    it("should sort couplings by reference count descending", async () => {
      const sourcesWithMultipleCouplings = [
        createMockSource("src/a/file1.ts", ["src/b/file", "src/c/file", "src/c/file2"]),
        createMockSource("src/b/file1.ts", ["src/c/file"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithMultipleCouplings,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // Couplings should be sorted: src/a->src/c (2), src/a->src/b (1), src/b->src/c (1)
      expect(result.couplings[0].referenceCount).toBe(2);
      expect(result.couplings[0].fromModule).toBe("src/a");
      expect(result.couplings[0].toModule).toBe("src/c");
    });

    it("should handle namespace-style references with dots", async () => {
      const sourcesWithNamespaceRefs = [
        createMockSource("src/services/UserService.ts", [
          "com.example.util.Helper",
          "com.example.util.Formatter",
        ]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithNamespaceRefs,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // Should extract module from namespace: com.example
      const coupling = result.couplings.find((c) => c.toModule === "com.example");
      expect(coupling).toBeDefined();
      expect(coupling?.referenceCount).toBe(2);
    });

    it("should normalize backslashes to forward slashes", async () => {
      const sourcesWithBackslashes = [
        createMockSource("src\\components\\Button.tsx", ["src\\utils\\helpers"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithBackslashes,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      expect(result.couplings[0].fromModule).toBe("src/components");
      expect(result.couplings[0].toModule).toBe("src/utils");
    });

    it("should use default module depth when not specified", async () => {
      const sources = [
        createMockSource("src/app/components/Button.tsx", ["src/app/utils/helpers"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(sources);

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project");

      // Default depth is 2, so modules should be src/app
      expect(result.moduleDepth).toBeDefined();
    });

    it("should return immutable sorted array (toSorted behavior)", async () => {
      const sources = [
        createMockSource("src/a/file.ts", ["src/b/file"]),
        createMockSource("src/c/file.ts", ["src/b/file", "src/b/file2"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(sources);

      const result1 = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);
      const result2 = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // Both calls should return consistently sorted results
      expect(result1.couplings).toEqual(result2.couplings);
      // Higher count should come first
      expect(result1.couplings[0].referenceCount).toBeGreaterThanOrEqual(
        result1.couplings[1]?.referenceCount ?? 0,
      );
    });

    it("should resolve relative imports using parent directory reference", async () => {
      const sourcesWithRelativeRefs = [
        createMockSource("src/components/Button.tsx", ["../utils/helpers"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithRelativeRefs,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // ../utils/helpers from src/components should resolve to src/utils
      expect(result.couplings.length).toBe(1);
      expect(result.couplings[0].fromModule).toBe("src/components");
      expect(result.couplings[0].toModule).toBe("src/utils");
    });

    it("should resolve current directory relative imports as self-reference", async () => {
      const sourcesWithCurrentDirRefs = [
        createMockSource("src/services/user/UserService.ts", ["./UserHelper"]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithCurrentDirRefs,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // ./UserHelper from src/services/user should resolve to src/services (same module)
      // This is a self-reference, so it should be skipped
      expect(result.couplings.length).toBe(0);
    });

    it("should resolve deeply nested relative imports correctly", async () => {
      const sourcesWithDeepRelativeRefs = [
        createMockSource("src/features/auth/login/LoginForm.tsx", [
          "../../../shared/components/Button",
        ]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithDeepRelativeRefs,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // ../../../shared/components from src/features/auth/login should resolve to src/shared
      expect(result.couplings.length).toBe(1);
      expect(result.couplings[0].fromModule).toBe("src/features");
      expect(result.couplings[0].toModule).toBe("src/shared");
    });

    it("should handle mixed relative and absolute references", async () => {
      const sourcesWithMixedRefs = [
        createMockSource("src/components/Form.tsx", [
          "../utils/validation", // relative
          "src/services/api", // absolute
        ]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithMixedRefs,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      expect(result.couplings.length).toBe(2);
      const toModules = result.couplings.map((c) => c.toModule).sort();
      expect(toModules).toEqual(["src/services", "src/utils"]);
    });

    it("should resolve relative imports with multiple parent traversals", async () => {
      const sourcesWithMultipleParents = [
        createMockSource("app/modules/auth/components/LoginButton.tsx", [
          "../../../shared/utils/format", // Goes up to app/, then into shared/
        ]),
      ];
      mockSourcesRepository.getProjectSourcesSummariesByFileExtension.mockResolvedValue(
        sourcesWithMultipleParents,
      );

      const result = await moduleCouplingDataProvider.getModuleCoupling("test-project", 2);

      // ../../../shared/utils from app/modules/auth/components should resolve to app/shared
      expect(result.couplings.length).toBe(1);
      expect(result.couplings[0].fromModule).toBe("app/modules");
      expect(result.couplings[0].toModule).toBe("app/shared");
    });
  });
});
