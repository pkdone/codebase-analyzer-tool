import { findFilesRecursively } from "../../../src/common/utils/directory-operations";
import glob from "fast-glob";

jest.mock("fast-glob");

describe("directory-operations", () => {
  describe("findFilesRecursively - dynamic glob options", () => {
    const mockGlob = glob as jest.MockedFunction<typeof glob>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should call glob once with stats option when ordering by size", async () => {
      const mockFiles = [
        { path: "/test/file1.ts", stats: { size: 100 } },
        { path: "/test/file2.ts", stats: { size: 50 } },
        { path: "/test/file3.ts", stats: { size: 200 } },
      ];
      mockGlob.mockResolvedValue(mockFiles as any);

      const result = await findFilesRecursively(
        "/test",
        ["node_modules", "dist"],
        ".",
        true, // orderByLargestSizeFileFirst
      );

      // Verify glob was called only once
      expect(mockGlob).toHaveBeenCalledTimes(1);

      // Verify glob was called with stats option
      expect(mockGlob).toHaveBeenCalledWith(
        "**/*",
        expect.objectContaining({
          cwd: "/test",
          absolute: true,
          onlyFiles: true,
          stats: true,
          ignore: ["**/node_modules/**", "**/dist/**", "**/.*"],
        }),
      );

      // Verify files are sorted by size (largest first)
      expect(result).toEqual(["/test/file3.ts", "/test/file1.ts", "/test/file2.ts"]);
    });

    test("should call glob once without stats option when not ordering by size", async () => {
      const mockFiles = ["/test/file1.ts", "/test/file2.ts", "/test/file3.ts"];
      mockGlob.mockResolvedValue(mockFiles as any);

      const result = await findFilesRecursively(
        "/test",
        ["node_modules"],
        ".",
        false, // orderByLargestSizeFileFirst
      );

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

      // Verify stats is not in the options (dynamic spreading didn't add it)
      const callArgs = mockGlob.mock.calls[0][1];
      expect(callArgs).not.toHaveProperty("stats");

      expect(result).toEqual(mockFiles);
    });

    test("should handle files with missing stats gracefully", async () => {
      const mockFiles = [
        { path: "/test/file1.ts", stats: { size: 100 } },
        { path: "/test/file2.ts", stats: undefined }, // Missing stats
        { path: "/test/file3.ts", stats: { size: 50 } },
      ];
      mockGlob.mockResolvedValue(mockFiles as any);

      const result = await findFilesRecursively("/test", [], ".", true);

      // Should only include files with valid stats
      expect(result).toEqual(["/test/file1.ts", "/test/file3.ts"]);
    });

    test("should build ignore patterns correctly", async () => {
      mockGlob.mockResolvedValue([]);

      await findFilesRecursively("/test", ["node_modules", "dist", ".git"], "_temp", false);

      expect(mockGlob).toHaveBeenCalledWith(
        "**/*",
        expect.objectContaining({
          ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/_temp*"],
        }),
      );
    });

    test("should sort files correctly when ordering by size", async () => {
      const mockFiles = [
        { path: "/test/small.ts", stats: { size: 10 } },
        { path: "/test/large.ts", stats: { size: 1000 } },
        { path: "/test/medium.ts", stats: { size: 100 } },
      ];
      mockGlob.mockResolvedValue(mockFiles as any);

      const result = await findFilesRecursively("/test", [], ".", true);

      expect(result).toEqual(["/test/large.ts", "/test/medium.ts", "/test/small.ts"]);
    });
  });
});

