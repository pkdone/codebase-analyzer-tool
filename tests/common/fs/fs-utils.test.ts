import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import mockFs from "mock-fs";
import path from "path";
import { readFile, writeFile, appendFile } from "../../../src/common/fs/file-operations";
import {
  listDirectoryEntries,
  clearDirectory,
  findFilesRecursively,
  sortFilesBySize,
} from "../../../src/common/fs/directory-operations";
import { readAndFilterLines } from "../../../src/common/fs/file-content-utils";

// Mock the logging module to avoid actual logging during tests
jest.mock("../../../src/common/utils/logging", () => ({
  logError: jest.fn(),
  logOneLineError: jest.fn(),
}));

describe("File System Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe("Basic File Operations", () => {
    test("should read file content correctly", async () => {
      mockFs({
        "/test/file.txt": "Hello, World!",
      });

      const content = await readFile("/test/file.txt");
      expect(content).toBe("Hello, World!");
    });

    test("should write file content correctly", async () => {
      mockFs({
        "/test": {},
      });

      await writeFile("/test/output.txt", "Test content");
      const content = await readFile("/test/output.txt");
      expect(content).toBe("Test content");
    });

    test("should append file content correctly", async () => {
      mockFs({
        "/test/file.txt": "Initial content",
      });

      await appendFile("/test/file.txt", "\nAppended content");
      const content = await readFile("/test/file.txt");
      expect(content).toBe("Initial content\nAppended content");
    });

    test("should read directory contents correctly", async () => {
      mockFs({
        "/test": {
          "file1.txt": "content1",
          "file2.txt": "content2",
          subdir: {},
        },
      });

      const contents = await listDirectoryEntries("/test");
      const names = contents.map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(["file1.txt", "file2.txt", "subdir"]);
    });
  });

  describe("clearDirectory", () => {
    test("should clear directory while preserving .gitignore", async () => {
      mockFs({
        "/test/dir": {
          ".gitignore": "*.log",
          "file1.txt": "content1",
          "file2.txt": "content2",
          subdir: {
            "nested.txt": "nested content",
          },
        },
      });

      await clearDirectory("/test/dir");

      // Check that .gitignore is preserved
      const gitignoreContent = await readFile("/test/dir/.gitignore");
      expect(gitignoreContent).toBe("*.log");

      // Check that other files are removed
      const contents = await listDirectoryEntries("/test/dir");
      const names = contents.map((entry) => entry.name);
      expect(names).toEqual([".gitignore"]);
    });

    test("should handle directory with only .gitignore", async () => {
      mockFs({
        "/test/dir": {
          ".gitignore": "*.log",
        },
      });

      await clearDirectory("/test/dir");

      const contents = await listDirectoryEntries("/test/dir");
      expect(contents).toHaveLength(1);
      expect(contents[0].name).toBe(".gitignore");
    });

    test("should create directory if it doesn't exist", async () => {
      mockFs({
        "/test": {},
      });

      await clearDirectory("/test/newdir");

      const contents = await listDirectoryEntries("/test/newdir");
      expect(contents).toHaveLength(0);
    });

    test("should handle empty directory", async () => {
      mockFs({
        "/test/empty": {},
      });

      await clearDirectory("/test/empty");

      const contents = await listDirectoryEntries("/test/empty");
      expect(contents).toHaveLength(0);
    });

    test("should handle nested directories and files", async () => {
      mockFs({
        "/test/complex": {
          ".gitignore": "*.log",
          "file1.txt": "content1",
          dir1: {
            "subfile1.txt": "subcontent1",
            nested: {
              "deep.txt": "deep content",
            },
          },
          dir2: {
            "subfile2.txt": "subcontent2",
          },
          "file2.md": "markdown content",
        },
      });

      await clearDirectory("/test/complex");

      // Only .gitignore should remain
      const contents = await listDirectoryEntries("/test/complex");
      const names = contents.map((entry) => entry.name);
      expect(names).toEqual([".gitignore"]);

      // Verify .gitignore content is preserved
      const gitignoreContent = await readFile("/test/complex/.gitignore");
      expect(gitignoreContent).toBe("*.log");
    });
  });

  describe("readAndFilterLines", () => {
    test("should filter out blank lines and comments", async () => {
      const fileContent = `# This is a comment
line1
line2

# Another comment
line3
   
line4
   # Indented comment  
line5`;

      mockFs({
        "/test/filter.txt": fileContent,
      });

      const lines = await readAndFilterLines("/test/filter.txt");
      expect(lines).toEqual(["line1", "line2", "line3", "line4", "line5"]);
    });

    test("should handle empty file", async () => {
      mockFs({
        "/test/empty.txt": "",
      });

      const lines = await readAndFilterLines("/test/empty.txt");
      expect(lines).toEqual([]);
    });

    test("should handle file with only comments and blank lines", async () => {
      const fileContent = `# Comment 1
# Comment 2

   # Indented comment
`;

      mockFs({
        "/test/comments.txt": fileContent,
      });

      const lines = await readAndFilterLines("/test/comments.txt");
      expect(lines).toEqual([]);
    });

    test("should trim whitespace from lines", async () => {
      const fileContent = `  line1  
   line2   
line3
   line4   `;

      mockFs({
        "/test/whitespace.txt": fileContent,
      });

      const lines = await readAndFilterLines("/test/whitespace.txt");
      expect(lines).toEqual(["line1", "line2", "line3", "line4"]);
    });
  });

  describe("findFilesRecursively", () => {
    beforeEach(() => {
      // Create a complex directory structure for testing
      mockFs({
        "/project": {
          "file1.txt": "small content",
          "file2.ts": "medium content here",
          "large-file.md":
            "very large content with lots of text that makes this file bigger than others",
          ".hidden-file": "hidden content",
          "ignored-prefix-file.txt": "ignored content",
          src: {
            "component.tsx": "react component",
            "utils.ts": "utility functions",
            nested: {
              "deep-file.ts": "deep nested file",
            },
          },
          node_modules: {
            package: {
              "index.ts": "package content",
            },
          },
          dist: {
            "build.ts": "built content",
          },
          ".git": {
            config: "git config",
          },
        },
      });
    });

    test("should find all files without ordering", async () => {
      const folderIgnoreList = ["node_modules", "dist", ".git"];
      const filenameIgnorePrefix = ".";

      const files = await findFilesRecursively("/project", folderIgnoreList, filenameIgnorePrefix);

      // Should include files but exclude ignored folders and hidden files
      const relativePaths = files.map((f) => path.relative("/project", f)).sort();
      expect(relativePaths).toEqual(
        [
          "file1.txt",
          "file2.ts",
          "ignored-prefix-file.txt", // Note: only files starting with prefix are ignored, not containing
          "large-file.md",
          "src/component.tsx",
          "src/nested/deep-file.ts",
          "src/utils.ts",
        ].sort(),
      );
    });

    test("should find files ordered by size (largest first)", async () => {
      const folderIgnoreList = ["node_modules", "dist", ".git"];
      const filenameIgnorePrefix = ".";

      const files = await findFilesRecursively("/project", folderIgnoreList, filenameIgnorePrefix);

      // Sort files by size to get largest first
      const sortedFiles = await sortFilesBySize(files);

      expect(sortedFiles.length).toBeGreaterThan(0);

      // Check that largest file comes first (large-file.md should be largest)
      const firstFile = path.relative("/project", sortedFiles[0]);
      expect(firstFile).toBe("large-file.md");
    });

    test("should respect folder ignore list", async () => {
      const folderIgnoreList = ["src", "node_modules"];
      const filenameIgnorePrefix = ".";

      const files = await findFilesRecursively("/project", folderIgnoreList, filenameIgnorePrefix);

      // Should not include any files from src directory
      const relativePaths = files.map((f) => path.relative("/project", f));
      const srcFiles = relativePaths.filter((p) => p.startsWith("src/"));
      expect(srcFiles).toHaveLength(0);

      // Should still include root level files
      expect(relativePaths).toContain("file1.txt");
      expect(relativePaths).toContain("file2.ts");
    });

    test("should respect filename ignore prefix", async () => {
      const folderIgnoreList = ["node_modules", "dist"];
      const filenameIgnorePrefix = "ignored-prefix";

      const files = await findFilesRecursively("/project", folderIgnoreList, filenameIgnorePrefix);

      // Should not include files starting with ignore prefix
      const relativePaths = files.map((f) => path.relative("/project", f));
      const ignoredFiles = relativePaths.filter((p) =>
        path.basename(p).startsWith("ignored-prefix"),
      );
      expect(ignoredFiles).toHaveLength(0);

      // Should still include other files
      expect(relativePaths).toContain("file1.txt");
      expect(relativePaths).toContain("file2.ts");
    });

    test("should handle empty directory", async () => {
      mockFs({
        "/empty": {},
      });

      const files = await findFilesRecursively("/empty", [], ".");
      expect(files).toHaveLength(0);
    });

    test("should handle directory with only ignored items", async () => {
      mockFs({
        "/ignored-only": {
          node_modules: {
            "package.json": "{}",
          },
          ".hidden": "hidden content",
          ".gitignore": "ignore patterns",
        },
      });

      const files = await findFilesRecursively("/ignored-only", ["node_modules"], ".");
      expect(files).toHaveLength(0);
    });

    test("should handle deeply nested structure", async () => {
      mockFs({
        "/deep": {
          level1: {
            level2: {
              level3: {
                level4: {
                  "deep-file.txt": "deep content",
                },
              },
            },
          },
        },
      });

      const files = await findFilesRecursively("/deep", [], ".");
      expect(files).toHaveLength(1);

      const relativePath = path.relative("/deep", files[0]);
      expect(relativePath).toBe("level1/level2/level3/level4/deep-file.txt");
    });

    test("should handle multiple ignore patterns", async () => {
      const folderIgnoreList = ["node_modules", "dist", ".git", "build", "coverage"];
      const filenameIgnorePrefix = ".";

      const files = await findFilesRecursively("/project", folderIgnoreList, filenameIgnorePrefix);

      // Should exclude all specified folders
      const relativePaths = files.map((f) => path.relative("/project", f));
      const hasIgnoredFolders = relativePaths.some((p) =>
        folderIgnoreList.some((ignored) => p.includes(ignored + "/")),
      );
      expect(hasIgnoredFolders).toBe(false);
    });
  });

  describe("Error Handling", () => {
    test("readFile should throw error for non-existent file", async () => {
      mockFs({});

      await expect(readFile("/non-existent.txt")).rejects.toThrow();
    });

    test("clearDirectory should handle non-existent directory gracefully", async () => {
      mockFs({});

      // Should not throw, but create the directory
      await expect(clearDirectory("/non-existent")).resolves.not.toThrow();
    });

    test("findFilesRecursively should handle non-existent directory", async () => {
      mockFs({});

      // The function returns empty array for non-existent directories with glob
      const files = await findFilesRecursively("/non-existent", [], ".");
      expect(files).toEqual([]);
    });
  });
});
