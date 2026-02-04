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
 * Literal type for standard code file types.
 * These are the canonical file types handled by the standard code configuration factory.
 */
export type StandardCodeFileType =
  | "java"
  | "javascript"
  | "csharp"
  | "python"
  | "ruby"
  | "c"
  | "cpp";

/**
 * Source prompt definitions for standard programming languages.
 * These use the createStandardCodeConfig factory to ensure consistent instruction patterns.
 *
 * The `satisfies Record<StandardCodeFileType, ...>` pattern enforces that:
 * 1. All file types defined in StandardCodeFileType must have corresponding entries
 * 2. No invalid file type keys can be added (compile-time error for typos)
 * 3. The literal key types for each entry are preserved
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
} satisfies Record<StandardCodeFileType, SourceConfigEntry>;
