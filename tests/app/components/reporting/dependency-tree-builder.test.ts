import { convertToHierarchical } from "../../../../src/app/components/reporting/utils/dependency-tree-builder";
import type { ProjectedTopLevelJavaClassDependencies } from "../../../../src/app/repositories/sources/sources.model";

describe("dependency-tree-builder", () => {
  test("shared child appears under multiple branches (no over-pruning)", () => {
    // Flat data simulating: Root -> A, Root -> B, and A -> Shared, B -> Shared
    const flat: ProjectedTopLevelJavaClassDependencies = {
      namespace: "Root",
      dependencies: [
        { level: 0, namespace: "Root", references: ["A", "B"] },
        { level: 1, namespace: "A", references: ["Shared"] },
        { level: 1, namespace: "B", references: ["Shared"] },
        { level: 2, namespace: "Shared", references: [] },
      ],
    };

    const hierarchical = convertToHierarchical(flat);
    expect(hierarchical.namespace).toBe("Root");
    expect(hierarchical.dependencies).toHaveLength(2);

    const aBranch = hierarchical.dependencies.find((d) => d.namespace === "A");
    const bBranch = hierarchical.dependencies.find((d) => d.namespace === "B");
    expect(aBranch).toBeDefined();
    expect(bBranch).toBeDefined();
    expect(aBranch?.dependencies).toHaveLength(1);
    expect(bBranch?.dependencies).toHaveLength(1);
    expect(aBranch?.dependencies?.[0].namespace).toBe("Shared");
    expect(bBranch?.dependencies?.[0].namespace).toBe("Shared");
  });

  test("handles deep dependency chain without stack overflow", () => {
    // Create a deep chain that would cause stack overflow with recursion
    const dependencies: { level: number; namespace: string; references: string[] }[] = [
      { level: 0, namespace: "Root", references: ["Level1"] },
    ];

    // Create a chain 10 levels deep
    for (let i = 1; i <= 10; i++) {
      const nextLevel = `Level${i + 1}`;
      dependencies.push({
        level: i,
        namespace: `Level${i}`,
        references: i < 10 ? [nextLevel] : [],
      });
    }

    const flat: ProjectedTopLevelJavaClassDependencies = {
      namespace: "Root",
      dependencies,
    };

    const hierarchical = convertToHierarchical(flat);
    expect(hierarchical.namespace).toBe("Root");
    expect(hierarchical.dependencies).toHaveLength(1);

    // Verify the chain is built correctly
    let current = hierarchical.dependencies[0];
    for (let i = 1; i <= 10; i++) {
      expect(current.namespace).toBe(`Level${i}`);
      if (i < 10) {
        expect(current.dependencies).toBeDefined();
        expect(current.dependencies?.length).toBe(1);
        current = current.dependencies![0];
      } else {
        expect(current.dependencies).toBeUndefined();
      }
    }
  });

  test("handles circular dependencies gracefully", () => {
    const flat: ProjectedTopLevelJavaClassDependencies = {
      namespace: "A",
      dependencies: [
        { level: 0, namespace: "A", references: ["B"] },
        { level: 1, namespace: "B", references: ["A"] },
      ],
    };

    const hierarchical = convertToHierarchical(flat);
    expect(hierarchical.namespace).toBe("A");
    expect(hierarchical.dependencies).toHaveLength(1);
    expect(hierarchical.dependencies[0].namespace).toBe("B");
    // Should not recurse infinitely due to visited set tracking
    expect(hierarchical.dependencies[0].dependencies).toBeUndefined();
  });
});
