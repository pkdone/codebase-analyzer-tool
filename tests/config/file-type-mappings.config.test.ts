import {
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS,
  FILENAME_TO_CANONICAL_TYPE_MAPPINGS,
  DEFAULT_FILE_TYPE,
  JAVA_FILE_TYPE,
} from "../../src/promptTemplates/prompt.types";

describe("file type mapping exports", () => {
  describe("FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS", () => {
    it("should have readonly map of file extensions to canonical types", () => {
      expect(FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS).toBeDefined();
      expect(FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS instanceof Map).toBe(true);
    });

    it("should map TypeScript/JavaScript extensions to javascript", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("ts")).toBe("javascript");
      expect(map.get("js")).toBe("javascript");
      expect(map.get("javascript")).toBe("javascript");
      expect(map.get("typescript")).toBe("javascript");
    });

    it("should map Java/Kotlin extensions to java", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("java")).toBe("java");
      expect(map.get("kt")).toBe("java");
      expect(map.get("kts")).toBe("java");
    });

    it("should map C# extensions to csharp", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("cs")).toBe("csharp");
      expect(map.get("csx")).toBe("csharp");
      expect(map.get("csharp")).toBe("csharp");
    });

    it("should map Ruby extensions to ruby", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("rb")).toBe("ruby");
      expect(map.get("ruby")).toBe("ruby");
    });

    it("should map SQL/DDL extensions to sql", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("sql")).toBe("sql");
      expect(map.get("ddl")).toBe("sql");
    });

    it("should map markdown extensions to markdown", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("md")).toBe("markdown");
      expect(map.get("markdown")).toBe("markdown");
    });

    it("should return undefined for unknown extensions", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("unknown")).toBeUndefined();
      expect(map.get("xyz")).toBeUndefined();
    });
  });

  describe("FILENAME_TO_CANONICAL_TYPE_MAPPINGS", () => {
    it("should have readonly map of filenames to canonical types", () => {
      expect(FILENAME_TO_CANONICAL_TYPE_MAPPINGS).toBeDefined();
      expect(FILENAME_TO_CANONICAL_TYPE_MAPPINGS instanceof Map).toBe(true);
    });

    it("should map common documentation filenames to markdown", () => {
      const map = FILENAME_TO_CANONICAL_TYPE_MAPPINGS;
      expect(map.get("readme")).toBe("markdown");
      expect(map.get("license")).toBe("markdown");
      expect(map.get("changelog")).toBe("markdown");
    });
  });

  describe("constant file types", () => {
    it("should have DEFAULT_FILE_TYPE as default", () => {
      expect(DEFAULT_FILE_TYPE).toBe("default");
    });

    it("should have JAVA_FILE_TYPE as java", () => {
      expect(JAVA_FILE_TYPE).toBe("java");
    });
  });

  describe("type safety", () => {
    it("should have ReadonlyMap types that prevent modification at compile time", () => {
      const map = FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;

      // The TypeScript compiler enforces immutability at compile time
      // At runtime, we can verify the maps are present and functioning
      expect(map.get("ts")).toBe("javascript");
      expect(map.get("java")).toBe("java");
    });

    it("should be defined as const object", () => {
      // Verify the config object is properly defined
      expect(DEFAULT_FILE_TYPE).toBe("default");
      expect(JAVA_FILE_TYPE).toBe("java");
    });
  });
});
