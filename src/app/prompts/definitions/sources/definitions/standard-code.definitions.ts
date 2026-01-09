import { SOURCES_PROMPT_FRAGMENTS } from "../sources.fragments";
import { createStandardCodeConfig, type SourceConfigEntry } from "./shared-utilities";

/**
 * Source prompt definitions for standard programming languages.
 * These use the createStandardCodeConfig factory to ensure consistent instruction patterns.
 */
export const standardCodeDefinitions: Record<string, SourceConfigEntry> = {
  java: {
    ...createStandardCodeConfig("the JVM code", SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC),
    hasComplexSchema: false,
  },
  javascript: {
    ...createStandardCodeConfig(
      "the JavaScript/TypeScript code",
      SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC,
    ),
    hasComplexSchema: false,
  },
  csharp: {
    ...createStandardCodeConfig("the C# code", SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC),
    hasComplexSchema: false,
  },
  python: {
    ...createStandardCodeConfig("the Python code", SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC, {
      extraComplexityMetrics: SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
    }),
    hasComplexSchema: false,
  },
  ruby: {
    ...createStandardCodeConfig("the Ruby code", SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC),
    hasComplexSchema: false,
  },
  c: {
    ...createStandardCodeConfig("the C source code", SOURCES_PROMPT_FRAGMENTS.C_SPECIFIC, {
      useModuleBase: true,
    }),
    hasComplexSchema: false,
  },
  cpp: {
    ...createStandardCodeConfig("the C++ source code", SOURCES_PROMPT_FRAGMENTS.CPP_SPECIFIC),
    hasComplexSchema: false,
  },
};
