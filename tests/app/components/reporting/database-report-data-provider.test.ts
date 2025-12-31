import "reflect-metadata";
import { DatabaseReportDataProvider } from "../../../../src/app/components/reporting/sections/database/database-report-data-provider";
import type { SourcesRepository } from "../../../../src/app/repositories/sources/sources.repository.interface";

describe("DatabaseReportDataProvider", () => {
  let provider: DatabaseReportDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    mockSourcesRepository = {
      getProjectDatabaseIntegrations: jest.fn(),
      getProjectStoredProceduresAndTriggers: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    provider = new DatabaseReportDataProvider(mockSourcesRepository);
  });

  describe("summarizeItemsByComplexity - single pass optimization", () => {
    test("should correctly aggregate empty array", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      expect(result.procs.total).toBe(0);
      expect(result.procs.low).toBe(0);
      expect(result.procs.medium).toBe(0);
      expect(result.procs.high).toBe(0);
      expect(result.procs.list).toEqual([]);
    });

    test("should aggregate multiple items with different complexities in single pass", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file1.sql",
          summary: {
            purpose: "File containing test database procedures and triggers",
            implementation: "Implementation details for the test file with database objects",
            storedProcedures: [
              {
                name: "proc1",
                complexity: "LOW",
                linesOfCode: 10,
                purpose: "Test procedure 1",
                complexityReason: "Simple logic",
              },
              {
                name: "proc2",
                complexity: "HIGH",
                linesOfCode: 100,
                purpose: "Test procedure 2",
                complexityReason: "Complex logic",
              },
            ],
            triggers: [
              {
                name: "trig1",
                complexity: "MEDIUM",
                linesOfCode: 50,
                purpose: "Test trigger 1",
                complexityReason: "Moderate complexity",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      // Verify procedures aggregation
      expect(result.procs.total).toBe(2);
      expect(result.procs.low).toBe(1);
      expect(result.procs.medium).toBe(0);
      expect(result.procs.high).toBe(1);
      expect(result.procs.list).toHaveLength(2);
      expect(result.procs.list[0]).toMatchObject({
        name: "proc1",
        complexity: "LOW",
        type: "STORED PROCEDURE",
      });
      expect(result.procs.list[1]).toMatchObject({
        name: "proc2",
        complexity: "HIGH",
        type: "STORED PROCEDURE",
      });

      // Verify triggers aggregation
      expect(result.trigs.total).toBe(1);
      expect(result.trigs.low).toBe(0);
      expect(result.trigs.medium).toBe(1);
      expect(result.trigs.high).toBe(0);
      expect(result.trigs.list).toHaveLength(1);
      expect(result.trigs.list[0]).toMatchObject({
        name: "trig1",
        complexity: "MEDIUM",
        type: "TRIGGER",
      });
    });

    test("should normalize invalid complexity values", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file.sql",
          summary: {
            purpose: "File with invalid complexity value",
            implementation: "Test implementation for validation",
            storedProcedures: [
              {
                name: "invalidProc",
                complexity: "INVALID" as any,
                linesOfCode: 20,
                purpose: "Test",
                complexityReason: "Test reason",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      // INVALID complexity is now a valid value but gets skipped (not counted in any category)
      expect(result.procs.total).toBe(1);
      expect(result.procs.low).toBe(0);
      expect(result.procs.medium).toBe(0);
      expect(result.procs.high).toBe(0);
      expect(result.procs.list[0].complexity).toBe("INVALID");
    });

    test("should use type guard for complexity keys safely", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file.sql",
          summary: {
            purpose: "File with all valid complexity levels",
            implementation: "Test implementation",
            storedProcedures: [
              {
                name: "lowProc",
                complexity: "LOW",
                linesOfCode: 10,
                purpose: "Low complexity",
                complexityReason: "Simple",
              },
              {
                name: "mediumProc",
                complexity: "MEDIUM",
                linesOfCode: 50,
                purpose: "Medium complexity",
                complexityReason: "Moderate",
              },
              {
                name: "highProc",
                complexity: "HIGH",
                linesOfCode: 100,
                purpose: "High complexity",
                complexityReason: "Complex",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      // All complexity keys should be properly counted using type guard
      expect(result.procs.total).toBe(3);
      expect(result.procs.low).toBe(1);
      expect(result.procs.medium).toBe(1);
      expect(result.procs.high).toBe(1);
    });

    test("should handle multiple files with mixed procs and triggers", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file1.sql",
          summary: {
            purpose: "First test file",
            implementation: "Implementation for first test file",
            storedProcedures: [
              {
                name: "proc1",
                complexity: "LOW",
                linesOfCode: 10,
                purpose: "Test 1",
                complexityReason: "Simple",
              },
            ],
          },
        },
        {
          filepath: "/path/to/file2.sql",
          summary: {
            purpose: "Second test file",
            implementation: "Implementation for second test file",
            storedProcedures: [
              {
                name: "proc2",
                complexity: "HIGH",
                linesOfCode: 100,
                purpose: "Test 2",
                complexityReason: "Complex",
              },
              {
                name: "proc3",
                complexity: "MEDIUM",
                linesOfCode: 50,
                purpose: "Test 3",
                complexityReason: "Moderate",
              },
            ],
            triggers: [
              {
                name: "trig1",
                complexity: "LOW",
                linesOfCode: 15,
                purpose: "Test 4",
                complexityReason: "Simple",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      expect(result.procs.total).toBe(3);
      expect(result.procs.low).toBe(1);
      expect(result.procs.medium).toBe(1);
      expect(result.procs.high).toBe(1);
      expect(result.trigs.total).toBe(1);
      expect(result.trigs.low).toBe(1);
    });
  });

  describe("switch statement for complexity mapping", () => {
    test("should correctly map LOW complexity using switch statement", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file.sql",
          summary: {
            purpose: "Test file",
            implementation: "Test implementation",
            storedProcedures: [
              {
                name: "lowProc",
                complexity: "LOW",
                linesOfCode: 10,
                purpose: "Low complexity procedure",
                complexityReason: "Simple logic",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      expect(result.procs.low).toBe(1);
      expect(result.procs.medium).toBe(0);
      expect(result.procs.high).toBe(0);
    });

    test("should correctly map MEDIUM complexity using switch statement", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file.sql",
          summary: {
            purpose: "Test file",
            implementation: "Test implementation",
            storedProcedures: [
              {
                name: "medProc",
                complexity: "MEDIUM",
                linesOfCode: 50,
                purpose: "Medium complexity procedure",
                complexityReason: "Moderate logic",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      expect(result.procs.low).toBe(0);
      expect(result.procs.medium).toBe(1);
      expect(result.procs.high).toBe(0);
    });

    test("should correctly map HIGH complexity using switch statement", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file.sql",
          summary: {
            purpose: "Test file",
            implementation: "Test implementation",
            storedProcedures: [
              {
                name: "highProc",
                complexity: "HIGH",
                linesOfCode: 100,
                purpose: "High complexity procedure",
                complexityReason: "Complex logic",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      expect(result.procs.low).toBe(0);
      expect(result.procs.medium).toBe(0);
      expect(result.procs.high).toBe(1);
    });

    test("should handle switch statement with all complexity types in one aggregation", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file.sql",
          summary: {
            purpose: "Test file with all complexities",
            implementation: "Test implementation",
            storedProcedures: [
              {
                name: "proc1",
                complexity: "LOW",
                linesOfCode: 10,
                purpose: "Low",
                complexityReason: "Simple",
              },
              {
                name: "proc2",
                complexity: "LOW",
                linesOfCode: 15,
                purpose: "Low",
                complexityReason: "Simple",
              },
              {
                name: "proc3",
                complexity: "MEDIUM",
                linesOfCode: 50,
                purpose: "Medium",
                complexityReason: "Moderate",
              },
              {
                name: "proc4",
                complexity: "MEDIUM",
                linesOfCode: 60,
                purpose: "Medium",
                complexityReason: "Moderate",
              },
              {
                name: "proc5",
                complexity: "MEDIUM",
                linesOfCode: 70,
                purpose: "Medium",
                complexityReason: "Moderate",
              },
              {
                name: "proc6",
                complexity: "HIGH",
                linesOfCode: 100,
                purpose: "High",
                complexityReason: "Complex",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      // Verify switch statement correctly counts all branches
      expect(result.procs.total).toBe(6);
      expect(result.procs.low).toBe(2);
      expect(result.procs.medium).toBe(3);
      expect(result.procs.high).toBe(1);
    });

    test("should ensure switch statement is type-safe and exhaustive", async () => {
      // This test verifies that the switch statement handles all Complexity values
      // If a new complexity type is added to the Complexity type, TypeScript will
      // catch it at compile time if the switch statement is not exhaustive
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([
        {
          filepath: "/path/to/file.sql",
          summary: {
            purpose: "Test file",
            implementation: "Test implementation",
            storedProcedures: [
              {
                name: "proc1",
                complexity: "LOW",
                linesOfCode: 10,
                purpose: "Test",
                complexityReason: "Test",
              },
              {
                name: "proc2",
                complexity: "MEDIUM",
                linesOfCode: 50,
                purpose: "Test",
                complexityReason: "Test",
              },
              {
                name: "proc3",
                complexity: "HIGH",
                linesOfCode: 100,
                purpose: "Test",
                complexityReason: "Test",
              },
            ],
          },
        },
      ]);

      const result = await provider.buildProceduresAndTriggersSummary("test-project");

      // All three complexity levels should be handled
      expect(result.procs.low + result.procs.medium + result.procs.high).toBe(result.procs.total);
    });
  });

  describe("getDatabaseInteractions", () => {
    test("should extract all database integration fields including new ones", async () => {
      mockSourcesRepository.getProjectDatabaseIntegrations.mockResolvedValue([
        {
          filepath: "/path/to/repository.java",
          summary: {
            namespace: "com.example.repository.UserRepository",
            databaseIntegration: {
              mechanism: "JPA",
              name: "UserRepository",
              description: "User data access using JPA Repository pattern",
              databaseName: "users_db",
              tablesAccessed: ["users", "user_profiles", "user_roles"],
              operationType: ["READ", "WRITE"],
              queryPatterns: "JPQL queries with dynamic criteria",
              transactionHandling: "Spring @Transactional annotations",
              protocol: "PostgreSQL 15",
              connectionInfo: "jdbc:postgresql://localhost:5432/users_db",
              codeExample:
                "@Repository public class UserRepository extends JpaRepository<User, Long> {}",
            },
          },
        },
      ]);

      const result = await provider.getDatabaseInteractions("test-project");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "com.example.repository.UserRepository",
        mechanism: "JPA",
        name: "UserRepository",
        description: "User data access using JPA Repository pattern",
        databaseName: "users_db",
        tablesAccessed: ["users", "user_profiles", "user_roles"],
        operationType: ["READ", "WRITE"],
        queryPatterns: "JPQL queries with dynamic criteria",
        transactionHandling: "Spring @Transactional annotations",
        protocol: "PostgreSQL 15",
        connectionInfo: "jdbc:postgresql://localhost:5432/users_db",
        codeExample: "@Repository public class UserRepository extends JpaRepository<User, Long> {}",
      });
    });

    test("should handle database integrations with only required fields", async () => {
      mockSourcesRepository.getProjectDatabaseIntegrations.mockResolvedValue([
        {
          filepath: "/path/to/file.ts",
          summary: {
            databaseIntegration: {
              mechanism: "DRIVER",
              description: "Direct database driver usage",
              codeExample: "const client = new MongoClient(uri);",
            },
          },
        },
      ]);

      const result = await provider.getDatabaseInteractions("test-project");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: "/path/to/file.ts",
        mechanism: "DRIVER",
        name: undefined,
        description: "Direct database driver usage",
        databaseName: undefined,
        tablesAccessed: undefined,
        operationType: undefined,
        queryPatterns: undefined,
        transactionHandling: undefined,
        protocol: undefined,
        connectionInfo: undefined,
        codeExample: "const client = new MongoClient(uri);",
      });
    });

    test("should filter out files without database integration", async () => {
      mockSourcesRepository.getProjectDatabaseIntegrations.mockResolvedValue([
        {
          filepath: "/path/to/file1.java",
          summary: {
            databaseIntegration: {
              mechanism: "HIBERNATE",
              description: "Uses Hibernate ORM",
              codeExample: "@Entity public class User {}",
            },
          },
        },
        {
          filepath: "/path/to/file2.java",
          summary: {},
        },
      ]);

      const result = await provider.getDatabaseInteractions("test-project");

      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe("HIBERNATE");
    });

    test("should handle multiple database integrations", async () => {
      mockSourcesRepository.getProjectDatabaseIntegrations.mockResolvedValue([
        {
          filepath: "/path/to/repo1.java",
          summary: {
            databaseIntegration: {
              mechanism: "JDBC",
              description: "Direct JDBC access",
              operationType: ["READ"],
              codeExample: "Connection conn = DriverManager.getConnection(url);",
            },
          },
        },
        {
          filepath: "/path/to/repo2.ts",
          summary: {
            namespace: "models.User",
            databaseIntegration: {
              mechanism: "MONGOOSE",
              description: "MongoDB with Mongoose ODM",
              databaseName: "app_db",
              tablesAccessed: ["users"],
              operationType: ["WRITE"],
              codeExample: "const User = mongoose.model('User', userSchema);",
            },
          },
        },
      ]);

      const result = await provider.getDatabaseInteractions("test-project");

      expect(result).toHaveLength(2);
      expect(result[0].mechanism).toBe("JDBC");
      expect(result[0].operationType).toEqual(["READ"]);
      expect(result[1].mechanism).toBe("MONGOOSE");
      expect(result[1].path).toBe("models.User");
      expect(result[1].operationType).toEqual(["WRITE"]);
    });
  });
});
