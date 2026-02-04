import {
  FILE_TYPE_REGISTRY,
  FILENAME_TYPE_REGISTRY,
  deriveCodeFileExtensions,
  deriveExtensionToTypeMap,
  getFileTypeEntry,
  isCodeExtension,
  getCanonicalTypeForExtension,
  getCanonicalTypeForFilename,
} from "../../../../src/app/config/file-handling/file-type-registry";

describe("FILE_TYPE_REGISTRY", () => {
  describe("registry structure", () => {
    it("should have entries for common programming languages", () => {
      expect(FILE_TYPE_REGISTRY.java).toBeDefined();
      expect(FILE_TYPE_REGISTRY.ts).toBeDefined();
      expect(FILE_TYPE_REGISTRY.py).toBeDefined();
      expect(FILE_TYPE_REGISTRY.rb).toBeDefined();
      expect(FILE_TYPE_REGISTRY.cs).toBeDefined();
      expect(FILE_TYPE_REGISTRY.c).toBeDefined();
      expect(FILE_TYPE_REGISTRY.cpp).toBeDefined();
    });

    it("should mark programming language extensions as code files", () => {
      expect(FILE_TYPE_REGISTRY.java.isCode).toBe(true);
      expect(FILE_TYPE_REGISTRY.ts.isCode).toBe(true);
      expect(FILE_TYPE_REGISTRY.py.isCode).toBe(true);
      expect(FILE_TYPE_REGISTRY.sql.isCode).toBe(true);
    });

    it("should mark non-code file extensions appropriately", () => {
      expect(FILE_TYPE_REGISTRY.xml.isCode).toBe(false);
      expect(FILE_TYPE_REGISTRY.md.isCode).toBe(false);
      expect(FILE_TYPE_REGISTRY.jsp.isCode).toBe(false);
    });

    it("should map extensions to correct canonical types", () => {
      expect(FILE_TYPE_REGISTRY.java.canonicalType).toBe("java");
      expect(FILE_TYPE_REGISTRY.kt.canonicalType).toBe("java");
      expect(FILE_TYPE_REGISTRY.ts.canonicalType).toBe("javascript");
      expect(FILE_TYPE_REGISTRY.js.canonicalType).toBe("javascript");
      expect(FILE_TYPE_REGISTRY.py.canonicalType).toBe("python");
      expect(FILE_TYPE_REGISTRY.rb.canonicalType).toBe("ruby");
    });
  });

  describe("C/C++ language support", () => {
    it("should have all C extensions mapped to c canonical type", () => {
      expect(FILE_TYPE_REGISTRY.c.canonicalType).toBe("c");
      expect(FILE_TYPE_REGISTRY.h.canonicalType).toBe("c");
    });

    it("should have all C++ extensions mapped to cpp canonical type", () => {
      expect(FILE_TYPE_REGISTRY.cpp.canonicalType).toBe("cpp");
      expect(FILE_TYPE_REGISTRY.cxx.canonicalType).toBe("cpp");
      expect(FILE_TYPE_REGISTRY.cc.canonicalType).toBe("cpp");
      expect(FILE_TYPE_REGISTRY.hpp.canonicalType).toBe("cpp");
      expect(FILE_TYPE_REGISTRY.hh.canonicalType).toBe("cpp");
      expect(FILE_TYPE_REGISTRY.hxx.canonicalType).toBe("cpp");
    });
  });
});

