import { findFilesRecursively, clearDirectory } from "../../../src/common/fs/directory-operations";
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
