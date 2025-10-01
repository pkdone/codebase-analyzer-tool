import "reflect-metadata";
import { DatabaseReportDataProvider } from "../../../src/components/reporting/data-providers/database-report-data-provider";
import type { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";

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

  describe("aggregateProcsOrTriggersForReport - single pass optimization", () => {
    test("should correctly aggregate empty array", async () => {
      mockSourcesRepository.getProjectStoredProceduresAndTriggers.mockResolvedValue([]);

      const result = await provider.getSummarizedProceduresAndTriggers("test-project");

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

      const result = await provider.getSummarizedProceduresAndTriggers("test-project");

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

      const result = await provider.getSummarizedProceduresAndTriggers("test-project");

      // Invalid complexity should default to LOW
      expect(result.procs.total).toBe(1);
      expect(result.procs.low).toBe(1);
      expect(result.procs.list[0].complexity).toBe("LOW");
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

      const result = await provider.getSummarizedProceduresAndTriggers("test-project");

      expect(result.procs.total).toBe(3);
      expect(result.procs.low).toBe(1);
      expect(result.procs.medium).toBe(1);
      expect(result.procs.high).toBe(1);
      expect(result.trigs.total).toBe(1);
      expect(result.trigs.low).toBe(1);
    });
  });
});
