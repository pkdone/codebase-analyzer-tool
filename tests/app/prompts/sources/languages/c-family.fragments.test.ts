/**
 * Tests for the C-family language fragments factory.
 */

import {
  createCFamilyFragments,
  type CFamilyFragmentsOptions,
} from "../../../../../src/app/prompts/sources/fragments/languages/c-family.fragments";
import { C_SPECIFIC_FRAGMENTS } from "../../../../../src/app/prompts/sources/fragments/languages/c.fragments";
import { CPP_SPECIFIC_FRAGMENTS } from "../../../../../src/app/prompts/sources/fragments/languages/cpp.fragments";

describe("createCFamilyFragments", () => {
  describe("factory function", () => {
    const minimalOptions: CFamilyFragmentsOptions = {
      headerExtension: ".h",
      externalHeaderExamples: "<stdio.h>",
      enumDescription: "enum values",
      publicFunctionsOrMethodsDescription: "A list of functions",
      usePublicMethods: false,
      integrationInstructions: "Integration instructions here",
      dbMechanismMappings: ["- Uses SQLite => DRIVER"],
    };

    it("should create fragments with PUBLIC_FUNCTIONS when usePublicMethods is false", () => {
      const fragments = createCFamilyFragments(minimalOptions);

      expect(fragments.PUBLIC_FUNCTIONS).toBe("A list of functions");
      expect(fragments.PUBLIC_METHODS).toBeUndefined();
    });

    it("should create fragments with PUBLIC_METHODS when usePublicMethods is true", () => {
      const fragments = createCFamilyFragments({
        ...minimalOptions,
        usePublicMethods: true,
        publicFunctionsOrMethodsDescription: "A list of methods",
      });

      expect(fragments.PUBLIC_METHODS).toBe("A list of methods");
      expect(fragments.PUBLIC_FUNCTIONS).toBeUndefined();
    });

    it("should include KIND_OVERRIDE when provided with usePublicMethods", () => {
      const fragments = createCFamilyFragments({
        ...minimalOptions,
        usePublicMethods: true,
        kindOverride: "Its kind ('class', 'struct')",
      });

      expect(fragments.KIND_OVERRIDE).toBe("Its kind ('class', 'struct')");
    });

    it("should not include KIND_OVERRIDE when usePublicMethods is false", () => {
      const fragments = createCFamilyFragments({
        ...minimalOptions,
        kindOverride: "Its kind ('class', 'struct')",
      });

      expect(fragments.KIND_OVERRIDE).toBeUndefined();
    });

    it("should include header extension in INTERNAL_REFS", () => {
      const fragments = createCFamilyFragments(minimalOptions);

      expect(fragments.INTERNAL_REFS).toContain(".h");
      expect(fragments.INTERNAL_REFS).toContain("#include");
    });

    it("should include external header examples in EXTERNAL_REFS", () => {
      const fragments = createCFamilyFragments(minimalOptions);

      expect(fragments.EXTERNAL_REFS).toContain("<stdio.h>");
    });

    it("should include additional text in EXTERNAL_REFS when provided", () => {
      const fragments = createCFamilyFragments({
        ...minimalOptions,
        externalRefsAdditionalText: ", STL,",
      });

      expect(fragments.EXTERNAL_REFS).toContain("STL");
      expect(fragments.INTERNAL_REFS).toContain("STL");
    });

    it("should include constants prefix when provided", () => {
      const fragments = createCFamilyFragments({
        ...minimalOptions,
        constantsPrefix: "constexpr variables, ",
      });

      expect(fragments.PUBLIC_CONSTANTS).toContain("constexpr variables");
    });

    it("should include enum description in PUBLIC_CONSTANTS", () => {
      const fragments = createCFamilyFragments(minimalOptions);

      expect(fragments.PUBLIC_CONSTANTS).toContain("enum values");
    });

    it("should include integration instructions", () => {
      const fragments = createCFamilyFragments(minimalOptions);

      expect(fragments.INTEGRATION_INSTRUCTIONS).toBe("Integration instructions here");
    });

    it("should process DB mechanism mappings", () => {
      const fragments = createCFamilyFragments(minimalOptions);

      expect(fragments.DB_MECHANISM_MAPPING).toContain("SQLite");
      expect(fragments.DB_MECHANISM_MAPPING).toContain("DRIVER");
    });
  });

  describe("C_SPECIFIC_FRAGMENTS (generated)", () => {
    it("should have all required fields", () => {
      expect(C_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
      expect(C_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toBeDefined();
      expect(C_SPECIFIC_FRAGMENTS.PUBLIC_CONSTANTS).toBeDefined();
      expect(C_SPECIFIC_FRAGMENTS.PUBLIC_FUNCTIONS).toBeDefined();
      expect(C_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toBeDefined();
      expect(C_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toBeDefined();
    });

    it("should use .h header extension", () => {
      expect(C_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toContain(".h");
    });

    it("should include C-specific external headers", () => {
      expect(C_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toContain("<stdio.h>");
      expect(C_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toContain("<stdlib.h>");
    });

    it("should not have PUBLIC_METHODS or KIND_OVERRIDE", () => {
      expect(C_SPECIFIC_FRAGMENTS.PUBLIC_METHODS).toBeUndefined();
      expect(C_SPECIFIC_FRAGMENTS.KIND_OVERRIDE).toBeUndefined();
    });

    it("should include C-specific integration patterns", () => {
      expect(C_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toContain("BSD socket API");
      expect(C_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toContain("libcurl");
    });

    it("should include C-specific database mechanisms", () => {
      expect(C_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toContain("MySQL C API");
      expect(C_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toContain("PostgreSQL libpq");
    });
  });

  describe("CPP_SPECIFIC_FRAGMENTS (generated)", () => {
    it("should have all required fields", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
      expect(CPP_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toBeDefined();
      expect(CPP_SPECIFIC_FRAGMENTS.PUBLIC_CONSTANTS).toBeDefined();
      expect(CPP_SPECIFIC_FRAGMENTS.PUBLIC_METHODS).toBeDefined();
      expect(CPP_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toBeDefined();
      expect(CPP_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toBeDefined();
    });

    it("should use .hpp header extension", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toContain(".hpp");
    });

    it("should include C++-specific external headers", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toContain("<vector>");
      expect(CPP_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toContain("<string>");
      expect(CPP_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toContain("STL");
    });

    it("should include constexpr in PUBLIC_CONSTANTS", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.PUBLIC_CONSTANTS).toContain("constexpr");
    });

    it("should include enum class in PUBLIC_CONSTANTS", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.PUBLIC_CONSTANTS).toContain("enum class");
    });

    it("should have PUBLIC_METHODS instead of PUBLIC_FUNCTIONS", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.PUBLIC_METHODS).toBeDefined();
      expect(CPP_SPECIFIC_FRAGMENTS.PUBLIC_FUNCTIONS).toBeUndefined();
    });

    it("should have KIND_OVERRIDE for C++ entity types", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.KIND_OVERRIDE).toContain("class");
      expect(CPP_SPECIFIC_FRAGMENTS.KIND_OVERRIDE).toContain("struct");
      expect(CPP_SPECIFIC_FRAGMENTS.KIND_OVERRIDE).toContain("namespace");
    });

    it("should include C++-specific integration patterns", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toContain("Boost.Asio");
      expect(CPP_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toContain("cpprestsdk");
      expect(CPP_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toContain("gRPC");
    });

    it("should include C++-specific database mechanisms", () => {
      expect(CPP_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toContain("MySQL Connector/C++");
      expect(CPP_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toContain("libpqxx");
      expect(CPP_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toContain("Qt SQL");
    });
  });
});
