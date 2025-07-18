import { countLines, joinArrayWithSeparators } from "../../../src/common/utils/text-utils";

describe("Text utilities", () => {
  describe("countLines", () => {
    test("counts lines in mixed content", () => {
      expect(countLines("\none and\n two, 40 here\n yep \t what ?\n this ")).toBe(5);
    });
  });

  describe("joinArrayWithSeparators", () => {
    test("default separators", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines)).toBe("line1\nline2\nline3");
    });

    test("custom separators", () => {
      const lines = ["line1", "line2", "line3"];
      expect(joinArrayWithSeparators(lines, ", ", "> ")).toBe("> line1, > line2, > line3");
    });

    test("empty array", () => {
      expect(joinArrayWithSeparators([])).toBe("");
    });
  });
});
