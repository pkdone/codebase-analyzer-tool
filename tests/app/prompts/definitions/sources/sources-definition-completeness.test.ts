import { z } from "zod";
import {
  standardCodeDefinitions,
  type StandardCodeFileType,
} from "../../../../../src/app/prompts/sources/definitions/standard-code.definitions";
import {
  dependencyFileDefinitions,
  type DependencyFileType,
} from "../../../../../src/app/prompts/sources/definitions/dependency-files.definitions";
import {
  specialFileDefinitions,
  type SpecialFileType,
} from "../../../../../src/app/prompts/sources/definitions/special-files.definitions";
import {
  fileTypePromptRegistry,
  type FileTypePromptRegistry,
} from "../../../../../src/app/prompts/sources/sources.definitions";
import { CANONICAL_FILE_TYPES } from "../../../../../src/app/schemas/canonical-file-types";

/**
 * Tests for source definition files completeness validation.
 *
 * These tests verify that the strengthened type constraints using literal type unions
 * as Record keys correctly enforce completeness at both compile-time and runtime.
 */
describe("Source Definition Files Completeness Validation", () => {
  describe("StandardCodeFileType Completeness", () => {
    const expectedStandardCodeTypes: StandardCodeFileType[] = [
      "java",
      "javascript",
      "csharp",
      "python",
      "ruby",
      "c",
      "cpp",
    ];

    it("should have an entry for every StandardCodeFileType value", () => {
      for (const fileType of expectedStandardCodeTypes) {
        expect(standardCodeDefinitions[fileType]).toBeDefined();
        expect(standardCodeDefinitions[fileType].responseSchema).toBeInstanceOf(z.ZodType);
        expect(standardCodeDefinitions[fileType].instructions).toBeDefined();
      }
    });

    it("should have exactly the expected number of standard code entries", () => {
      const actualKeys = Object.keys(standardCodeDefinitions);
      expect(actualKeys.length).toBe(expectedStandardCodeTypes.length);
    });

    it("should have all keys be valid StandardCodeFileType values", () => {
      const actualKeys = Object.keys(standardCodeDefinitions);
      const validTypes = new Set<string>(expectedStandardCodeTypes);

      for (const key of actualKeys) {
        expect(validTypes.has(key)).toBe(true);
      }
    });
  });

  describe("DependencyFileType Completeness", () => {
    const expectedDependencyTypes: DependencyFileType[] = [
      "maven",
      "gradle",
      "ant",
      "npm",
      "dotnet-proj",
      "nuget",
      "ruby-bundler",
      "python-pip",
      "python-setup",
      "python-poetry",
      "makefile",
    ];

    it("should have an entry for every DependencyFileType value", () => {
      for (const fileType of expectedDependencyTypes) {
        expect(dependencyFileDefinitions[fileType]).toBeDefined();
        expect(dependencyFileDefinitions[fileType].responseSchema).toBeInstanceOf(z.ZodType);
        expect(dependencyFileDefinitions[fileType].instructions).toBeDefined();
      }
    });

    it("should have exactly the expected number of dependency file entries", () => {
      const actualKeys = Object.keys(dependencyFileDefinitions);
      expect(actualKeys.length).toBe(expectedDependencyTypes.length);
    });

    it("should have all keys be valid DependencyFileType values", () => {
      const actualKeys = Object.keys(dependencyFileDefinitions);
      const validTypes = new Set<string>(expectedDependencyTypes);

      for (const key of actualKeys) {
        expect(validTypes.has(key)).toBe(true);
      }
    });
  });

  describe("SpecialFileType Completeness", () => {
    const expectedSpecialTypes: SpecialFileType[] = [
      "sql",
      "markdown",
      "xml",
      "jsp",
      "shell-script",
      "batch-script",
      "jcl",
      "default",
    ];

    it("should have an entry for every SpecialFileType value", () => {
      for (const fileType of expectedSpecialTypes) {
        expect(specialFileDefinitions[fileType]).toBeDefined();
        expect(specialFileDefinitions[fileType].responseSchema).toBeInstanceOf(z.ZodType);
        expect(specialFileDefinitions[fileType].instructions).toBeDefined();
      }
    });

    it("should have exactly the expected number of special file entries", () => {
      const actualKeys = Object.keys(specialFileDefinitions);
      expect(actualKeys.length).toBe(expectedSpecialTypes.length);
    });

    it("should have all keys be valid SpecialFileType values", () => {
      const actualKeys = Object.keys(specialFileDefinitions);
      const validTypes = new Set<string>(expectedSpecialTypes);

      for (const key of actualKeys) {
        expect(validTypes.has(key)).toBe(true);
      }
    });
  });

  describe("Combined Coverage of CanonicalFileType", () => {
    it("should have definition files that together cover all CanonicalFileType values", () => {
      const standardKeys = new Set(Object.keys(standardCodeDefinitions));
      const dependencyKeys = new Set(Object.keys(dependencyFileDefinitions));
      const specialKeys = new Set(Object.keys(specialFileDefinitions));

      // Combine all keys from the three definition files
      const combinedKeys = new Set([...standardKeys, ...dependencyKeys, ...specialKeys]);

      // Verify all canonical file types are covered
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(combinedKeys.has(fileType)).toBe(true);
      }
    });

    it("should have no duplicate keys across definition files", () => {
      const standardKeys = Object.keys(standardCodeDefinitions);
      const dependencyKeys = Object.keys(dependencyFileDefinitions);
      const specialKeys = Object.keys(specialFileDefinitions);

      // Check for duplicates between standard and dependency
      for (const key of standardKeys) {
        expect(dependencyKeys).not.toContain(key);
        expect(specialKeys).not.toContain(key);
      }

      // Check for duplicates between dependency and special
      for (const key of dependencyKeys) {
        expect(specialKeys).not.toContain(key);
      }
    });

    it("should have combined count equal to CANONICAL_FILE_TYPES count", () => {
      const standardCount = Object.keys(standardCodeDefinitions).length;
      const dependencyCount = Object.keys(dependencyFileDefinitions).length;
      const specialCount = Object.keys(specialFileDefinitions).length;
      const totalCount = standardCount + dependencyCount + specialCount;

      expect(totalCount).toBe(CANONICAL_FILE_TYPES.length);
    });
  });

  describe("Aggregated Registry Validation", () => {
    it("should have fileTypePromptRegistry contain all canonical file types", () => {
      for (const fileType of CANONICAL_FILE_TYPES) {
        expect(fileTypePromptRegistry[fileType]).toBeDefined();
      }
    });

    it("should preserve type inference for specific file type lookups", () => {
      // When accessing with a literal key, TypeScript should narrow the type
      const javaEntry: FileTypePromptRegistry["java"] = fileTypePromptRegistry.java;
      const sqlEntry: FileTypePromptRegistry["sql"] = fileTypePromptRegistry.sql;
      const mavenEntry: FileTypePromptRegistry["maven"] = fileTypePromptRegistry.maven;

      // These should be distinct entry objects
      expect(javaEntry).not.toBe(sqlEntry);
      expect(sqlEntry).not.toBe(mavenEntry);

      // Each entry should have its specific schema
      expect(javaEntry.responseSchema).toBeDefined();
      expect(sqlEntry.responseSchema).toBeDefined();
      expect(mavenEntry.responseSchema).toBeDefined();
    });
  });

  describe("Type Literal Union Coverage", () => {
    it("should have StandardCodeFileType cover exactly the standard code file types", () => {
      // Type-level test: verify the literal union matches the runtime keys
      const literalTypes: StandardCodeFileType[] = [
        "java",
        "javascript",
        "csharp",
        "python",
        "ruby",
        "c",
        "cpp",
      ];
      const actualKeys = Object.keys(standardCodeDefinitions) as StandardCodeFileType[];

      expect(new Set(literalTypes)).toEqual(new Set(actualKeys));
    });

    it("should have DependencyFileType cover exactly the dependency file types", () => {
      const literalTypes: DependencyFileType[] = [
        "maven",
        "gradle",
        "ant",
        "npm",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "makefile",
      ];
      const actualKeys = Object.keys(dependencyFileDefinitions) as DependencyFileType[];

      expect(new Set(literalTypes)).toEqual(new Set(actualKeys));
    });

    it("should have SpecialFileType cover exactly the special file types", () => {
      const literalTypes: SpecialFileType[] = [
        "sql",
        "markdown",
        "xml",
        "jsp",
        "shell-script",
        "batch-script",
        "jcl",
        "default",
      ];
      const actualKeys = Object.keys(specialFileDefinitions) as SpecialFileType[];

      expect(new Set(literalTypes)).toEqual(new Set(actualKeys));
    });
  });
});
