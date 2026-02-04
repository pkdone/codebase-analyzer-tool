import { countLines } from "../../../src/common/utils/text-utils";

describe("text-analysis", () => {
  describe("countLines", () => {
    test("should count lines in mixed content", () => {
      expect(countLines("\none and\n two, 40 here\n yep \t what ?\n this ")).toBe(5);
    });

    test("should count single line", () => {
      expect(countLines("single line")).toBe(1);
    });

    test("should count empty string as zero lines", () => {
      expect(countLines("")).toBe(0);
    });

    test("should count multiple newlines", () => {
      expect(countLines("\n\n\n")).toBe(4);
    });

    test("should count lines with carriage returns", () => {
      expect(countLines("line1\nline2\nline3")).toBe(3);
    });

    test("should handle text with only newline", () => {
      expect(countLines("\n")).toBe(2);
    });

    test("should count lines in code block", () => {
      const code = `function test() {
  console.log("hello");
  return true;
}`;
      expect(countLines(code)).toBe(4);
    });

    test("should handle trailing newline", () => {
      expect(countLines("line1\nline2\n")).toBe(3);
    });
  });
});
