import { convertToHierarchical } from "../../../../src/components/reporting/utils/dependency-tree-builder";
import type {
  ProjectedTopLevelJavaClassDependencies,
  JavaClassDependency,
} from "../../../../src/repositories/sources/sources.model";

describe("dependency-tree-builder", () => {
  describe("convertToHierarchical", () => {
    it("should return empty dependencies when root has no references", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: [],
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should return empty dependencies when no root node exists", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 1, // No level 0 node
            namespace: "com.example.ChildA",
            references: [],
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(0);
    });

    it("should handle a simple linear dependency chain", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: ["com.example.ChildA"],
          },
          {
            level: 1,
            namespace: "com.example.ChildA",
            references: ["com.example.ChildB"],
          },
          {
            level: 2,
            namespace: "com.example.ChildB",
            references: [],
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(1);

      const childA = result.dependencies[0];
      expect(childA.namespace).toBe("com.example.ChildA");
      expect(childA.originalLevel).toBe(1);
      expect(childA.dependencies).toHaveLength(1);

      const childB = childA.dependencies![0];
      expect(childB.namespace).toBe("com.example.ChildB");
      expect(childB.originalLevel).toBe(2);
      expect(childB.dependencies).toBeUndefined();
    });

    it("should handle multiple direct dependencies from root", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: ["com.example.ChildA", "com.example.ChildB", "com.example.ChildC"],
          },
          {
            level: 1,
            namespace: "com.example.ChildA",
            references: [],
          },
          {
            level: 1,
            namespace: "com.example.ChildB",
            references: [],
          },
          {
            level: 1,
            namespace: "com.example.ChildC",
            references: [],
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(3);

      const namespaces = result.dependencies.map((d) => d.namespace);
      expect(namespaces).toContain("com.example.ChildA");
      expect(namespaces).toContain("com.example.ChildB");
      expect(namespaces).toContain("com.example.ChildC");
    });

    it("should handle diamond dependency pattern correctly", () => {
      // Root -> A, B
      // A -> C
      // B -> C (shared dependency)
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: ["com.example.A", "com.example.B"],
          },
          {
            level: 1,
            namespace: "com.example.A",
            references: ["com.example.C"],
          },
          {
            level: 1,
            namespace: "com.example.B",
            references: ["com.example.C"],
          },
          {
            level: 2,
            namespace: "com.example.C",
            references: [],
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(2);

      // Both A and B should have C as a child
      const nodeA = result.dependencies.find((d) => d.namespace === "com.example.A");
      const nodeB = result.dependencies.find((d) => d.namespace === "com.example.B");

      expect(nodeA).toBeDefined();
      expect(nodeB).toBeDefined();
      expect(nodeA!.dependencies).toHaveLength(1);
      expect(nodeB!.dependencies).toHaveLength(1);
      expect(nodeA!.dependencies![0].namespace).toBe("com.example.C");
      expect(nodeB!.dependencies![0].namespace).toBe("com.example.C");
    });

    it("should handle deep dependency trees", () => {
      const depth = 10;
      const dependencies: JavaClassDependency[] = [];

      // Create a chain: Root -> L1 -> L2 -> ... -> L{depth}
      for (let i = 0; i <= depth; i++) {
        const namespace = i === 0 ? "com.example.Root" : `com.example.L${i}`;
        const references = i < depth ? [`com.example.L${i + 1}`] : [];
        dependencies.push({
          level: i,
          namespace,
          references,
        });
      }

      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies,
      };

      const result = convertToHierarchical(flatData);

      // Traverse the tree and verify depth - count nodes in the chain
      let actualDepth = 0;
      const countDepth = (
        deps: readonly import("../../../../src/repositories/sources/sources.model").HierarchicalJavaClassDependency[],
      ): void => {
        if (deps.length === 0) return;
        actualDepth++;
        const firstDep = deps[0];
        if (firstDep.dependencies) {
          countDepth(firstDep.dependencies);
        }
      };
      countDepth(result.dependencies);

      expect(actualDepth).toBe(depth);
    });

    it("should skip references that would create cycles to root", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: ["com.example.ChildA"],
          },
          {
            level: 1,
            namespace: "com.example.ChildA",
            references: ["com.example.Root"], // Reference back to root - should be skipped
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(1);

      const childA = result.dependencies[0];
      expect(childA.namespace).toBe("com.example.ChildA");
      // Should not have dependencies because the only reference is a cycle
      expect(childA.dependencies).toBeUndefined();
    });

    it("should handle references to unknown namespaces gracefully", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: ["com.example.Known", "com.example.Unknown"],
          },
          {
            level: 1,
            namespace: "com.example.Known",
            references: [],
          },
          // com.example.Unknown is not in the dependency map
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(2);

      const known = result.dependencies.find((d) => d.namespace === "com.example.Known");
      const unknown = result.dependencies.find((d) => d.namespace === "com.example.Unknown");

      expect(known).toBeDefined();
      expect(unknown).toBeDefined();
      // Unknown should exist but with no originalLevel since it's not in the map
      expect(unknown!.originalLevel).toBeUndefined();
    });

    it("should preserve originalLevel from flat dependency data", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: ["com.example.ChildA"],
          },
          {
            level: 5, // Non-sequential level
            namespace: "com.example.ChildA",
            references: [],
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.dependencies[0].originalLevel).toBe(5);
    });

    it("should handle complex tree with multiple branches and levels", () => {
      const flatData: ProjectedTopLevelJavaClassDependencies = {
        namespace: "com.example.Root",
        dependencies: [
          {
            level: 0,
            namespace: "com.example.Root",
            references: ["com.example.Service", "com.example.Repository"],
          },
          {
            level: 1,
            namespace: "com.example.Service",
            references: ["com.example.Utils", "com.example.Model"],
          },
          {
            level: 1,
            namespace: "com.example.Repository",
            references: ["com.example.Model", "com.example.Database"],
          },
          {
            level: 2,
            namespace: "com.example.Utils",
            references: [],
          },
          {
            level: 2,
            namespace: "com.example.Model",
            references: [],
          },
          {
            level: 2,
            namespace: "com.example.Database",
            references: [],
          },
        ],
      };

      const result = convertToHierarchical(flatData);

      expect(result.namespace).toBe("com.example.Root");
      expect(result.dependencies).toHaveLength(2);

      const service = result.dependencies.find((d) => d.namespace === "com.example.Service");
      const repo = result.dependencies.find((d) => d.namespace === "com.example.Repository");

      expect(service).toBeDefined();
      expect(repo).toBeDefined();

      expect(service!.dependencies).toHaveLength(2);
      expect(repo!.dependencies).toHaveLength(2);

      const serviceChildren = service!.dependencies!.map((d) => d.namespace);
      expect(serviceChildren).toContain("com.example.Utils");
      expect(serviceChildren).toContain("com.example.Model");

      const repoChildren = repo!.dependencies!.map((d) => d.namespace);
      expect(repoChildren).toContain("com.example.Model");
      expect(repoChildren).toContain("com.example.Database");
    });
  });
});