describe("deriveCodeFileExtensions", () => {
  it("should return an array of code file extensions", () => {
    const extensions = deriveCodeFileExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it("should include common code file extensions", () => {
    const extensions = deriveCodeFileExtensions();
    expect(extensions).toContain("java");
    expect(extensions).toContain("ts");
    expect(extensions).toContain("js");
    expect(extensions).toContain("py");
    expect(extensions).toContain("rb");
    expect(extensions).toContain("sql");
  });

  it("should not include non-code file extensions", () => {
    const extensions = deriveCodeFileExtensions();
    expect(extensions).not.toContain("xml");
    expect(extensions).not.toContain("md");
    expect(extensions).not.toContain("markdown");
  });

  it("should contain expected number of extensions", () => {
    const extensions = deriveCodeFileExtensions();
    // Should have a reasonable number of code file extensions
    expect(extensions.length).toBeGreaterThan(40);
  });

  it("should not have duplicates", () => {
    const extensions = deriveCodeFileExtensions();
    const uniqueExtensions = new Set(extensions);
    expect(uniqueExtensions.size).toBe(extensions.length);
  });
});

describe("deriveExtensionToTypeMap", () => {
  it("should return a map of extensions to canonical types", () => {
    const map = deriveExtensionToTypeMap();
    expect(typeof map).toBe("object");
    expect(Object.keys(map).length).toBeGreaterThan(0);
  });

  it("should map extensions to correct canonical types", () => {
    const map = deriveExtensionToTypeMap();
    expect(map.java).toBe("java");
    expect(map.ts).toBe("javascript");
    expect(map.py).toBe("python");
    expect(map.rb).toBe("ruby");
    expect(map.cs).toBe("csharp");
  });

  it("should have all extensions from deriveCodeFileExtensions", () => {
    const map = deriveExtensionToTypeMap();
    const extensions = deriveCodeFileExtensions();
    for (const ext of extensions) {
      expect(map[ext]).toBeDefined();
    }
  });
});

describe("getFileTypeEntry", () => {
  it("should return entry for known extensions", () => {
    const entry = getFileTypeEntry("java");
    expect(entry).toBeDefined();
    expect(entry?.canonicalType).toBe("java");
    expect(entry?.isCode).toBe(true);
  });

  it("should return undefined for unknown extensions", () => {
    const entry = getFileTypeEntry("unknown");
    expect(entry).toBeUndefined();
  });

  it("should be case-insensitive", () => {
    const entryLower = getFileTypeEntry("java");
    const entryUpper = getFileTypeEntry("JAVA");
    expect(entryLower).toEqual(entryUpper);
  });
});

describe("isCodeExtension", () => {
  it("should return true for code file extensions", () => {
    expect(isCodeExtension("java")).toBe(true);
    expect(isCodeExtension("ts")).toBe(true);
    expect(isCodeExtension("py")).toBe(true);
    expect(isCodeExtension("sql")).toBe(true);
  });

  it("should return false for non-code file extensions", () => {
    expect(isCodeExtension("xml")).toBe(false);
    expect(isCodeExtension("md")).toBe(false);
    expect(isCodeExtension("jsp")).toBe(false);
  });

  it("should return false for unknown extensions", () => {
    expect(isCodeExtension("unknown")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(isCodeExtension("JAVA")).toBe(true);
    expect(isCodeExtension("Java")).toBe(true);
  });
});

describe("getCanonicalTypeForExtension", () => {
  it("should return correct canonical type for known extensions", () => {
    expect(getCanonicalTypeForExtension("java")).toBe("java");
    expect(getCanonicalTypeForExtension("ts")).toBe("javascript");
    expect(getCanonicalTypeForExtension("py")).toBe("python");
  });

  it("should return default for unknown extensions", () => {
    expect(getCanonicalTypeForExtension("unknown")).toBe("default");
  });

  it("should be case-insensitive", () => {
    expect(getCanonicalTypeForExtension("JAVA")).toBe("java");
    expect(getCanonicalTypeForExtension("Java")).toBe("java");
  });
});

describe("FILENAME_TYPE_REGISTRY", () => {
  describe("registry structure", () => {
    it("should have entries for common build files", () => {
      expect(FILENAME_TYPE_REGISTRY["pom.xml"]).toBeDefined();
      expect(FILENAME_TYPE_REGISTRY["build.gradle"]).toBeDefined();
      expect(FILENAME_TYPE_REGISTRY["package.json"]).toBeDefined();
      expect(FILENAME_TYPE_REGISTRY["requirements.txt"]).toBeDefined();
    });

    it("should map build files to correct canonical types", () => {
      expect(FILENAME_TYPE_REGISTRY["pom.xml"]).toBe("maven");
      expect(FILENAME_TYPE_REGISTRY["build.gradle"]).toBe("gradle");
      expect(FILENAME_TYPE_REGISTRY["build.gradle.kts"]).toBe("gradle");
      expect(FILENAME_TYPE_REGISTRY["package.json"]).toBe("npm");
      expect(FILENAME_TYPE_REGISTRY["yarn.lock"]).toBe("npm");
    });

    it("should have entries for Python package files", () => {
      expect(FILENAME_TYPE_REGISTRY["requirements.txt"]).toBe("python-pip");
      expect(FILENAME_TYPE_REGISTRY["setup.py"]).toBe("python-setup");
      expect(FILENAME_TYPE_REGISTRY["pyproject.toml"]).toBe("python-poetry");
      expect(FILENAME_TYPE_REGISTRY.pipfile).toBe("python-pip");
    });

    it("should have entries for C/C++ build files", () => {
      expect(FILENAME_TYPE_REGISTRY["cmakelists.txt"]).toBe("makefile");
      expect(FILENAME_TYPE_REGISTRY.makefile).toBe("makefile");
      expect(FILENAME_TYPE_REGISTRY.gnumakefile).toBe("makefile");
    });

    it("should have entries for Ruby bundler files", () => {
      expect(FILENAME_TYPE_REGISTRY.gemfile).toBe("ruby-bundler");
      expect(FILENAME_TYPE_REGISTRY["gemfile.lock"]).toBe("ruby-bundler");
    });
  });
});

describe("getCanonicalTypeForFilename", () => {
  it("should return correct canonical type for known filenames", () => {
    expect(getCanonicalTypeForFilename("pom.xml")).toBe("maven");
    expect(getCanonicalTypeForFilename("package.json")).toBe("npm");
    expect(getCanonicalTypeForFilename("requirements.txt")).toBe("python-pip");
  });

  it("should return undefined for unknown filenames", () => {
    expect(getCanonicalTypeForFilename("unknown.txt")).toBeUndefined();
    expect(getCanonicalTypeForFilename("myfile.java")).toBeUndefined();
  });

  it("should be case-insensitive", () => {
    expect(getCanonicalTypeForFilename("POM.XML")).toBe("maven");
    expect(getCanonicalTypeForFilename("Package.json")).toBe("npm");
    expect(getCanonicalTypeForFilename("MAKEFILE")).toBe("makefile");
  });
});
