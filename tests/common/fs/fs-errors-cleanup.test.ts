import * as fs from "../../../src/common/fs";

/**
 * Unit tests to verify that unused FileSystemError has been removed.
 * These tests ensure that cleanup recommendations have been properly implemented.
 */
describe("FS Module Cleanup", () => {
  it("should not export FileSystemError", () => {
    // Verify that FileSystemError is not exported from the fs module
    expect(fs).not.toHaveProperty("FileSystemError");
  });

  it("should still export all expected file operations", () => {
    // Verify that essential file operations are still present
    expect(fs).toHaveProperty("readFile");
    expect(fs).toHaveProperty("writeFile");
    expect(fs).toHaveProperty("appendFile");
    expect(fs).toHaveProperty("writeBinaryFile");
  });
});
