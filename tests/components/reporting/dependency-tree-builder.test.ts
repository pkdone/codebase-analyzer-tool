import { convertToHierarchical } from "../../../src/components/reporting/utils/dependency-tree-builder";
import type { ProjectedTopLevelJavaClassDependencies } from "../../../src/repositories/source/sources.model";

describe("dependency-tree-builder", () => {
  test("shared child appears under multiple branches (no over-pruning)", () => {
    // Flat data simulating: Root -> A, Root -> B, and A -> Shared, B -> Shared
    const flat: ProjectedTopLevelJavaClassDependencies = {
      classpath: "Root",
      dependencies: [
        { level: 0, classpath: "Root", references: ["A", "B"] },
        { level: 1, classpath: "A", references: ["Shared"] },
        { level: 1, classpath: "B", references: ["Shared"] },
        { level: 2, classpath: "Shared", references: [] },
      ],
    };

    const hierarchical = convertToHierarchical(flat);
    expect(hierarchical.classpath).toBe("Root");
    expect(hierarchical.dependencies).toHaveLength(2);

    const aBranch = hierarchical.dependencies.find((d) => d.classpath === "A");
    const bBranch = hierarchical.dependencies.find((d) => d.classpath === "B");
    expect(aBranch).toBeDefined();
    expect(bBranch).toBeDefined();
    expect(aBranch?.dependencies).toHaveLength(1);
    expect(bBranch?.dependencies).toHaveLength(1);
    expect(aBranch?.dependencies?.[0].classpath).toBe("Shared");
    expect(bBranch?.dependencies?.[0].classpath).toBe("Shared");
  });
});
