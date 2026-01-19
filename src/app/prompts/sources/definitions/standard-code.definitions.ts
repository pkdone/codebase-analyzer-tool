import {
  JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC_FRAGMENTS,
  CSHARP_SPECIFIC_FRAGMENTS,
  PYTHON_SPECIFIC_FRAGMENTS,
  PYTHON_COMPLEXITY_METRICS,
  RUBY_SPECIFIC_FRAGMENTS,
  C_SPECIFIC_FRAGMENTS,
  CPP_SPECIFIC_FRAGMENTS,
} from "../fragments";
import { createStandardCodeConfig, type SourceConfigEntry } from "./source-config-factories";

/**
 * Source prompt definitions for standard programming languages.
 * These use the createStandardCodeConfig factory to ensure consistent instruction patterns.
 *
 * The `satisfies` pattern validates that the object conforms to the Record structure
 * while preserving the literal key types for each entry.
 *
 * Note: hasComplexSchema defaults to false, so it's not explicitly set here.
 */
export const standardCodeDefinitions = {
  java: createStandardCodeConfig("the JVM code", JAVA_SPECIFIC_FRAGMENTS),
  javascript: createStandardCodeConfig(
    "the JavaScript/TypeScript code",
    JAVASCRIPT_SPECIFIC_FRAGMENTS,
  ),
  csharp: createStandardCodeConfig("the C# code", CSHARP_SPECIFIC_FRAGMENTS),
  python: createStandardCodeConfig("the Python code", PYTHON_SPECIFIC_FRAGMENTS, {
    extraComplexityMetrics: PYTHON_COMPLEXITY_METRICS,
  }),
  ruby: createStandardCodeConfig("the Ruby code", RUBY_SPECIFIC_FRAGMENTS),
  c: createStandardCodeConfig("the C source code", C_SPECIFIC_FRAGMENTS, {
    useModuleBase: true,
  }),
  cpp: createStandardCodeConfig("the C++ source code", CPP_SPECIFIC_FRAGMENTS),
} satisfies Record<string, SourceConfigEntry>;
