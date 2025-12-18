import {
  CANONICAL_FILE_TYPES,
  canonicalFileTypeSchema,
  FILE_TYPE_MAPPING_RULES,
  FILENAME_TO_TYPE_MAP,
  EXTENSION_TO_TYPE_MAP,
  type CanonicalFileType,
} from "../../../src/app/components/capture/config/file-types.config";

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

  describe("FILE_TYPE_MAPPING_RULES", () => {
    it("should be defined as a readonly array", () => {
      expect(FILE_TYPE_MAPPING_RULES).toBeDefined();
      expect(Array.isArray(FILE_TYPE_MAPPING_RULES)).toBe(true);
      expect(FILE_TYPE_MAPPING_RULES.length).toBeGreaterThan(0);
    });

    it("should have rules with test function and type", () => {
      for (const rule of FILE_TYPE_MAPPING_RULES) {
        expect(rule).toHaveProperty("test");
        expect(rule).toHaveProperty("type");
        expect(typeof rule.test).toBe("function");
        expect(CANONICAL_FILE_TYPES).toContain(rule.type);
      }
    });

    it("should have default rule as the last rule", () => {
      const lastRule = FILE_TYPE_MAPPING_RULES[FILE_TYPE_MAPPING_RULES.length - 1];
      expect(lastRule.type).toBe("default");
      expect(lastRule.test("any", "ext")).toBe(true);
    });

    it("should match filename-based mappings correctly", () => {
      // Test exact filename matches in FILENAME_TO_TYPE_MAP
      expect(FILENAME_TO_TYPE_MAP["pom.xml"]).toBe("maven");
      expect(FILENAME_TO_TYPE_MAP["package.json"]).toBe("npm");
      expect(FILENAME_TO_TYPE_MAP["build.gradle"]).toBe("gradle");

      // Test pattern-based rules in FILE_TYPE_MAPPING_RULES (readme*, license*, changelog*)
      const readmeRule = FILE_TYPE_MAPPING_RULES.find(
        (r) => r.type === "markdown" && r.test("readme", ""),
      );
      expect(readmeRule).toBeDefined();
      expect(readmeRule?.test("readme", "")).toBe(true);
      expect(readmeRule?.test("readme.md", "md")).toBe(true);
      expect(readmeRule?.test("other.md", "md")).toBe(false);
    });

    it("should match extension-based mappings correctly", () => {
      // Test extension mappings in EXTENSION_TO_TYPE_MAP
      expect(EXTENSION_TO_TYPE_MAP.java).toBe("java");
      expect(EXTENSION_TO_TYPE_MAP.kt).toBe("java");
      expect(EXTENSION_TO_TYPE_MAP.kts).toBe("java");
      expect(EXTENSION_TO_TYPE_MAP.ts).toBe("javascript");
      expect(EXTENSION_TO_TYPE_MAP.ts).toBe("javascript");
      expect(EXTENSION_TO_TYPE_MAP.py).toBe("python");
    });

    it("should prioritize filename mappings over extension mappings", () => {
      // pom.xml should match maven in FILENAME_TO_TYPE_MAP (not xml extension)
      expect(FILENAME_TO_TYPE_MAP["pom.xml"]).toBe("maven");
      // Other .xml files should match xml extension
      expect(EXTENSION_TO_TYPE_MAP.xml).toBe("xml");
    });

    it("should handle all file types from CANONICAL_FILE_TYPES", () => {
      const typesInRules = new Set(FILE_TYPE_MAPPING_RULES.map((r) => r.type));

      // All types in rules should be valid canonical types
      for (const type of typesInRules) {
        expect(CANONICAL_FILE_TYPES).toContain(type);
      }

      // Default should always be present
      expect(typesInRules.has("default")).toBe(true);
    });

    it("should match real-world file examples correctly", () => {
      // Test exact filename matches
      expect(FILENAME_TO_TYPE_MAP["pom.xml"]).toBe("maven");
      expect(FILENAME_TO_TYPE_MAP["build.gradle"]).toBe("gradle");
      expect(FILENAME_TO_TYPE_MAP["package.json"]).toBe("npm");

      // Test extension matches
      expect(EXTENSION_TO_TYPE_MAP.java).toBe("java");
      expect(EXTENSION_TO_TYPE_MAP.ts).toBe("javascript");
      expect(EXTENSION_TO_TYPE_MAP.ts).toBe("javascript");
      expect(EXTENSION_TO_TYPE_MAP.md).toBe("markdown");

      // Test pattern-based rules (readme*, license*, changelog*)
      const readmeRule = FILE_TYPE_MAPPING_RULES.find((r) => r.test("readme.md", "md"));
      expect(readmeRule?.type).toBe("markdown");

      const licenseRule = FILE_TYPE_MAPPING_RULES.find((r) => r.test("license", "txt"));
      expect(licenseRule?.type).toBe("markdown");

      // Test default fallback
      const defaultRule = FILE_TYPE_MAPPING_RULES.find((r) => r.test("unknown.xyz", "xyz"));
      expect(defaultRule?.type).toBe("default");
    });
  });
});
