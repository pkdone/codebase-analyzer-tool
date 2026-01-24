/**
 * Tests for text utility functions.
 */

import {
  countLines,
  convertToDisplayName,
  joinArrayWithSeparators,
} from "../../../src/common/utils/text-utils";

describe("text-utils", () => {
  describe("countLines", () => {
    it("should return 1 for empty string", () => {
      expect(countLines("")).toBe(1);
    });

    it("should return 1 for single line without newline", () => {
      expect(countLines("hello world")).toBe(1);
    });

    it("should return 2 for text with one newline", () => {
      expect(countLines("hello\nworld")).toBe(2);
    });

    it("should return correct count for multiple lines", () => {
      expect(countLines("line1\nline2\nline3")).toBe(3);
    });

    it("should count trailing newline as additional line", () => {
      expect(countLines("line1\nline2\n")).toBe(3);
    });

    it("should handle multiple consecutive newlines", () => {
      expect(countLines("line1\n\n\nline4")).toBe(4);
    });

    it("should handle only newlines", () => {
      expect(countLines("\n\n\n")).toBe(4);
    });

    it("should handle Windows-style line endings (CRLF)", () => {
      // Only counts \n, not \r
      expect(countLines("line1\r\nline2\r\n")).toBe(3);
    });

    it("should handle large text efficiently", () => {
      // Create a text with 10,000 lines
      const largeText = Array(10000).fill("line content").join("\n");
      expect(countLines(largeText)).toBe(10000);
    });

    it("should handle text with special characters", () => {
      expect(countLines("🎉\n日本語\nこんにちは")).toBe(3);
    });
  });

  describe("convertToDisplayName", () => {
    it("should convert camelCase to space-separated words", () => {
      expect(convertToDisplayName("camelCaseString")).toBe("Camel Case String");
    });

    it("should handle single word", () => {
      expect(convertToDisplayName("hello")).toBe("Hello");
    });

    it("should handle already spaced words", () => {
      expect(convertToDisplayName("hello world")).toBe("Hello World");
    });

    it("should handle acronyms", () => {
      // The function only inserts spaces between lowercase-uppercase transitions
      expect(convertToDisplayName("getHTTPResponse")).toBe("Get HTTPResponse");
    });

    it("should handle empty string", () => {
      expect(convertToDisplayName("")).toBe("");
    });
  });

  describe("joinArrayWithSeparators", () => {
    it("should join with default newline separator", () => {
      expect(joinArrayWithSeparators(["a", "b", "c"])).toBe("a\nb\nc");
    });

    it("should join with custom separator", () => {
      expect(joinArrayWithSeparators(["a", "b", "c"], ", ")).toBe("a, b, c");
    });

    it("should add prefix to each line", () => {
      expect(joinArrayWithSeparators(["a", "b", "c"], "\n", "- ")).toBe("- a\n- b\n- c");
    });

    it("should handle empty array", () => {
      expect(joinArrayWithSeparators([])).toBe("");
    });

    it("should handle single item", () => {
      expect(joinArrayWithSeparators(["only"])).toBe("only");
    });

    it("should handle single item with prefix", () => {
      expect(joinArrayWithSeparators(["only"], "\n", "* ")).toBe("* only");
    });
  });
});
