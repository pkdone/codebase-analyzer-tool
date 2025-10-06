import "reflect-metadata";
import { CodeStructureDataProvider } from "../../../../src/components/reporting/data-providers/code-structure-data-provider";
import type { SourcesRepository } from "../../../../src/repositories/source/sources.repository.interface";
import type {
  ProjectedTopLevelJavaClassDependencies,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../../../src/repositories/source/sources.model";

describe("CodeStructureDataProvider", () => {
  let codeStructureDataProvider: CodeStructureDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockSourcesRepository = {
      getProjectTopLevelJavaClasses: jest.fn(),
      getTopLevelJavaClassesByDependencyCount: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    codeStructureDataProvider = new CodeStructureDataProvider(mockSourcesRepository);
  });

  describe("getTopLevelJavaClasses", () => {
    it("should convert flat dependency structure to hierarchical structure", async () => {
      // Arrange
      const inputData: ProjectedTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.sun.j2ee.blueprints.signon.web.CreateUserServlet",
          dependencies: [
            {
              level: 1, // Note: Converting from Long('1') to number
              namespace: "com.sun.j2ee.blueprints.signon.web.SignOnFilter",
              references: [
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                "com.sun.j2ee.blueprints.signon.web.SignOnDAO",
                "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
              ],
            },
            {
              level: 1,
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
              references: [],
            },
            {
              level: 0,
              namespace: "com.sun.j2ee.blueprints.signon.web.CreateUserServlet",
              references: [
                "com.sun.j2ee.blueprints.signon.web.SignOnFilter",
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
              ],
            },
            {
              level: 1,
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
              references: ["com.sun.j2ee.blueprints.signon.ejb.SignOnLocal"],
            },
            {
              level: 2,
              namespace: "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
              references: [],
            },
            {
              level: 2,
              namespace: "com.sun.j2ee.blueprints.signon.web.SignOnDAO",
              references: ["com.sun.j2ee.blueprints.signon.web.ProtectedResource"],
            },
          ],
        },
      ];

      // With path-specific visited sets, duplicated references are preserved per branch
      const expectedOutput: HierarchicalTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.sun.j2ee.blueprints.signon.web.CreateUserServlet",
          dependencies: [
            {
              namespace: "com.sun.j2ee.blueprints.signon.web.SignOnFilter",
              originalLevel: 1,
              dependencies: [
                {
                  namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
                  originalLevel: 1,
                  dependencies: [
                    {
                      namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                      originalLevel: 1,
                    },
                  ],
                },
                {
                  namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                  originalLevel: 1,
                },
                {
                  namespace: "com.sun.j2ee.blueprints.signon.web.SignOnDAO",
                  originalLevel: 2,
                  dependencies: [
                    {
                      namespace: "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
                      originalLevel: 2,
                    },
                  ],
                },
                {
                  namespace: "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
                  originalLevel: 2,
                },
              ],
            },
            {
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
              originalLevel: 1,
              dependencies: [
                {
                  namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                  originalLevel: 1,
                },
              ],
            },
            {
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
              originalLevel: 1,
            },
          ],
        },
      ];

      mockSourcesRepository.getTopLevelJavaClassesByDependencyCount = jest
        .fn()
        .mockResolvedValue(inputData);

      // Act
      const result = await codeStructureDataProvider.getTopLevelJavaClasses("test-project");

      // Assert
      expect(mockSourcesRepository.getTopLevelJavaClassesByDependencyCount).toHaveBeenCalledWith(
        "test-project",
      );
      expect(result).toEqual(expectedOutput);
    });

    it("should handle empty dependencies array", async () => {
      // Arrange
      const inputData: ProjectedTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.EmptyClass",
          dependencies: [],
        },
      ];

      const expectedOutput: HierarchicalTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.EmptyClass",
          dependencies: [],
        },
      ];

      mockSourcesRepository.getTopLevelJavaClassesByDependencyCount = jest
        .fn()
        .mockResolvedValue(inputData);

      // Act
      const result = await codeStructureDataProvider.getTopLevelJavaClasses("test-project");

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it("should handle missing root node (level 0)", async () => {
      // Arrange
      const inputData: ProjectedTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.NoRootClass",
          dependencies: [
            {
              level: 1,
              namespace: "com.example.Child1",
              references: [],
            },
            {
              level: 2,
              namespace: "com.example.Child2",
              references: [],
            },
          ],
        },
      ];

      const expectedOutput: HierarchicalTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.NoRootClass",
          dependencies: [],
        },
      ];

      mockSourcesRepository.getTopLevelJavaClassesByDependencyCount = jest
        .fn()
        .mockResolvedValue(inputData);

      // Act
      const result = await codeStructureDataProvider.getTopLevelJavaClasses("test-project");

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it("should handle circular dependencies without infinite recursion", async () => {
      // Arrange
      const inputData: ProjectedTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.CircularClass",
          dependencies: [
            {
              level: 0,
              namespace: "com.example.CircularClass",
              references: ["com.example.Child1"],
            },
            {
              level: 1,
              namespace: "com.example.Child1",
              references: ["com.example.Child2"],
            },
            {
              level: 2,
              namespace: "com.example.Child2",
              references: ["com.example.Child1"], // Circular reference
            },
          ],
        },
      ];

      const expectedOutput: HierarchicalTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.CircularClass",
          dependencies: [
            {
              namespace: "com.example.Child1",
              originalLevel: 1,
              dependencies: [
                {
                  namespace: "com.example.Child2",
                  originalLevel: 2,
                  // Child1 is not included again due to circular reference protection
                  // No dependencies property since it's a leaf node
                },
              ],
            },
          ],
        },
      ];

      mockSourcesRepository.getTopLevelJavaClassesByDependencyCount = jest
        .fn()
        .mockResolvedValue(inputData);

      // Act
      const result = await codeStructureDataProvider.getTopLevelJavaClasses("test-project");

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it("should handle complex multi-level hierarchies", async () => {
      // Arrange
      const inputData: ProjectedTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.ComplexClass",
          dependencies: [
            {
              level: 0,
              namespace: "com.example.ComplexClass",
              references: ["com.example.Level1A", "com.example.Level1B"],
            },
            {
              level: 1,
              namespace: "com.example.Level1A",
              references: ["com.example.Level2A"],
            },
            {
              level: 1,
              namespace: "com.example.Level1B",
              references: ["com.example.Level2B", "com.example.Level2C"],
            },
            {
              level: 2,
              namespace: "com.example.Level2A",
              references: [],
            },
            {
              level: 2,
              namespace: "com.example.Level2B",
              references: [],
            },
            {
              level: 2,
              namespace: "com.example.Level2C",
              references: [],
            },
          ],
        },
      ];

      const expectedOutput: HierarchicalTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.example.ComplexClass",
          dependencies: [
            {
              namespace: "com.example.Level1A",
              originalLevel: 1,
              dependencies: [
                {
                  namespace: "com.example.Level2A",
                  originalLevel: 2,
                },
              ],
            },
            {
              namespace: "com.example.Level1B",
              originalLevel: 1,
              dependencies: [
                {
                  namespace: "com.example.Level2B",
                  originalLevel: 2,
                },
                {
                  namespace: "com.example.Level2C",
                  originalLevel: 2,
                },
              ],
            },
          ],
        },
      ];

      mockSourcesRepository.getTopLevelJavaClassesByDependencyCount = jest
        .fn()
        .mockResolvedValue(inputData);

      // Act
      const result = await codeStructureDataProvider.getTopLevelJavaClasses("test-project");

      // Assert
      expect(result).toEqual(expectedOutput);
    });

    it("should assign correct levels - all direct dependencies should be level 1", async () => {
      // Arrange - This is the user's specific example
      const inputData: ProjectedTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.sun.j2ee.blueprints.signon.web.CreateUserServlet",
          dependencies: [
            {
              level: 1,
              namespace: "com.sun.j2ee.blueprints.signon.web.SignOnFilter",
              references: [
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                "com.sun.j2ee.blueprints.signon.web.SignOnDAO",
                "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
              ],
            },
            {
              level: 1,
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
              references: [],
            },
            {
              level: 0,
              namespace: "com.sun.j2ee.blueprints.signon.web.CreateUserServlet",
              references: [
                "com.sun.j2ee.blueprints.signon.web.SignOnFilter",
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
                "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
              ],
            },
            {
              level: 1,
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
              references: ["com.sun.j2ee.blueprints.signon.ejb.SignOnLocal"],
            },
            {
              level: 2,
              namespace: "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
              references: [],
            },
            {
              level: 2,
              namespace: "com.sun.j2ee.blueprints.signon.web.SignOnDAO",
              references: ["com.sun.j2ee.blueprints.signon.web.ProtectedResource"],
            },
          ],
        },
      ];

      const expectedOutput: HierarchicalTopLevelJavaClassDependencies[] = [
        {
          namespace: "com.sun.j2ee.blueprints.signon.web.CreateUserServlet",
          dependencies: [
            {
              namespace: "com.sun.j2ee.blueprints.signon.web.SignOnFilter",
              originalLevel: 1,
              dependencies: [
                {
                  namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
                  originalLevel: 1,
                  dependencies: [
                    {
                      namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                      originalLevel: 1,
                    },
                  ],
                },
                {
                  namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                  originalLevel: 1,
                },
                {
                  namespace: "com.sun.j2ee.blueprints.signon.web.SignOnDAO",
                  originalLevel: 2,
                  dependencies: [
                    {
                      namespace: "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
                      originalLevel: 2,
                    },
                  ],
                },
                {
                  namespace: "com.sun.j2ee.blueprints.signon.web.ProtectedResource",
                  originalLevel: 2,
                },
              ],
            },
            {
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocalHome",
              originalLevel: 1,
              dependencies: [
                {
                  namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
                  originalLevel: 1,
                },
              ],
            },
            {
              namespace: "com.sun.j2ee.blueprints.signon.ejb.SignOnLocal",
              originalLevel: 1,
            },
          ],
        },
      ];

      mockSourcesRepository.getTopLevelJavaClassesByDependencyCount = jest
        .fn()
        .mockResolvedValue(inputData);

      // Act
      const result = await codeStructureDataProvider.getTopLevelJavaClasses("test-project");

      // Assert - Verify that all direct dependencies are properly structured
      expect(result).toEqual(expectedOutput);

      // Additional verification: ensure the dependency tree structure is correct
      const directDependencies = result[0].dependencies;
      expect(directDependencies).toHaveLength(3); // SignOnFilter, SignOnLocalHome, SignOnLocal (duplicates preserved per branch)

      const namespaces = directDependencies.map((dep) => dep.namespace);
      expect(namespaces).toContain("com.sun.j2ee.blueprints.signon.web.SignOnFilter");
    });
  });
});
