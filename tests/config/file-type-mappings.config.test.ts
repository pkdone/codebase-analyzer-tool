import { fileTypeMappingsConfig } from "../../src/config/file-type-mappings.config";
import type { CanonicalFileType } from "../../src/prompt-templates/types/sources.types";

describe("file-type-mappings.config", () => {
  describe("fileTypeMappingsConfig", () => {
    it("should be defined as a readonly config object", () => {
      expect(fileTypeMappingsConfig).toBeDefined();
      expect(typeof fileTypeMappingsConfig).toBe("object");
    });

    it("should have all expected properties", () => {
      expect(fileTypeMappingsConfig).toHaveProperty("FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS");
      expect(fileTypeMappingsConfig).toHaveProperty("FILENAME_TO_CANONICAL_TYPE_MAPPINGS");
      expect(fileTypeMappingsConfig).toHaveProperty("DEFAULT_FILE_TYPE");
      expect(fileTypeMappingsConfig).toHaveProperty("JAVA_FILE_TYPE");
    });
  });

  describe("FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS", () => {
    const mappings = fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;

    it("should be defined as a readonly map", () => {
      expect(mappings).toBeDefined();
      expect(mappings instanceof Map).toBe(true);
    });

    it("should map TypeScript/JavaScript extensions to javascript", () => {
      expect(mappings.get("ts")).toBe("javascript");
      expect(mappings.get("js")).toBe("javascript");
      expect(mappings.get("javascript")).toBe("javascript");
      expect(mappings.get("typescript")).toBe("javascript");
    });

    it("should map Java/Kotlin extensions to java", () => {
      expect(mappings.get("java")).toBe("java");
      expect(mappings.get("kt")).toBe("java");
      expect(mappings.get("kts")).toBe("java");
    });

    it("should map C# extensions to csharp", () => {
      expect(mappings.get("cs")).toBe("csharp");
      expect(mappings.get("csx")).toBe("csharp");
      expect(mappings.get("csharp")).toBe("csharp");
    });

    it("should map Ruby extensions to ruby", () => {
      expect(mappings.get("rb")).toBe("ruby");
      expect(mappings.get("ruby")).toBe("ruby");
    });

    it("should map Python extensions to python", () => {
      expect(mappings.get("py")).toBe("python");
    });

    it("should map SQL/DDL extensions to sql", () => {
      expect(mappings.get("sql")).toBe("sql");
      expect(mappings.get("ddl")).toBe("sql");
    });

    it("should map XML extensions to xml", () => {
      expect(mappings.get("xml")).toBe("xml");
    });

    it("should map JSP extensions to jsp", () => {
      expect(mappings.get("jsp")).toBe("jsp");
    });

    it("should map markdown extensions to markdown", () => {
      expect(mappings.get("md")).toBe("markdown");
      expect(mappings.get("markdown")).toBe("markdown");
    });

    it("should map .NET project extensions to dotnet-proj", () => {
      expect(mappings.get("csproj")).toBe("dotnet-proj");
      expect(mappings.get("vbproj")).toBe("dotnet-proj");
      expect(mappings.get("fsproj")).toBe("dotnet-proj");
    });

    it("should map shell script extensions to shell-script", () => {
      expect(mappings.get("sh")).toBe("shell-script");
      expect(mappings.get("bash")).toBe("shell-script");
    });

    it("should map batch script extensions to batch-script", () => {
      expect(mappings.get("bat")).toBe("batch-script");
      expect(mappings.get("cmd")).toBe("batch-script");
    });

    it("should map JCL extensions to jcl", () => {
      expect(mappings.get("jcl")).toBe("jcl");
    });

    it("should return undefined for unknown extensions", () => {
      expect(mappings.get("unknown")).toBeUndefined();
      expect(mappings.get("xyz")).toBeUndefined();
      expect(mappings.get("")).toBeUndefined();
    });

    it("should have all values as valid canonical file types", () => {
      const validTypes: CanonicalFileType[] = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "ruby",
        "maven",
        "gradle",
        "ant",
        "npm",
        "python",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "shell-script",
        "batch-script",
        "jcl",
      ];

      mappings.forEach((value) => {
        expect(validTypes).toContain(value);
      });
    });
  });

  describe("FILENAME_TO_CANONICAL_TYPE_MAPPINGS", () => {
    const mappings = fileTypeMappingsConfig.FILENAME_TO_CANONICAL_TYPE_MAPPINGS;

    it("should be defined as a readonly map", () => {
      expect(mappings).toBeDefined();
      expect(mappings instanceof Map).toBe(true);
    });

    it("should map common documentation filenames to markdown", () => {
      expect(mappings.get("readme")).toBe("markdown");
      expect(mappings.get("license")).toBe("markdown");
      expect(mappings.get("changelog")).toBe("markdown");
    });

    it("should map Java build tool filenames", () => {
      expect(mappings.get("pom.xml")).toBe("maven");
      expect(mappings.get("build.gradle")).toBe("gradle");
      expect(mappings.get("build.gradle.kts")).toBe("gradle");
      expect(mappings.get("build.xml")).toBe("ant");
    });

    it("should map JavaScript/Node.js filenames", () => {
      expect(mappings.get("package.json")).toBe("npm");
      expect(mappings.get("package-lock.json")).toBe("npm");
      expect(mappings.get("yarn.lock")).toBe("npm");
    });

    it("should map .NET filenames", () => {
      expect(mappings.get("packages.config")).toBe("nuget");
    });

    it("should map Ruby filenames", () => {
      expect(mappings.get("Gemfile")).toBe("ruby-bundler");
      expect(mappings.get("Gemfile.lock")).toBe("ruby-bundler");
    });

    it("should map Python filenames", () => {
      expect(mappings.get("requirements.txt")).toBe("python-pip");
      expect(mappings.get("setup.py")).toBe("python-setup");
      expect(mappings.get("pyproject.toml")).toBe("python-poetry");
      expect(mappings.get("Pipfile")).toBe("python-pip");
      expect(mappings.get("Pipfile.lock")).toBe("python-pip");
    });

    it("should map shell script filenames", () => {
      expect(mappings.get("crontab")).toBe("shell-script");
    });

    it("should return undefined for unknown filenames", () => {
      expect(mappings.get("unknown")).toBeUndefined();
      expect(mappings.get("test.txt")).toBeUndefined();
      expect(mappings.get("")).toBeUndefined();
    });

    it("should have all values as valid canonical file types", () => {
      const validTypes: CanonicalFileType[] = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "ruby",
        "maven",
        "gradle",
        "ant",
        "npm",
        "python",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "shell-script",
        "batch-script",
        "jcl",
      ];

      mappings.forEach((value) => {
        expect(validTypes).toContain(value);
      });
    });
  });

  describe("constant file types", () => {
    it("should have DEFAULT_FILE_TYPE as default", () => {
      expect(fileTypeMappingsConfig.DEFAULT_FILE_TYPE).toBe("default");
    });

    it("should have JAVA_FILE_TYPE as java", () => {
      expect(fileTypeMappingsConfig.JAVA_FILE_TYPE).toBe("java");
    });

    it("should have correct types for constants", () => {
      const defaultType: CanonicalFileType = fileTypeMappingsConfig.DEFAULT_FILE_TYPE;
      const javaType: CanonicalFileType = fileTypeMappingsConfig.JAVA_FILE_TYPE;

      expect(defaultType).toBe("default");
      expect(javaType).toBe("java");
    });
  });

  describe("config immutability", () => {
    it("should have readonly maps that prevent modification at compile time", () => {
      const extensionMap = fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS;
      const filenameMap = fileTypeMappingsConfig.FILENAME_TO_CANONICAL_TYPE_MAPPINGS;

      // The TypeScript compiler enforces immutability at compile time
      // At runtime, we can verify the maps are present and functioning
      expect(extensionMap.get("ts")).toBe("javascript");
      expect(filenameMap.get("readme")).toBe("markdown");
    });

    it("should be defined as const object", () => {
      // Verify the config object is properly defined
      expect(fileTypeMappingsConfig.DEFAULT_FILE_TYPE).toBe("default");
      expect(fileTypeMappingsConfig.JAVA_FILE_TYPE).toBe("java");
    });
  });

  describe("config structure", () => {
    it("should follow the established config pattern", () => {
      // Verify the config follows the same pattern as other config files
      expect(typeof fileTypeMappingsConfig).toBe("object");
      expect(Object.keys(fileTypeMappingsConfig).length).toBeGreaterThan(0);
    });

    it("should have consistent naming conventions", () => {
      const keys = Object.keys(fileTypeMappingsConfig);
      keys.forEach((key) => {
        // All keys should be UPPER_SNAKE_CASE
        expect(key).toMatch(/^[A-Z_]+$/);
      });
    });
  });
});
