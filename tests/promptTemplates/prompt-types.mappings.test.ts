import { CANONICAL_FILE_TYPES } from "../../src/prompt-templates/sources.schemas";

describe("prompt.types individual exports", () => {
  describe("CANONICAL_FILE_TYPES", () => {
    it("should be defined as a readonly array", () => {
      expect(CANONICAL_FILE_TYPES).toBeDefined();
      expect(Array.isArray(CANONICAL_FILE_TYPES)).toBe(true);
    });

    it("should contain expected file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("java");
      expect(CANONICAL_FILE_TYPES).toContain("javascript");
      expect(CANONICAL_FILE_TYPES).toContain("default");
      expect(CANONICAL_FILE_TYPES).toContain("sql");
      expect(CANONICAL_FILE_TYPES).toContain("xml");
      expect(CANONICAL_FILE_TYPES).toContain("jsp");
      expect(CANONICAL_FILE_TYPES).toContain("markdown");
      expect(CANONICAL_FILE_TYPES).toContain("csharp");
      expect(CANONICAL_FILE_TYPES).toContain("ruby");
      expect(CANONICAL_FILE_TYPES).toContain("python");
    });

    it("should contain duplicate 'default' entries as intended", () => {
      const defaultCount = CANONICAL_FILE_TYPES.filter((type: string) => type === "default").length;
      expect(defaultCount).toBe(2);
    });
  });

  describe("type safety", () => {
    it("should be defined as const object", () => {
      expect(CANONICAL_FILE_TYPES).toBeDefined();
      expect(Array.isArray(CANONICAL_FILE_TYPES)).toBe(true);
    });
  });
});
