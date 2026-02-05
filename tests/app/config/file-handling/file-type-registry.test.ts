import {
  FILE_TYPE_REGISTRY,
  FILENAME_TYPE_REGISTRY,
  getEnabledCodeExtensions,
  deriveExtensionToTypeMap,
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

describe("getEnabledCodeExtensions", () => {
  it("should return an array of code file extensions", () => {
    const extensions = getEnabledCodeExtensions();
    expect(Array.isArray(extensions)).toBe(true);
    expect(extensions.length).toBeGreaterThan(0);
  });

  it("should include common code file extensions", () => {
    const extensions = getEnabledCodeExtensions();
    expect(extensions).toContain("java");
    expect(extensions).toContain("ts");
    expect(extensions).toContain("js");
    expect(extensions).toContain("py");
    expect(extensions).toContain("rb");
    expect(extensions).toContain("sql");
  });

  it("should not include non-code file extensions", () => {
    const extensions = getEnabledCodeExtensions();
    expect(extensions).not.toContain("xml");
    expect(extensions).not.toContain("md");
    expect(extensions).not.toContain("markdown");
  });

  it("should contain expected number of extensions", () => {
    const extensions = getEnabledCodeExtensions();
    // Should have a reasonable number of code file extensions
    expect(extensions.length).toBeGreaterThan(40);
  });

  it("should not have duplicates", () => {
    const extensions = getEnabledCodeExtensions();
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

  it("should have all extensions from getEnabledCodeExtensions", () => {
    const map = deriveExtensionToTypeMap();
    const extensions = getEnabledCodeExtensions();
    for (const ext of extensions) {
      expect(map[ext]).toBeDefined();
    }
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
