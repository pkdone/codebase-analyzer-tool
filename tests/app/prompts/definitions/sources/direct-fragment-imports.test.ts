/**
 * Tests verifying direct fragment imports work correctly after refactoring.
 * This ensures the barrel file exports all fragments correctly and they can be
 * imported directly without going through deprecated aggregation objects.
 */
import {
  // Type exports
  type LanguageSpecificFragments,
  // Language-specific fragments
  JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC_FRAGMENTS,
  CSHARP_SPECIFIC_FRAGMENTS,
  PYTHON_SPECIFIC_FRAGMENTS,
  PYTHON_COMPLEXITY_METRICS,
  RUBY_SPECIFIC_FRAGMENTS,
  C_SPECIFIC_FRAGMENTS,
  CPP_SPECIFIC_FRAGMENTS,
  // Common fragments
  COMMON_FRAGMENTS,
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  BASE_FRAGMENTS,
  // Dependency extraction fragments
  DEPENDENCY_EXTRACTION_FRAGMENTS,
  // File-type-specific fragments
  SQL_SPECIFIC_FRAGMENTS,
  XML_SPECIFIC_FRAGMENTS,
  JSP_SPECIFIC_FRAGMENTS,
  SHELL_SCRIPT_SPECIFIC_FRAGMENTS,
  BATCH_SCRIPT_SPECIFIC_FRAGMENTS,
  JCL_SPECIFIC_FRAGMENTS,
  // Composites
  COMPOSITES,
} from "../../../../../src/app/prompts/sources/fragments";

