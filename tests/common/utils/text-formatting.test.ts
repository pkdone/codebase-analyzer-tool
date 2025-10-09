import {
  convertToDisplayName,
  joinArrayWithSeparators,
} from "../../../src/common/utils/text-formatting";

describe("text-formatting", () => {
  describe("convertToDisplayName", () => {
    test("should convert camelCase to Display Name", () => {
      expect(convertToDisplayName("camelCaseString")).toBe("Camel Case String");
    });

    test("should handle single word", () => {
      expect(convertToDisplayName("word")).toBe("Word");
    });

    test("should handle already capitalized words", () => {
      expect(convertToDisplayName("AlreadyCapitalized")).toBe("Already Capitalized");
    });

    test("should handle lowercase", () => {
      expect(convertToDisplayName("lowercase")).toBe("Lowercase");
    });

    test("should handle multiple consecutive capitals", () => {
      expect(convertToDisplayName("HTTPSConnection")).toBe("HTTPSConnection");
    });

    test("should handle numbers in the string", () => {
      expect(convertToDisplayName("field1Test")).toBe("Field1Test");
    });

    test("should handle empty string", () => {
      expect(convertToDisplayName("")).toBe("");
    });

    test("should handle string with spaces", () => {
      expect(convertToDisplayName("already spaced")).toBe("Already Spaced");
    });
  });

  describe("joinArrayWithSeparators", () => {
    test("should join with default newline separator", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines)).toBe("line1\nline2\nline3");
    });

    test("should join with custom separator", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines, ", ")).toBe("line1, line2, line3");
    });

    test("should add custom prefix to each line", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines, "\n", "> ")).toBe("> line1\n> line2\n> line3");
    });

    test("should handle custom separator and prefix together", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines, ", ", "> ")).toBe("> line1, > line2, > line3");
    });

    test("should handle empty array", () => {
      expect(joinArrayWithSeparators([])).toBe("");
    });

    test("should handle single element array", () => {
      expect(joinArrayWithSeparators(["single"])).toBe("single");
    });

    test("should handle single element with prefix", () => {
      expect(joinArrayWithSeparators(["single"], "\n", "- ")).toBe("- single");
    });

    test("should handle empty strings in array", () => {
      const lines = ["", "line2", ""];
      expect(joinArrayWithSeparators(lines)).toBe("\nline2\n");
    });
  });
});
