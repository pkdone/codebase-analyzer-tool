import {
  findFilesRecursively,
  clearDirectory,
  findFilesWithSize,
  isGlobEntryWithStats,
} from "../../../src/common/fs/directory-operations";
import glob from "fast-glob";
import { promises as fs } from "fs";
import { logErr } from "../../../src/common/utils/logging";

jest.mock("fast-glob");
jest.mock("../../../src/common/utils/logging");
jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(),
    rm: jest.fn(),
    mkdir: jest.fn(),
  },
}));

describe("directory-operations", () => {
  describe("isGlobEntryWithStats", () => {
    test("should return true for valid entry with stats", () => {
      const entry = {
        path: "/test/file.ts",
        name: "file.ts",
        dirent: {},
        stats: { size: 1000, isFile: () => true },
      };
      expect(isGlobEntryWithStats(entry)).toBe(true);
    });

    test("should return true for valid entry without stats", () => {
      const entry = {
        path: "/test/file.ts",
        name: "file.ts",
        dirent: {},
      };
      expect(isGlobEntryWithStats(entry)).toBe(true);
    });

    test("should return true for entry with undefined stats", () => {
      const entry = {
        path: "/test/file.ts",
        name: "file.ts",
        dirent: {},
        stats: undefined,
      };
      expect(isGlobEntryWithStats(entry)).toBe(true);
    });

    test("should return false for null", () => {
      expect(isGlobEntryWithStats(null)).toBe(false);
    });

    test("should return false for undefined", () => {
      expect(isGlobEntryWithStats(undefined)).toBe(false);
    });

    test("should return false for non-object types", () => {
      expect(isGlobEntryWithStats("string")).toBe(false);
      expect(isGlobEntryWithStats(123)).toBe(false);
      expect(isGlobEntryWithStats(true)).toBe(false);
    });

    test("should return false for entry missing path property", () => {
      const entry = {
        name: "file.ts",
        dirent: {},
        stats: { size: 1000 },
      };
      expect(isGlobEntryWithStats(entry)).toBe(false);
    });

    test("should return false when path is not a string", () => {
      const entry = {
        path: 123,
        name: "file.ts",
        dirent: {},
      };
      expect(isGlobEntryWithStats(entry)).toBe(false);
    });

    test("should return false when stats is not an object", () => {
      const entry = {
        path: "/test/file.ts",
        name: "file.ts",
        dirent: {},
        stats: "invalid",
      };
      expect(isGlobEntryWithStats(entry)).toBe(false);
    });

    test("should return false when stats is null", () => {
      const entry = {
        path: "/test/file.ts",
        name: "file.ts",
        dirent: {},
        stats: null,
      };
      expect(isGlobEntryWithStats(entry)).toBe(false);
    });
  });

  describe("findFilesRecursively", () => {
    const mockGlob = glob as jest.MockedFunction<typeof glob>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should call glob with correct options", async () => {
      const mockFiles = ["/test/file1.ts", "/test/file2.ts", "/test/file3.ts"];
      mockGlob.mockResolvedValue(mockFiles as any);

      const result = await findFilesRecursively("/test", {
        folderIgnoreList: ["node_modules"],
        filenameIgnorePrefix: ".",
      });

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

      await findFilesRecursively("/test", {
        folderIgnoreList: ["node_modules", "dist", ".git"],
        filenameIgnorePrefix: "_temp",
      });

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

      const result = await findFilesRecursively("/test", {
        folderIgnoreList: [],
        filenameIgnorePrefix: ".",
      });

      expect(result).toEqual(mockFiles);
    });

    test("should handle empty results", async () => {
      mockGlob.mockResolvedValue([]);

      const result = await findFilesRecursively("/test", {
        folderIgnoreList: [],
        filenameIgnorePrefix: ".",
      });

      expect(result).toEqual([]);
    });
  });

  describe("findFilesWithSize", () => {
    const mockGlob = glob as jest.MockedFunction<typeof glob>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should call glob with stats option enabled", async () => {
      const mockEntries = [
        { path: "/test/file1.ts", stats: { size: 1000 } },
        { path: "/test/file2.ts", stats: { size: 500 } },
        { path: "/test/file3.ts", stats: { size: 2000 } },
      ];
      mockGlob.mockResolvedValue(mockEntries as any);

      await findFilesWithSize("/test", {
        folderIgnoreList: ["node_modules"],
        filenameIgnorePrefix: ".",
      });

      // Verify glob was called with stats: true
      expect(mockGlob).toHaveBeenCalledWith(
        "**/*",
        expect.objectContaining({
          cwd: "/test",
          absolute: true,
          onlyFiles: true,
          ignore: ["**/node_modules/**", "**/.*"],
          stats: true,
        }),
      );
    });

    test("should return files sorted by size descending", async () => {
      const mockEntries = [
        { path: "/test/small.ts", stats: { size: 100 } },
        { path: "/test/medium.ts", stats: { size: 500 } },
        { path: "/test/large.ts", stats: { size: 2000 } },
      ];
      mockGlob.mockResolvedValue(mockEntries as any);

      const result = await findFilesWithSize("/test", {
        folderIgnoreList: [],
        filenameIgnorePrefix: ".",
      });

      expect(result).toHaveLength(3);
      // Should be sorted by size descending (largest first)
      expect(result[0]).toEqual({ filepath: "/test/large.ts", size: 2000 });
      expect(result[1]).toEqual({ filepath: "/test/medium.ts", size: 500 });
      expect(result[2]).toEqual({ filepath: "/test/small.ts", size: 100 });
    });

    test("should handle entries without stats", async () => {
      const mockEntries = [
        { path: "/test/file1.ts", stats: { size: 1000 } },
        { path: "/test/file2.ts" }, // No stats
        { path: "/test/file3.ts", stats: undefined },
      ];
      mockGlob.mockResolvedValue(mockEntries as any);

      const result = await findFilesWithSize("/test", {
        folderIgnoreList: [],
        filenameIgnorePrefix: ".",
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ filepath: "/test/file1.ts", size: 1000 });
      // Files without stats should have size 0
      expect(result[1]).toEqual({ filepath: "/test/file2.ts", size: 0 });
      expect(result[2]).toEqual({ filepath: "/test/file3.ts", size: 0 });
    });

    test("should handle empty results", async () => {
      mockGlob.mockResolvedValue([]);

      const result = await findFilesWithSize("/test", {
        folderIgnoreList: [],
        filenameIgnorePrefix: ".",
      });

      expect(result).toEqual([]);
    });

    test("should maintain stable sort order for equal sizes", async () => {
      const mockEntries = [
        { path: "/test/a.ts", stats: { size: 100 } },
        { path: "/test/b.ts", stats: { size: 100 } },
        { path: "/test/c.ts", stats: { size: 100 } },
      ];
      mockGlob.mockResolvedValue(mockEntries as any);

      const result = await findFilesWithSize("/test", {
        folderIgnoreList: [],
        filenameIgnorePrefix: ".",
      });

      expect(result).toHaveLength(3);
      // All have same size - toSorted maintains stable order
      expect(result.map((f) => f.filepath)).toEqual(["/test/a.ts", "/test/b.ts", "/test/c.ts"]);
    });
  });

  describe("clearDirectory", () => {
    const mockReaddir = fs.readdir as jest.MockedFunction<typeof fs.readdir>;
    const mockRm = fs.rm as jest.MockedFunction<typeof fs.rm>;
    const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
    const mockLogOneLineError = logErr as jest.MockedFunction<typeof logErr>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should delete all files except .gitignore by default", async () => {
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

    test("should accept custom ignore array", async () => {
      mockReaddir.mockResolvedValue(["file1.txt", "keep.txt", "file2.txt"] as any);
      mockRm.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await clearDirectory("/test/dir", ["keep.txt"]);

      expect(mockRm).toHaveBeenCalledTimes(2); // Only file1.txt and file2.txt
      expect(mockRm).toHaveBeenCalledWith("/test/dir/file1.txt", { recursive: true, force: true });
      expect(mockRm).toHaveBeenCalledWith("/test/dir/file2.txt", { recursive: true, force: true });
      expect(mockRm).not.toHaveBeenCalledWith("/test/dir/keep.txt", expect.anything());
    });

    test("should accept custom filter function", async () => {
      mockReaddir.mockResolvedValue(["file1.txt", "important.txt", "file2.txt"] as any);
      mockRm.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      // Keep files starting with "important"
      await clearDirectory("/test/dir", (filename) => filename.startsWith("important"));

      expect(mockRm).toHaveBeenCalledTimes(2); // Only file1.txt and file2.txt
      expect(mockRm).toHaveBeenCalledWith("/test/dir/file1.txt", { recursive: true, force: true });
      expect(mockRm).toHaveBeenCalledWith("/test/dir/file2.txt", { recursive: true, force: true });
      expect(mockRm).not.toHaveBeenCalledWith("/test/dir/important.txt", expect.anything());
    });

    test("should handle empty ignore array", async () => {
      mockReaddir.mockResolvedValue(["file1.txt", ".gitignore", "file2.txt"] as any);
      mockRm.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await clearDirectory("/test/dir", []);

      expect(mockRm).toHaveBeenCalledTimes(3); // All files including .gitignore
      expect(mockRm).toHaveBeenCalledWith("/test/dir/.gitignore", { recursive: true, force: true });
    });

    test("should handle rm errors gracefully", async () => {
      mockReaddir.mockResolvedValue(["file1.txt", "file2.txt"] as any);
      mockRm.mockRejectedValueOnce(new Error("Permission denied")).mockResolvedValueOnce(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await clearDirectory("/test/dir");

      expect(mockLogOneLineError).toHaveBeenCalledWith(
        expect.stringContaining("unable to remove the item"),
        expect.any(Error),
      );
      expect(mockMkdir).toHaveBeenCalled();
    });

    test("should handle readdir errors gracefully", async () => {
      mockReaddir.mockRejectedValue(new Error("Directory not found"));

      await clearDirectory("/test/dir");

      expect(mockLogOneLineError).toHaveBeenCalledWith(
        "Unable to read directory for clearing: /test/dir",
        expect.any(Error),
      );
      expect(mockMkdir).toHaveBeenCalled();
    });

    test("should handle mkdir errors gracefully", async () => {
      mockReaddir.mockResolvedValue([]);
      mockMkdir.mockRejectedValue(new Error("Permission denied"));

      await clearDirectory("/test/dir");

      expect(mockLogOneLineError).toHaveBeenCalledWith(
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
