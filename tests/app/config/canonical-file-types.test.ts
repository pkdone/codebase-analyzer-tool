import {
  CANONICAL_FILE_TYPES,
  type CanonicalFileType,
  canonicalFileTypeSchema,
} from "../../../src/app/config/canonical-file-types";

describe("canonical-file-types", () => {
  describe("CANONICAL_FILE_TYPES", () => {
    it("should be defined and non-empty", () => {
      expect(CANONICAL_FILE_TYPES).toBeDefined();
      expect(Array.isArray(CANONICAL_FILE_TYPES)).toBe(true);
      expect(CANONICAL_FILE_TYPES.length).toBeGreaterThan(0);
    });

    it("should include essential programming language types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("java");
      expect(CANONICAL_FILE_TYPES).toContain("javascript");
      expect(CANONICAL_FILE_TYPES).toContain("python");
      expect(CANONICAL_FILE_TYPES).toContain("csharp");
      expect(CANONICAL_FILE_TYPES).toContain("ruby");
    });

    it("should include build system types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("maven");
      expect(CANONICAL_FILE_TYPES).toContain("gradle");
      expect(CANONICAL_FILE_TYPES).toContain("npm");
      expect(CANONICAL_FILE_TYPES).toContain("ant");
    });

    it("should include the default fallback type", () => {
      expect(CANONICAL_FILE_TYPES).toContain("default");
    });

    it("should include C/C++ types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("c");
      expect(CANONICAL_FILE_TYPES).toContain("cpp");
      expect(CANONICAL_FILE_TYPES).toContain("makefile");
    });

    it("should not have duplicates", () => {
      const uniqueTypes = new Set(CANONICAL_FILE_TYPES);
      expect(uniqueTypes.size).toBe(CANONICAL_FILE_TYPES.length);
    });
  });

  describe("CanonicalFileType", () => {
    it("should accept valid file types", () => {
      const validType: CanonicalFileType = "java";
      expect(validType).toBe("java");
    });

    it("should be usable in type narrowing", () => {
      const checkType = (type: string): type is CanonicalFileType => {
        return (CANONICAL_FILE_TYPES as readonly string[]).includes(type);
      };

      expect(checkType("java")).toBe(true);
      expect(checkType("javascript")).toBe(true);
      expect(checkType("unknown-type")).toBe(false);
    });
  });

  describe("canonicalFileTypeSchema", () => {
    it("should validate valid file types", () => {
      const result = canonicalFileTypeSchema.safeParse("java");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("java");
      }
    });

    it("should reject invalid file types", () => {
      const result = canonicalFileTypeSchema.safeParse("invalid-type");
      expect(result.success).toBe(false);
    });

    it("should validate all canonical file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        const result = canonicalFileTypeSchema.safeParse(fileType);
        expect(result.success).toBe(true);
      }
    });

    it("should reject non-string values", () => {
      expect(canonicalFileTypeSchema.safeParse(123).success).toBe(false);
      expect(canonicalFileTypeSchema.safeParse(null).success).toBe(false);
      expect(canonicalFileTypeSchema.safeParse(undefined).success).toBe(false);
      expect(canonicalFileTypeSchema.safeParse({}).success).toBe(false);
    });
  });
});
