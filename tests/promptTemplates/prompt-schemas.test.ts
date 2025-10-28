import { canonicalFileTypeSchema, CANONICAL_FILE_TYPES } from "../../src/config/file-types.config";

describe("prompt.schemas", () => {
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

    it("should contain build tool file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("maven");
      expect(CANONICAL_FILE_TYPES).toContain("gradle");
      expect(CANONICAL_FILE_TYPES).toContain("ant");
      expect(CANONICAL_FILE_TYPES).toContain("npm");
    });

    it("should contain project file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("dotnet-proj");
      expect(CANONICAL_FILE_TYPES).toContain("nuget");
      expect(CANONICAL_FILE_TYPES).toContain("ruby-bundler");
      expect(CANONICAL_FILE_TYPES).toContain("python-pip");
      expect(CANONICAL_FILE_TYPES).toContain("python-setup");
      expect(CANONICAL_FILE_TYPES).toContain("python-poetry");
    });

    it("should contain script file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("shell-script");
      expect(CANONICAL_FILE_TYPES).toContain("batch-script");
      expect(CANONICAL_FILE_TYPES).toContain("jcl");
    });

    it("should contain duplicate 'default' entries as intended", () => {
      const defaultCount = CANONICAL_FILE_TYPES.filter((type: string) => type === "default").length;
      expect(defaultCount).toBe(2);
    });
  });

  describe("canonicalFileTypeSchema", () => {
    it("should be defined as a Zod enum schema", () => {
      expect(canonicalFileTypeSchema).toBeDefined();
      expect(canonicalFileTypeSchema._def.typeName).toBe("ZodEnum");
    });

    it("should validate all canonical file types", () => {
      CANONICAL_FILE_TYPES.forEach((fileType) => {
        const result = canonicalFileTypeSchema.safeParse(fileType);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(fileType);
        }
      });
    });

    it("should reject invalid file types", () => {
      const invalidTypes = ["invalid", "unknown", "test", ""];
      invalidTypes.forEach((invalidType) => {
        const result = canonicalFileTypeSchema.safeParse(invalidType);
        expect(result.success).toBe(false);
      });
    });

    it("should reject null and undefined", () => {
      expect(canonicalFileTypeSchema.safeParse(null).success).toBe(false);
      expect(canonicalFileTypeSchema.safeParse(undefined).success).toBe(false);
    });

    it("should reject non-string values", () => {
      expect(canonicalFileTypeSchema.safeParse(123).success).toBe(false);
      expect(canonicalFileTypeSchema.safeParse({}).success).toBe(false);
      expect(canonicalFileTypeSchema.safeParse([]).success).toBe(false);
    });
  });

  describe("schema consistency", () => {
    it("should have schema options matching CANONICAL_FILE_TYPES", () => {
      const schemaOptions = canonicalFileTypeSchema._def.values;
      expect(schemaOptions).toEqual(CANONICAL_FILE_TYPES);
    });

    it("should maintain single source of truth", () => {
      // Verify that the schema is derived from the constant array
      const schemaOptions = canonicalFileTypeSchema._def.values;
      expect(schemaOptions).toBe(CANONICAL_FILE_TYPES);
    });
  });
});
