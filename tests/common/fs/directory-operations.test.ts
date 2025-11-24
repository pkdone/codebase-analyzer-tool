import {
  findFilesRecursively,
  sortFilesBySize,
  clearDirectory,
} from "../../../src/common/fs/directory-operations";
import glob from "fast-glob";
import { promises as fs } from "fs";
import { logError } from "../../../src/common/utils/logging";

jest.mock("fast-glob");
jest.mock("../../../src/common/utils/logging");
jest.mock("fs", () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn(),
    rm: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe("directory-operations", () => {
  describe("findFilesRecursively", () => {
    const mockGlob = glob as jest.MockedFunction<typeof glob>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should call glob with correct options", async () => {
      const mockFiles = ["/test/file1.ts", "/test/file2.ts", "/test/file3.ts"];
      mockGlob.mockResolvedValue(mockFiles as any);

      const result = await findFilesRecursively("/test", ["node_modules"], ".");

      // Verify glob was called only once
      expect(mockGlob).toHaveBeenCalledTimes(1);

      // Verify glob was called without stats option
      expect(mockGlob).toHaveBeenCalledWith(
        "**/*",
        expect.objectContaining({
          cwd: "/test",
          absolute: true,
          onlyFiles: true,
          ignore: ["**/node_modules/**", "**/.*"],
        }),
      );

      // Verify stats is not in the options
      const callArgs = mockGlob.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty("stats");

      expect(result).toEqual(mockFiles);
    });

    test("should build ignore patterns correctly", async () => {
      mockGlob.mockResolvedValue([]);

      await findFilesRecursively("/test", ["node_modules", "dist", ".git"], "_temp");

      expect(mockGlob).toHaveBeenCalledWith(
        "**/*",
        expect.objectContaining({
          ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/_temp*"],
        }),
      );
    });

    test("should return files in natural order from glob", async () => {
      const mockFiles = ["/test/file1.ts", "/test/file3.ts", "/test/file2.ts"];
      mockGlob.mockResolvedValue(mockFiles as any);

      const result = await findFilesRecursively("/test", [], ".");

      expect(result).toEqual(mockFiles);
    });

    test("should handle empty results", async () => {
      mockGlob.mockResolvedValue([]);

      const result = await findFilesRecursively("/test", [], ".");

      expect(result).toEqual([]);
    });
  });

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

  describe("clearDirectory", () => {
    const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
    const mockRm = fs.rm as jest.MockedFunction<typeof fs.rm>;
    const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
    const mockLogError = logError as jest.MockedFunction<typeof logError>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should delete all files except .gitignore", async () => {
      mockReaddir.mockResolvedValue(["file1.txt", "file2.txt", ".gitignore", "subfolder"] as any);
      mockRm.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await clearDirectory("/test/dir");

      expect(mockReaddir).toHaveBeenCalledWith("/test/dir");
      expect(mockRm).toHaveBeenCalledTimes(3); // file1.txt, file2.txt, subfolder
      expect(mockRm).not.toHaveBeenCalledWith("/test/dir/.gitignore", expect.anything());
      expect(mockMkdir).toHaveBeenCalledWith("/test/dir", { recursive: true });
    });

    test("should use for...of loop and skip .gitignore", async () => {
      const files = ["file1.txt", ".gitignore", "file2.txt"];
      mockReaddir.mockResolvedValue(files as any);
      mockRm.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await clearDirectory("/test/dir");

      expect(mockRm).toHaveBeenCalledTimes(2); // Only file1.txt and file2.txt
      expect(mockRm).toHaveBeenCalledWith("/test/dir/file1.txt", { recursive: true, force: true });
      expect(mockRm).toHaveBeenCalledWith("/test/dir/file2.txt", { recursive: true, force: true });
    });

    test("should handle rm errors gracefully", async () => {
      mockReaddir.mockResolvedValue(["file1.txt", "file2.txt"] as any);
      mockRm.mockRejectedValueOnce(new Error("Permission denied")).mockResolvedValueOnce(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await clearDirectory("/test/dir");

      expect(mockLogError).toHaveBeenCalledWith(
        expect.stringContaining("unable to remove the item"),
        expect.any(Error),
      );
      expect(mockMkdir).toHaveBeenCalled();
    });

    test("should handle readdir errors gracefully", async () => {
      mockReaddir.mockRejectedValue(new Error("Directory not found"));

      await clearDirectory("/test/dir");

      expect(mockLogError).toHaveBeenCalledWith(
        "Unable to read directory for clearing: /test/dir",
        expect.any(Error),
      );
      expect(mockMkdir).toHaveBeenCalled();
    });

    test("should handle mkdir errors gracefully", async () => {
      mockReaddir.mockResolvedValue([]);
      mockMkdir.mockRejectedValue(new Error("Permission denied"));

      await clearDirectory("/test/dir");

      expect(mockLogError).toHaveBeenCalledWith(
        "Failed to ensure directory exists after clearing: /test/dir",
        expect.any(Error),
      );
    });

    test("should handle empty directory", async () => {
      mockReaddir.mockResolvedValue([]);
      mockMkdir.mockResolvedValue(undefined);

      await clearDirectory("/test/dir");

      expect(mockRm).not.toHaveBeenCalled();
      expect(mockMkdir).toHaveBeenCalledWith("/test/dir", { recursive: true });
    });
  });
});
