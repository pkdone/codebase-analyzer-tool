import {
  isJsonKeyword,
  looksLikeStrayText,
  looksLikeStrayArrayPrefix,
  looksLikeStrayPropertyPrefix,
  looksLikeDescriptiveText,
} from "../../../../../src/common/llm/json-processing/utils/stray-text-detection";

describe("stray-text-detection", () => {
  describe("isJsonKeyword", () => {
    it("should return true for JSON keywords", () => {
      expect(isJsonKeyword("true")).toBe(true);
      expect(isJsonKeyword("false")).toBe(true);
      expect(isJsonKeyword("null")).toBe(true);
      expect(isJsonKeyword("undefined")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isJsonKeyword("TRUE")).toBe(true);
      expect(isJsonKeyword("False")).toBe(true);
      expect(isJsonKeyword("NULL")).toBe(true);
    });

    it("should return false for non-keywords", () => {
      expect(isJsonKeyword("hello")).toBe(false);
      expect(isJsonKeyword("value")).toBe(false);
      expect(isJsonKeyword("123")).toBe(false);
    });
  });

  describe("looksLikeStrayText", () => {
    it("should return false for empty text", () => {
      expect(looksLikeStrayText("")).toBe(false);
      expect(looksLikeStrayText("   ")).toBe(false);
    });

    it("should return false for JSON keywords", () => {
      expect(looksLikeStrayText("true")).toBe(false);
      expect(looksLikeStrayText("false")).toBe(false);
      expect(looksLikeStrayText("null")).toBe(false);
    });

    it("should return true for single characters", () => {
      expect(looksLikeStrayText("a")).toBe(true);
      expect(looksLikeStrayText("x")).toBe(true);
      expect(looksLikeStrayText("Z")).toBe(true);
    });

    it("should return true for short lowercase words", () => {
      expect(looksLikeStrayText("stray")).toBe(true);
      expect(looksLikeStrayText("hello")).toBe(true);
      expect(looksLikeStrayText("word")).toBe(true);
    });

    it("should detect sentence fragments when enabled", () => {
      const options = { detectSentences: true };
      expect(looksLikeStrayText("this is some text", options)).toBe(true);
      expect(looksLikeStrayText("running on machine", options)).toBe(true);
    });

    it("should detect YAML patterns when enabled", () => {
      const options = { detectYamlPatterns: true };
      expect(looksLikeStrayText("key: value", options)).toBe(true);
      expect(looksLikeStrayText("extra_text: something", options)).toBe(true);
    });

    it("should detect assignment patterns when enabled", () => {
      const options = { detectAssignmentPatterns: true };
      expect(looksLikeStrayText("var=value", options)).toBe(true);
      expect(looksLikeStrayText("config = 123", options)).toBe(true);
    });

    it("should respect maxLength option", () => {
      expect(looksLikeStrayText("verylongwordhere", { maxLength: 10 })).toBe(false);
      expect(looksLikeStrayText("shortword", { maxLength: 10 })).toBe(true);
    });
  });

  describe("looksLikeStrayArrayPrefix", () => {
    it("should return false for JSON keywords", () => {
      expect(looksLikeStrayArrayPrefix("true")).toBe(false);
      expect(looksLikeStrayArrayPrefix("false")).toBe(false);
      expect(looksLikeStrayArrayPrefix("null")).toBe(false);
    });

    it("should return true for short lowercase words", () => {
      expect(looksLikeStrayArrayPrefix("a")).toBe(true);
      expect(looksLikeStrayArrayPrefix("from")).toBe(true);
      expect(looksLikeStrayArrayPrefix("import")).toBe(true);
    });

    it("should return false for words longer than 7 chars", () => {
      expect(looksLikeStrayArrayPrefix("something")).toBe(false);
      expect(looksLikeStrayArrayPrefix("longword")).toBe(false);
    });

    it("should return false for mixed case words", () => {
      expect(looksLikeStrayArrayPrefix("Hello")).toBe(false);
      expect(looksLikeStrayArrayPrefix("UPPER")).toBe(false);
    });
  });

  describe("looksLikeStrayPropertyPrefix", () => {
    it("should return false for JSON keywords", () => {
      expect(looksLikeStrayPropertyPrefix("true")).toBe(false);
      expect(looksLikeStrayPropertyPrefix("false")).toBe(false);
    });

    it("should return true for short lowercase words (2-10 chars)", () => {
      expect(looksLikeStrayPropertyPrefix("ab")).toBe(true);
      expect(looksLikeStrayPropertyPrefix("stray")).toBe(true);
      expect(looksLikeStrayPropertyPrefix("commentary")).toBe(true);
    });

    it("should return false for single character", () => {
      expect(looksLikeStrayPropertyPrefix("a")).toBe(false);
    });

    it("should return false for words longer than 10 chars", () => {
      expect(looksLikeStrayPropertyPrefix("verylongword")).toBe(false);
    });
  });

  describe("looksLikeDescriptiveText", () => {
    it("should return false for text with JSON structural characters", () => {
      expect(looksLikeDescriptiveText('{"key": "value"}')).toBe(false);
      expect(looksLikeDescriptiveText("array: []")).toBe(false);
    });

    it("should return true for text with 3+ words", () => {
      expect(looksLikeDescriptiveText("this is commentary")).toBe(true);
      expect(looksLikeDescriptiveText("some longer sentence here")).toBe(true);
    });

    it("should return true for single words with punctuation", () => {
      expect(looksLikeDescriptiveText("tribulations.")).toBe(true);
      expect(looksLikeDescriptiveText("hello!")).toBe(true);
      expect(looksLikeDescriptiveText("what?")).toBe(true);
    });

    it("should return true for prose-like text", () => {
      expect(looksLikeDescriptiveText("this is a longer piece of text")).toBe(true);
    });

    it("should return false for short text without punctuation", () => {
      expect(looksLikeDescriptiveText("ab")).toBe(false);
    });
  });
});
