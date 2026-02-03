import "reflect-metadata";
import { BufferedSourcesWriter } from "../../../../src/app/components/capture/buffered-sources-writer";
import { SourcesRepository } from "../../../../src/app/repositories/sources/sources.repository.interface";
import type { SourceRecord } from "../../../../src/app/repositories/sources/sources.model";

// Mock logging to suppress console output during tests
jest.mock("../../../../src/common/utils/logging", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logErr: jest.fn(),
}));

/**
 * Creates a mock source record for testing.
 * @param filepath - Unique filepath for the record
 */
function createMockSourceRecord(filepath: string): SourceRecord {
  return {
    projectName: "test-project",
    filename: `${filepath}.ts`,
    filepath,
    fileType: "ts",
    canonicalType: "javascript",
    linesCount: 10,
    content: `// Content of ${filepath}`,
  };
}

describe("BufferedSourcesWriter", () => {
  let writer: BufferedSourcesWriter;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSourcesRepository = {
      insertSource: jest.fn().mockResolvedValue(undefined),
      insertSources: jest.fn().mockResolvedValue(undefined),
      deleteSourcesByProject: jest.fn().mockResolvedValue(undefined),
      getProjectFilesPaths: jest.fn().mockResolvedValue([]),
      doesProjectSourceExist: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<SourcesRepository>;

    // Create writer with default batch size (50)
    writer = new BufferedSourcesWriter(mockSourcesRepository);
  });

  describe("constructor", () => {
    it("should create writer with default batch size of 50", () => {
      const customWriter = new BufferedSourcesWriter(mockSourcesRepository);
      expect(customWriter.bufferedCount).toBe(0);
    });

    it("should create writer with custom batch size", () => {
      const customWriter = new BufferedSourcesWriter(mockSourcesRepository, 10);
      expect(customWriter.bufferedCount).toBe(0);
    });
  });

  describe("add", () => {
    it("should buffer records without flushing when below batch size", async () => {
      const record = createMockSourceRecord("file1");

      await writer.add(record);

      expect(writer.bufferedCount).toBe(1);
      expect(mockSourcesRepository.insertSources).not.toHaveBeenCalled();
    });

    it("should auto-flush when batch size is reached", async () => {
      // Create writer with small batch size for testing
      const smallBatchWriter = new BufferedSourcesWriter(mockSourcesRepository, 3);

      // Add records up to batch size
      await smallBatchWriter.add(createMockSourceRecord("file1"));
      await smallBatchWriter.add(createMockSourceRecord("file2"));

      expect(smallBatchWriter.bufferedCount).toBe(2);
      expect(mockSourcesRepository.insertSources).not.toHaveBeenCalled();

      // Adding third record should trigger auto-flush
      await smallBatchWriter.add(createMockSourceRecord("file3"));

      expect(smallBatchWriter.bufferedCount).toBe(0);
      expect(mockSourcesRepository.insertSources).toHaveBeenCalledTimes(1);
      expect(mockSourcesRepository.insertSources).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ filepath: "file1" }),
          expect.objectContaining({ filepath: "file2" }),
          expect.objectContaining({ filepath: "file3" }),
        ]),
      );
    });

    it("should accumulate multiple records before reaching batch size", async () => {
      const smallBatchWriter = new BufferedSourcesWriter(mockSourcesRepository, 5);

      await smallBatchWriter.add(createMockSourceRecord("file1"));
      await smallBatchWriter.add(createMockSourceRecord("file2"));
      await smallBatchWriter.add(createMockSourceRecord("file3"));

      expect(smallBatchWriter.bufferedCount).toBe(3);
      expect(mockSourcesRepository.insertSources).not.toHaveBeenCalled();
    });
  });

  describe("flush", () => {
    it("should do nothing when buffer is empty", async () => {
      await writer.flush();

      expect(mockSourcesRepository.insertSources).not.toHaveBeenCalled();
    });

    it("should insert all buffered records", async () => {
      await writer.add(createMockSourceRecord("file1"));
      await writer.add(createMockSourceRecord("file2"));

      await writer.flush();

      expect(mockSourcesRepository.insertSources).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ filepath: "file1" }),
          expect.objectContaining({ filepath: "file2" }),
        ]),
      );
      expect(writer.bufferedCount).toBe(0);
    });

    it("should clear buffer after successful flush", async () => {
      await writer.add(createMockSourceRecord("file1"));

      await writer.flush();

      expect(writer.bufferedCount).toBe(0);
    });

    it("should fall back to individual inserts when batch insert fails", async () => {
      mockSourcesRepository.insertSources.mockRejectedValueOnce(new Error("Batch insert failed"));

      await writer.add(createMockSourceRecord("file1"));
      await writer.add(createMockSourceRecord("file2"));

      await writer.flush();

      // Should have tried batch insert first
      expect(mockSourcesRepository.insertSources).toHaveBeenCalledTimes(1);
      // Then fallen back to individual inserts
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(2);
      // Buffer should be cleared
      expect(writer.bufferedCount).toBe(0);
    });

    it("should continue individual inserts even if some fail", async () => {
      mockSourcesRepository.insertSources.mockRejectedValueOnce(new Error("Batch insert failed"));
      mockSourcesRepository.insertSource
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Individual insert failed"))
        .mockResolvedValueOnce(undefined);

      await writer.add(createMockSourceRecord("file1"));
      await writer.add(createMockSourceRecord("file2"));
      await writer.add(createMockSourceRecord("file3"));

      await writer.flush();

      // All individual inserts should be attempted
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(3);
      // Buffer should still be cleared
      expect(writer.bufferedCount).toBe(0);
    });

    it("should be idempotent when called multiple times", async () => {
      await writer.add(createMockSourceRecord("file1"));

      await writer.flush();
      await writer.flush();
      await writer.flush();

      // Only one batch insert should occur
      expect(mockSourcesRepository.insertSources).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("should clear the buffer without flushing", async () => {
      await writer.add(createMockSourceRecord("file1"));
      await writer.add(createMockSourceRecord("file2"));

      writer.reset();

      expect(writer.bufferedCount).toBe(0);
      expect(mockSourcesRepository.insertSources).not.toHaveBeenCalled();
    });

    it("should allow new records to be added after reset", async () => {
      await writer.add(createMockSourceRecord("file1"));
      writer.reset();
      await writer.add(createMockSourceRecord("file2"));

      expect(writer.bufferedCount).toBe(1);
      await writer.flush();

      expect(mockSourcesRepository.insertSources).toHaveBeenCalledWith([
        expect.objectContaining({ filepath: "file2" }),
      ]);
    });
  });

  describe("bufferedCount", () => {
    it("should return 0 for empty buffer", () => {
      expect(writer.bufferedCount).toBe(0);
    });

    it("should return correct count after adding records", async () => {
      await writer.add(createMockSourceRecord("file1"));
      expect(writer.bufferedCount).toBe(1);

      await writer.add(createMockSourceRecord("file2"));
      expect(writer.bufferedCount).toBe(2);
    });

    it("should return 0 after flush", async () => {
      await writer.add(createMockSourceRecord("file1"));
      await writer.flush();

      expect(writer.bufferedCount).toBe(0);
    });

    it("should return 0 after reset", async () => {
      await writer.add(createMockSourceRecord("file1"));
      writer.reset();

      expect(writer.bufferedCount).toBe(0);
    });
  });

  describe("integration scenarios", () => {
    it("should handle multiple flush cycles correctly", async () => {
      const smallBatchWriter = new BufferedSourcesWriter(mockSourcesRepository, 2);

      // First cycle
      await smallBatchWriter.add(createMockSourceRecord("file1"));
      await smallBatchWriter.add(createMockSourceRecord("file2")); // Auto-flush

      // Second cycle
      await smallBatchWriter.add(createMockSourceRecord("file3"));
      await smallBatchWriter.flush(); // Manual flush

      expect(mockSourcesRepository.insertSources).toHaveBeenCalledTimes(2);
      expect(mockSourcesRepository.insertSources).toHaveBeenNthCalledWith(1, [
        expect.objectContaining({ filepath: "file1" }),
        expect.objectContaining({ filepath: "file2" }),
      ]);
      expect(mockSourcesRepository.insertSources).toHaveBeenNthCalledWith(2, [
        expect.objectContaining({ filepath: "file3" }),
      ]);
    });

    it("should handle reset between add operations", async () => {
      await writer.add(createMockSourceRecord("file1"));
      writer.reset();
      await writer.add(createMockSourceRecord("file2"));
      await writer.add(createMockSourceRecord("file3"));
      await writer.flush();

      // Only the records added after reset should be inserted
      expect(mockSourcesRepository.insertSources).toHaveBeenCalledWith([
        expect.objectContaining({ filepath: "file2" }),
        expect.objectContaining({ filepath: "file3" }),
      ]);
    });
  });
});
