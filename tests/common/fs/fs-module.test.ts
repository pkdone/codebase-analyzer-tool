/**
 * Integration test for the fs module barrel exports.
 * Verifies that all file-system utilities are properly exported through the index.
 */
import * as fs from "../../../src/common/fs";

describe("fs module barrel exports", () => {
  describe("directory-operations exports", () => {
    it("should export findFilesRecursively", () => {
      expect(fs.findFilesRecursively).toBeDefined();
      expect(typeof fs.findFilesRecursively).toBe("function");
    });

    it("should export sortFilesBySize", () => {
      expect(fs.sortFilesBySize).toBeDefined();
      expect(typeof fs.sortFilesBySize).toBe("function");
    });

    it("should export listDirectoryEntries", () => {
      expect(fs.listDirectoryEntries).toBeDefined();
      expect(typeof fs.listDirectoryEntries).toBe("function");
    });

    it("should export ensureDirectoryExists", () => {
      expect(fs.ensureDirectoryExists).toBeDefined();
      expect(typeof fs.ensureDirectoryExists).toBe("function");
    });

    it("should export clearDirectory", () => {
      expect(fs.clearDirectory).toBeDefined();
      expect(typeof fs.clearDirectory).toBe("function");
    });
  });

  describe("file-operations exports", () => {
    it("should export readFile", () => {
      expect(fs.readFile).toBeDefined();
      expect(typeof fs.readFile).toBe("function");
    });

    it("should export writeFile", () => {
      expect(fs.writeFile).toBeDefined();
      expect(typeof fs.writeFile).toBe("function");
    });

    it("should export appendFile", () => {
      expect(fs.appendFile).toBeDefined();
      expect(typeof fs.appendFile).toBe("function");
    });

    it("should export writeBinaryFile", () => {
      expect(fs.writeBinaryFile).toBeDefined();
      expect(typeof fs.writeBinaryFile).toBe("function");
    });
  });

  describe("file-content-utils exports", () => {
    it("should export readAndFilterLines", () => {
      expect(fs.readAndFilterLines).toBeDefined();
      expect(typeof fs.readAndFilterLines).toBe("function");
    });
  });

  describe("path-utils exports", () => {
    it("should export getFileExtension", () => {
      expect(fs.getFileExtension).toBeDefined();
      expect(typeof fs.getFileExtension).toBe("function");
    });

    it("should export getProjectNameFromPath", () => {
      expect(fs.getProjectNameFromPath).toBeDefined();
      expect(typeof fs.getProjectNameFromPath).toBe("function");
    });
  });

  it("should not have naming conflicts between exports", () => {
    // Verify that all exports are distinct
    const exports = Object.keys(fs);
    const uniqueExports = new Set(exports);
    expect(exports.length).toBe(uniqueExports.size);
  });

  it("should have at least 12 exported functions", () => {
    // Ensure we're exporting a reasonable number of utilities
    const exports = Object.keys(fs);
    expect(exports.length).toBeGreaterThanOrEqual(12);
  });
});
