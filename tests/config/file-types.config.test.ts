import {
  CANONICAL_FILE_TYPES,
  canonicalFileTypeSchema,
  FILE_TYPE_MAPPING_RULES,
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

    it("should match filename-based rules correctly", () => {
      // Test pom.xml -> maven
      const mavenRule = FILE_TYPE_MAPPING_RULES.find((r) => r.type === "maven");
      expect(mavenRule).toBeDefined();
      expect(mavenRule?.test("pom.xml", "xml")).toBe(true);
      expect(mavenRule?.test("other.xml", "xml")).toBe(false);

      // Test package.json -> npm
      const npmRule = FILE_TYPE_MAPPING_RULES.find((r) => r.type === "npm");
      expect(npmRule).toBeDefined();
      expect(npmRule?.test("package.json", "json")).toBe(true);
      expect(npmRule?.test("other.json", "json")).toBe(false);

      // Test README -> markdown
      const readmeRule = FILE_TYPE_MAPPING_RULES.find(
        (r) => r.type === "markdown" && r.test("readme", ""),
      );
      expect(readmeRule).toBeDefined();
      expect(readmeRule?.test("readme", "")).toBe(true);
      expect(readmeRule?.test("readme.md", "md")).toBe(true);
      expect(readmeRule?.test("other.md", "md")).toBe(false);
    });

    it("should match extension-based rules correctly", () => {
      // Test .java extension -> java
      const javaRule = FILE_TYPE_MAPPING_RULES.find(
        (r) => r.type === "java" && !r.test("pom.xml", "xml"),
      );
      expect(javaRule).toBeDefined();
      expect(javaRule?.test("Test.java", "java")).toBe(true);
      expect(javaRule?.test("Test.kt", "kt")).toBe(true);
      expect(javaRule?.test("Test.kts", "kts")).toBe(true);
      expect(javaRule?.test("Test.js", "js")).toBe(false);

      // Test .js/.ts extension -> javascript
      const jsRule = FILE_TYPE_MAPPING_RULES.find((r) => r.type === "javascript");
      expect(jsRule).toBeDefined();
      expect(jsRule?.test("test.js", "js")).toBe(true);
      expect(jsRule?.test("test.ts", "ts")).toBe(true);
      expect(jsRule?.test("test.java", "java")).toBe(false);
    });

    it("should prioritize filename rules over extension rules", () => {
      // pom.xml should match maven rule (filename) not xml rule (extension)
      const mavenRule = FILE_TYPE_MAPPING_RULES.find((r) => r.type === "maven");
      const xmlRule = FILE_TYPE_MAPPING_RULES.find((r) => r.type === "xml");

      expect(mavenRule).toBeDefined();
      expect(xmlRule).toBeDefined();

      // Find the index of each rule
      const mavenIndex = FILE_TYPE_MAPPING_RULES.indexOf(mavenRule!);
      const xmlIndex = FILE_TYPE_MAPPING_RULES.indexOf(xmlRule!);

      // Maven rule should come before xml rule
      expect(mavenIndex).toBeLessThan(xmlIndex);

      // pom.xml should match maven rule
      expect(mavenRule?.test("pom.xml", "xml")).toBe(true);
      // But other .xml files should match xml rule
      expect(xmlRule?.test("config.xml", "xml")).toBe(true);
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
      const testCases = [
        { filename: "pom.xml", extension: "xml", expectedType: "maven" },
        { filename: "build.gradle", extension: "gradle", expectedType: "gradle" },
        { filename: "package.json", extension: "json", expectedType: "npm" },
        { filename: "Test.java", extension: "java", expectedType: "java" },
        { filename: "app.js", extension: "js", expectedType: "javascript" },
        { filename: "component.ts", extension: "ts", expectedType: "javascript" },
        { filename: "README.md", extension: "md", expectedType: "markdown" },
        { filename: "LICENSE", extension: "txt", expectedType: "markdown" },
        { filename: "unknown.xyz", extension: "xyz", expectedType: "default" },
      ];

      for (const testCase of testCases) {
        const filename = testCase.filename.toLowerCase();
        const extension = testCase.extension.toLowerCase();

        // Find the first matching rule
        const matchingRule = FILE_TYPE_MAPPING_RULES.find((r) => r.test(filename, extension));
        expect(matchingRule).toBeDefined();
        expect(matchingRule?.type).toBe(testCase.expectedType);
      }
    });
  });
});
