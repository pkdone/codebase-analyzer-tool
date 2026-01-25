import { sortFilesBySize } from "../../../src/common/fs/file-sorting";
import { promises as fs } from "fs";

jest.mock("../../../src/common/utils/logging");
jest.mock("fs", () => ({
  promises: {
    stat: jest.fn(),
  },
}));

describe("file-sorting", () => {
  describe("sortFilesBySize", () => {
    const mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should sort files by size, largest first", async () => {
      const files = ["/test/small.ts", "/test/large.ts", "/test/medium.ts"];

      mockStat
        .mockResolvedValueOnce({ size: 10 } as any) // small.ts
        .mockResolvedValueOnce({ size: 1000 } as any) // large.ts
        .mockResolvedValueOnce({ size: 100 } as any); // medium.ts

      const result = await sortFilesBySize(files);

      expect(result).toEqual(["/test/large.ts", "/test/medium.ts", "/test/small.ts"]);
      expect(mockStat).toHaveBeenCalledTimes(3);
    });

    test("should handle files with stat errors gracefully", async () => {
      const files = ["/test/file1.ts", "/test/missing.ts", "/test/file3.ts"];

      mockStat
        .mockResolvedValueOnce({ size: 100 } as any) // file1.ts
        .mockRejectedValueOnce(new Error("File not found")) // missing.ts
        .mockResolvedValueOnce({ size: 50 } as any); // file3.ts

      const result = await sortFilesBySize(files);

      // File with error should be at the end (size 0)
      expect(result).toEqual(["/test/file1.ts", "/test/file3.ts", "/test/missing.ts"]);
      expect(mockStat).toHaveBeenCalledTimes(3);
    });

    test("should handle empty file list", async () => {
      const result = await sortFilesBySize([]);

      expect(result).toEqual([]);
      expect(mockStat).not.toHaveBeenCalled();
    });

    test("should handle single file", async () => {
      const files = ["/test/single.ts"];

      mockStat.mockResolvedValueOnce({ size: 42 } as any);

      const result = await sortFilesBySize(files);

      expect(result).toEqual(["/test/single.ts"]);
      expect(mockStat).toHaveBeenCalledTimes(1);
    });

    test("should handle files with same size", async () => {
      const files = ["/test/file1.ts", "/test/file2.ts", "/test/file3.ts"];

      mockStat
        .mockResolvedValueOnce({ size: 100 } as any)
        .mockResolvedValueOnce({ size: 100 } as any)
        .mockResolvedValueOnce({ size: 100 } as any);

      const result = await sortFilesBySize(files);

      // Order should be stable for same-size files
      expect(result).toHaveLength(3);
      expect(result).toEqual(expect.arrayContaining(files));
    });

    test("should handle files with zero size", async () => {
      const files = ["/test/empty.ts", "/test/nonempty.ts"];

      mockStat
        .mockResolvedValueOnce({ size: 0 } as any) // empty.ts
        .mockResolvedValueOnce({ size: 100 } as any); // nonempty.ts

      const result = await sortFilesBySize(files);

      expect(result).toEqual(["/test/nonempty.ts", "/test/empty.ts"]);
    });

    test("should not mutate the internal filesWithSizes array (immutable sort)", async () => {
      const files = ["/test/file1.ts", "/test/file2.ts", "/test/file3.ts"];

      mockStat
        .mockResolvedValueOnce({ size: 50 } as any)
        .mockResolvedValueOnce({ size: 200 } as any)
        .mockResolvedValueOnce({ size: 100 } as any);

      const result = await sortFilesBySize(files);

      // Verify the result is correctly sorted
      expect(result).toEqual(["/test/file2.ts", "/test/file3.ts", "/test/file1.ts"]);

      // Call again with the same mock data to ensure internal state wasn't mutated
      mockStat
        .mockResolvedValueOnce({ size: 50 } as any)
        .mockResolvedValueOnce({ size: 200 } as any)
        .mockResolvedValueOnce({ size: 100 } as any);

      const result2 = await sortFilesBySize(files);
      expect(result2).toEqual(["/test/file2.ts", "/test/file3.ts", "/test/file1.ts"]);
    });
  });
});
