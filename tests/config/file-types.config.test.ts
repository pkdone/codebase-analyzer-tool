import {
  CANONICAL_FILE_TYPES,
  canonicalFileTypeSchema,
  type CanonicalFileType,
} from "../../src/config/file-types.config";

describe("file-types.config", () => {
  describe("CANONICAL_FILE_TYPES", () => {
    it("should be defined as a readonly array", () => {
      expect(CANONICAL_FILE_TYPES).toBeDefined();
      expect(Array.isArray(CANONICAL_FILE_TYPES)).toBe(true);
    });

    it("should contain expected file types", () => {
      const expectedTypes = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "ruby",
        "python",
      ];

      for (const type of expectedTypes) {
        expect(CANONICAL_FILE_TYPES).toContain(type);
      }
    });

    it("should have default type", () => {
      expect(CANONICAL_FILE_TYPES).toContain("default");
      // Note: default appears twice in the array, which is intentional
      const defaultCount = CANONICAL_FILE_TYPES.filter((t) => t === "default").length;
      expect(defaultCount).toBeGreaterThanOrEqual(1);
    });

    it("should have build tool file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("maven");
      expect(CANONICAL_FILE_TYPES).toContain("gradle");
      expect(CANONICAL_FILE_TYPES).toContain("ant");
      expect(CANONICAL_FILE_TYPES).toContain("npm");
    });

    it("should have package manager file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("nuget");
      expect(CANONICAL_FILE_TYPES).toContain("ruby-bundler");
      expect(CANONICAL_FILE_TYPES).toContain("python-pip");
      expect(CANONICAL_FILE_TYPES).toContain("python-setup");
      expect(CANONICAL_FILE_TYPES).toContain("python-poetry");
    });
  });

  describe("CanonicalFileType", () => {
    it("should be a valid type that can be assigned from CANONICAL_FILE_TYPES", () => {
      const testType: CanonicalFileType = CANONICAL_FILE_TYPES[0];
      expect(testType).toBeDefined();
    });

    it("should accept all values from CANONICAL_FILE_TYPES", () => {
      for (const type of CANONICAL_FILE_TYPES) {
        const testType: CanonicalFileType = type;
        expect(testType).toBe(type);
      }
    });
  });

  describe("canonicalFileTypeSchema", () => {
    it("should be a Zod enum schema", () => {
      expect(canonicalFileTypeSchema).toBeDefined();
      expect(typeof canonicalFileTypeSchema.parse).toBe("function");
    });

    it("should validate all CANONICAL_FILE_TYPES", () => {
      for (const type of CANONICAL_FILE_TYPES) {
        expect(() => canonicalFileTypeSchema.parse(type)).not.toThrow();
        expect(canonicalFileTypeSchema.parse(type)).toBe(type);
      }
    });

    it("should reject invalid file types", () => {
      expect(() => canonicalFileTypeSchema.parse("invalid-type")).toThrow();
      expect(() => canonicalFileTypeSchema.parse("")).toThrow();
      expect(() => canonicalFileTypeSchema.parse(null)).toThrow();
      expect(() => canonicalFileTypeSchema.parse(undefined)).toThrow();
    });
  });
});
