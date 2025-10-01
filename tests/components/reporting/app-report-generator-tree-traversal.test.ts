import "reflect-metadata";
import AppReportGenerator from "../../../src/components/reporting/app-report-generator";
import type { HierarchicalJavaClassDependency } from "../../../src/repositories/source/sources.model";
import type { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";
import type { AppSummariesRepository } from "../../../src/repositories/app-summary/app-summaries.repository.interface";

describe("AppReportGenerator - iterative tree traversal", () => {
  let generator: AppReportGenerator;

  beforeEach(() => {
    // Create minimal mocks for dependencies
    const mockSourcesRepo = {} as SourcesRepository;
    const mockAppSummariesRepo = {} as AppSummariesRepository;
    const mockHtmlWriter = {} as any;
    const mockJsonWriter = {} as any;
    const mockDbDataProvider = {} as any;
    const mockCodeStructureProvider = {} as any;
    const mockAppStatsProvider = {} as any;
    const mockCategoriesProvider = {} as any;
    const mockPngGenerator = {} as any;
    const mockPieChartGenerator = {} as any;

    generator = new AppReportGenerator(
      mockSourcesRepo,
      mockAppSummariesRepo,
      mockHtmlWriter,
      mockJsonWriter,
      mockDbDataProvider,
      mockCodeStructureProvider,
      mockAppStatsProvider,
      mockCategoriesProvider,
      mockPngGenerator,
      mockPieChartGenerator,
    );
  });

  // Helper to access private method for testing
  const countDeps = (dependencies: readonly HierarchicalJavaClassDependency[]): number => {
    return (generator as any).countUniqueDependencies(dependencies);
  };

  describe("countUniqueDependencies - iterative approach", () => {
    test("should count dependencies in flat structure", () => {
      const deps: HierarchicalJavaClassDependency[] = [
        { classpath: "com.example.A", dependencies: [] },
        { classpath: "com.example.B", dependencies: [] },
        { classpath: "com.example.C", dependencies: [] },
      ];

      expect(countDeps(deps)).toBe(3);
    });

    test("should count dependencies in nested structure", () => {
      const deps: HierarchicalJavaClassDependency[] = [
        {
          classpath: "com.example.A",
          dependencies: [
            { classpath: "com.example.B", dependencies: [] },
            { classpath: "com.example.C", dependencies: [] },
          ],
        },
      ];

      expect(countDeps(deps)).toBe(3);
    });

    test("should handle deeply nested dependencies without stack overflow", () => {
      // Create a very deep dependency tree (1000 levels)
      let current: HierarchicalJavaClassDependency = {
        classpath: "com.example.Deep999",
        dependencies: [],
      };

      for (let i = 998; i >= 0; i--) {
        current = {
          classpath: `com.example.Deep${i}`,
          dependencies: [current],
        };
      }

      // This should not cause stack overflow with iterative approach
      expect(countDeps([current])).toBe(1000);
    });

    test("should deduplicate repeated classpaths", () => {
      const deps: HierarchicalJavaClassDependency[] = [
        {
          classpath: "com.example.A",
          dependencies: [{ classpath: "com.example.B", dependencies: [] }],
        },
        {
          classpath: "com.example.C",
          dependencies: [
            { classpath: "com.example.B", dependencies: [] }, // Duplicate
          ],
        },
      ];

      // Should count B only once
      expect(countDeps(deps)).toBe(3);
    });

    test("should handle empty dependencies array", () => {
      expect(countDeps([])).toBe(0);
    });

    test("should handle complex multi-level tree", () => {
      const deps: HierarchicalJavaClassDependency[] = [
        {
          classpath: "com.example.Root1",
          dependencies: [
            {
              classpath: "com.example.Child1",
              dependencies: [
                { classpath: "com.example.GrandChild1", dependencies: [] },
                { classpath: "com.example.GrandChild2", dependencies: [] },
              ],
            },
            { classpath: "com.example.Child2", dependencies: [] },
          ],
        },
        {
          classpath: "com.example.Root2",
          dependencies: [{ classpath: "com.example.Child3", dependencies: [] }],
        },
      ];

      // Root1, Child1, GrandChild1, GrandChild2, Child2, Root2, Child3 = 7
      expect(countDeps(deps)).toBe(7);
    });

    test("should handle wide tree with many siblings", () => {
      const siblings: HierarchicalJavaClassDependency[] = [];
      for (let i = 0; i < 100; i++) {
        siblings.push({ classpath: `com.example.Sibling${i}`, dependencies: [] });
      }

      const deps: HierarchicalJavaClassDependency[] = [
        { classpath: "com.example.Root", dependencies: siblings },
      ];

      // 1 root + 100 siblings = 101
      expect(countDeps(deps)).toBe(101);
    });

    test("should handle tree with duplicate classpaths at different levels", () => {
      const shared: HierarchicalJavaClassDependency = {
        classpath: "com.example.Shared",
        dependencies: [],
      };

      const deps: HierarchicalJavaClassDependency[] = [
        {
          classpath: "com.example.A",
          dependencies: [
            {
              classpath: "com.example.B",
              dependencies: [shared],
            },
          ],
        },
        {
          classpath: "com.example.C",
          dependencies: [
            {
              classpath: "com.example.D",
              dependencies: [shared], // Same reference/classpath
            },
          ],
        },
      ];

      // A, B, C, D, Shared (counted once) = 5
      expect(countDeps(deps)).toBe(5);
    });

    test("should handle tree with circular-like structure via duplication", () => {
      // While not true circular references (which would cause infinite loops),
      // this tests that we handle the same classpath appearing multiple times
      const deps: HierarchicalJavaClassDependency[] = [
        {
          classpath: "com.example.A",
          dependencies: [
            {
              classpath: "com.example.B",
              dependencies: [{ classpath: "com.example.A", dependencies: [] }],
            },
          ],
        },
      ];

      // A and B = 2 (A is deduplicated)
      expect(countDeps(deps)).toBe(2);
    });
  });
});
