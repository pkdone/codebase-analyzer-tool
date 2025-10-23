import { convertToHierarchical } from "../../../src/components/reporting/utils/dependency-tree-builder";
import type { ProjectedTopLevelJavaClassDependencies } from "../../../src/repositories/sources/sources.model";

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
});