describe("Direct Fragment Imports", () => {
  describe("Type exports", () => {
    it("should export LanguageSpecificFragments type from barrel file", () => {
      // This test verifies compile-time type availability
      // The type assertion will fail at compile time if the type is not exported
      const testFragment: LanguageSpecificFragments = {
        INTERNAL_REFS: "test internal refs",
        EXTERNAL_REFS: "test external refs",
        PUBLIC_CONSTANTS: "test constants",
        PUBLIC_FUNCTIONS: "test functions",
        INTEGRATION_INSTRUCTIONS: "test integration",
        DB_MECHANISM_MAPPING: "test db mapping",
      };
      expect(testFragment.INTERNAL_REFS).toBe("test internal refs");
    });

    it("should allow using LanguageSpecificFragments to type-check fragment objects", () => {
      // Verify that existing fragment objects conform to the interface
      const javaFragments: LanguageSpecificFragments = JAVA_SPECIFIC_FRAGMENTS;
      const jsFragments: LanguageSpecificFragments = JAVASCRIPT_SPECIFIC_FRAGMENTS;

      expect(javaFragments.INTERNAL_REFS).toBeDefined();
      expect(jsFragments.PUBLIC_FUNCTIONS).toBeDefined();
    });
  });

  describe("Language-specific fragments", () => {
    it("should export JAVA_SPECIFIC_FRAGMENTS with required fields", () => {
      expect(JAVA_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(JAVA_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
      expect(JAVA_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toBeDefined();
      expect(JAVA_SPECIFIC_FRAGMENTS.PUBLIC_CONSTANTS).toBeDefined();
      expect(JAVA_SPECIFIC_FRAGMENTS.PUBLIC_METHODS).toBeDefined();
      expect(JAVA_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toBeDefined();
      expect(JAVA_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toBeDefined();
    });

    it("should export JAVASCRIPT_SPECIFIC_FRAGMENTS with required fields", () => {
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS.EXTERNAL_REFS).toBeDefined();
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS.PUBLIC_CONSTANTS).toBeDefined();
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS.PUBLIC_FUNCTIONS).toBeDefined();
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS.INTEGRATION_INSTRUCTIONS).toBeDefined();
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toBeDefined();
    });

    it("should export CSHARP_SPECIFIC_FRAGMENTS", () => {
      expect(CSHARP_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(CSHARP_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
      expect(CSHARP_SPECIFIC_FRAGMENTS.DB_MECHANISM_MAPPING).toBeDefined();
    });

    it("should export PYTHON_SPECIFIC_FRAGMENTS and PYTHON_COMPLEXITY_METRICS", () => {
      expect(PYTHON_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(PYTHON_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
      expect(PYTHON_COMPLEXITY_METRICS).toBeDefined();
      expect(PYTHON_COMPLEXITY_METRICS).toContain("Cyclomatic complexity");
    });

    it("should export RUBY_SPECIFIC_FRAGMENTS", () => {
      expect(RUBY_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(RUBY_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
    });

    it("should export C_SPECIFIC_FRAGMENTS", () => {
      expect(C_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(C_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
    });

    it("should export CPP_SPECIFIC_FRAGMENTS", () => {
      expect(CPP_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(CPP_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBeDefined();
    });
  });

  describe("Common fragments", () => {
    it("should export COMMON_FRAGMENTS", () => {
      expect(COMMON_FRAGMENTS).toBeDefined();
      expect(COMMON_FRAGMENTS.PURPOSE).toBeDefined();
      expect(COMMON_FRAGMENTS.IMPLEMENTATION).toBeDefined();
      expect(COMMON_FRAGMENTS.DB_IN_DOCUMENTATION).toBeDefined();
      expect(COMMON_FRAGMENTS.DB_IN_FILE).toBeDefined();
    });

    it("should export CODE_QUALITY_FRAGMENTS", () => {
      expect(CODE_QUALITY_FRAGMENTS).toBeDefined();
      expect(CODE_QUALITY_FRAGMENTS.INTRO).toBeDefined();
      expect(CODE_QUALITY_FRAGMENTS.FUNCTION_METRICS).toBeDefined();
      expect(CODE_QUALITY_FRAGMENTS.FUNCTION_SMELLS).toBeDefined();
      expect(CODE_QUALITY_FRAGMENTS.FILE_METRICS).toBeDefined();
    });

    it("should export DB_INTEGRATION_FRAGMENTS", () => {
      expect(DB_INTEGRATION_FRAGMENTS).toBeDefined();
      expect(DB_INTEGRATION_FRAGMENTS.INTRO).toBeDefined();
      expect(DB_INTEGRATION_FRAGMENTS.REQUIRED_FIELDS).toBeDefined();
    });

    it("should export INTEGRATION_POINTS_FRAGMENTS", () => {
      expect(INTEGRATION_POINTS_FRAGMENTS).toBeDefined();
      expect(INTEGRATION_POINTS_FRAGMENTS.INTRO).toBeDefined();
    });

    it("should export SCHEDULED_JOBS_FRAGMENTS", () => {
      expect(SCHEDULED_JOBS_FRAGMENTS).toBeDefined();
      expect(SCHEDULED_JOBS_FRAGMENTS.INTRO).toBeDefined();
      expect(SCHEDULED_JOBS_FRAGMENTS.FIELDS).toBeDefined();
    });

    it("should export BASE_FRAGMENTS", () => {
      expect(BASE_FRAGMENTS).toBeDefined();
      expect(BASE_FRAGMENTS.CLASS).toBeDefined();
      expect(BASE_FRAGMENTS.MODULE).toBeDefined();
      expect(Array.isArray(BASE_FRAGMENTS.CLASS)).toBe(true);
      expect(Array.isArray(BASE_FRAGMENTS.MODULE)).toBe(true);
    });
  });

  describe("Dependency extraction fragments", () => {
    it("should export DEPENDENCY_EXTRACTION_FRAGMENTS with all build tools", () => {
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.MAVEN).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.GRADLE).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.ANT).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.NPM).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.DOTNET).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.NUGET).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.RUBY_BUNDLER).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.PYTHON_PIP).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.PYTHON_SETUP).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.PYTHON_POETRY).toBeDefined();
      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.MAKEFILE).toBeDefined();
    });
  });

  describe("File-type-specific fragments", () => {
    it("should export SQL_SPECIFIC_FRAGMENTS", () => {
      expect(SQL_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(SQL_SPECIFIC_FRAGMENTS.TABLE_LIST).toBeDefined();
      expect(SQL_SPECIFIC_FRAGMENTS.STORED_PROCEDURE_LIST).toBeDefined();
      expect(SQL_SPECIFIC_FRAGMENTS.TRIGGER_LIST).toBeDefined();
      expect(SQL_SPECIFIC_FRAGMENTS.DB_INTEGRATION_ANALYSIS).toBeDefined();
    });

    it("should export XML_SPECIFIC_FRAGMENTS", () => {
      expect(XML_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(XML_SPECIFIC_FRAGMENTS.UI_FRAMEWORK_DETECTION).toBeDefined();
    });

    it("should export JSP_SPECIFIC_FRAGMENTS", () => {
      expect(JSP_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(JSP_SPECIFIC_FRAGMENTS.DATA_INPUT_FIELDS).toBeDefined();
      expect(JSP_SPECIFIC_FRAGMENTS.JSP_METRICS_ANALYSIS).toBeDefined();
    });

    it("should export SHELL_SCRIPT_SPECIFIC_FRAGMENTS", () => {
      expect(SHELL_SCRIPT_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(SHELL_SCRIPT_SPECIFIC_FRAGMENTS.CRON_EXPRESSIONS).toBeDefined();
      expect(SHELL_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS).toBeDefined();
      expect(SHELL_SCRIPT_SPECIFIC_FRAGMENTS.EXTERNAL_API_CALLS).toBeDefined();
    });

    it("should export BATCH_SCRIPT_SPECIFIC_FRAGMENTS", () => {
      expect(BATCH_SCRIPT_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.TASK_SCHEDULER).toBeDefined();
      expect(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS).toBeDefined();
      expect(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.NETWORK_OPS).toBeDefined();
      expect(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.SERVICE_OPS).toBeDefined();
    });

    it("should export JCL_SPECIFIC_FRAGMENTS", () => {
      expect(JCL_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(JCL_SPECIFIC_FRAGMENTS.EXEC_STATEMENTS).toBeDefined();
      expect(JCL_SPECIFIC_FRAGMENTS.DD_STATEMENTS).toBeDefined();
      expect(JCL_SPECIFIC_FRAGMENTS.COND_PARAMETERS).toBeDefined();
      expect(JCL_SPECIFIC_FRAGMENTS.SORT_UTILITIES).toBeDefined();
    });
  });

  describe("COMPOSITES export from fragments barrel", () => {
    it("should export COMPOSITES from the fragments barrel file", () => {
      expect(COMPOSITES).toBeDefined();
      expect(COMPOSITES.CODE_QUALITY).toBeDefined();
      expect(COMPOSITES.DB_INTEGRATION).toBeDefined();
      expect(COMPOSITES.INTEGRATION_POINTS).toBeDefined();
      expect(COMPOSITES.SCHEDULED_JOBS).toBeDefined();
    });
  });

  describe("Fragment content validation", () => {
    it("should have non-empty string fragments", () => {
      // Spot check a few fragments for content
      expect(COMMON_FRAGMENTS.PURPOSE.length).toBeGreaterThan(0);
      expect(typeof COMMON_FRAGMENTS.PURPOSE).toBe("string");

      expect(JAVA_SPECIFIC_FRAGMENTS.INTERNAL_REFS.length).toBeGreaterThan(0);
      expect(typeof JAVA_SPECIFIC_FRAGMENTS.INTERNAL_REFS).toBe("string");

      expect(DEPENDENCY_EXTRACTION_FRAGMENTS.MAVEN.length).toBeGreaterThan(0);
      expect(typeof DEPENDENCY_EXTRACTION_FRAGMENTS.MAVEN).toBe("string");
    });
  });
});
