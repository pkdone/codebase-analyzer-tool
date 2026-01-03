/**
 * Interface defining the expected structure for language-specific fragments.
 * This provides compile-time documentation and helps ensure consistency
 * when adding new language support.
 *
 * Languages may use either PUBLIC_FUNCTIONS or PUBLIC_METHODS depending
 * on the language's terminology:
 * - PUBLIC_FUNCTIONS: JavaScript, Python, Ruby, C
 * - PUBLIC_METHODS: Java, C#, C++
 *
 * KIND_OVERRIDE is optional and only needed for languages that support
 * multiple entity types beyond class/interface (e.g., struct, record, module).
 *
 * @example
 * ```typescript
 * // When adding a new language, ensure all required fields are defined:
 * const NEW_LANGUAGE_SPECIFIC: LanguageSpecificFragments = {
 *   INTERNAL_REFS: "...",
 *   EXTERNAL_REFS: "...",
 *   PUBLIC_CONSTANTS: "...",
 *   PUBLIC_FUNCTIONS: "...",  // or PUBLIC_METHODS
 *   INTEGRATION_INSTRUCTIONS: "...",
 *   DB_MECHANISM_MAPPING: "...",
 * };
 * ```
 */
export interface LanguageSpecificFragments {
  /** Instructions for extracting internal references (same-project imports/includes) */
  readonly INTERNAL_REFS: string;
  /** Instructions for extracting external references (third-party/library imports) */
  readonly EXTERNAL_REFS: string;
  /** Instructions for extracting public constants */
  readonly PUBLIC_CONSTANTS: string;
  /** Instructions for extracting public functions (JS, Python, Ruby, C) */
  readonly PUBLIC_FUNCTIONS?: string;
  /** Instructions for extracting public methods (Java, C#, C++) */
  readonly PUBLIC_METHODS?: string;
  /** Instructions for identifying integration points (REST, messaging, etc.) */
  readonly INTEGRATION_INSTRUCTIONS: string;
  /** Instructions for mapping database access mechanisms */
  readonly DB_MECHANISM_MAPPING: string;
  /** Optional override for entity kind (class, struct, record, module, etc.) */
  readonly KIND_OVERRIDE?: string;
}

// Import all fragments from the fragments subfolder
import {
  COMMON_FRAGMENTS,
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  BASE_FRAGMENTS,
  DEPENDENCY_EXTRACTION_FRAGMENTS,
  JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC_FRAGMENTS,
  CSHARP_SPECIFIC_FRAGMENTS,
  PYTHON_SPECIFIC_FRAGMENTS,
  PYTHON_COMPLEXITY_METRICS,
  RUBY_SPECIFIC_FRAGMENTS,
  C_SPECIFIC_FRAGMENTS,
  CPP_SPECIFIC_FRAGMENTS,
  SQL_SPECIFIC_FRAGMENTS,
  XML_SPECIFIC_FRAGMENTS,
  JSP_SPECIFIC_FRAGMENTS,
  SHELL_SCRIPT_SPECIFIC_FRAGMENTS,
  BATCH_SCRIPT_SPECIFIC_FRAGMENTS,
  JCL_SPECIFIC_FRAGMENTS,
  MAKEFILE_SPECIFIC_FRAGMENTS,
} from "./fragments";

/**
 * Centralized collection of all source prompt fragments.
 * This object maintains backward compatibility with the original structure
 * while delegating to the modular fragment files in the fragments subfolder.
 */
export const SOURCES_PROMPT_FRAGMENTS = {
  COMMON: COMMON_FRAGMENTS,
  CODE_QUALITY: CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION: DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS: INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS: SCHEDULED_JOBS_FRAGMENTS,
  BASE: BASE_FRAGMENTS,
  DEPENDENCY_EXTRACTION: DEPENDENCY_EXTRACTION_FRAGMENTS,
  JAVA_SPECIFIC: JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC: JAVASCRIPT_SPECIFIC_FRAGMENTS,
  CSHARP_SPECIFIC: CSHARP_SPECIFIC_FRAGMENTS,
  PYTHON_SPECIFIC: {
    ...PYTHON_SPECIFIC_FRAGMENTS,
    PYTHON_COMPLEXITY_METRICS,
  },
  RUBY_SPECIFIC: RUBY_SPECIFIC_FRAGMENTS,
  C_SPECIFIC: C_SPECIFIC_FRAGMENTS,
  CPP_SPECIFIC: CPP_SPECIFIC_FRAGMENTS,
  SQL_SPECIFIC: SQL_SPECIFIC_FRAGMENTS,
  XML_SPECIFIC: XML_SPECIFIC_FRAGMENTS,
  JSP_SPECIFIC: JSP_SPECIFIC_FRAGMENTS,
  SHELL_SCRIPT_SPECIFIC: SHELL_SCRIPT_SPECIFIC_FRAGMENTS,
  BATCH_SCRIPT_SPECIFIC: BATCH_SCRIPT_SPECIFIC_FRAGMENTS,
  JCL_SPECIFIC: JCL_SPECIFIC_FRAGMENTS,
  MAKEFILE_SPECIFIC: MAKEFILE_SPECIFIC_FRAGMENTS,
} as const;

/**
 * Composable instruction sets for common patterns across file types.
 * These pre-composed instruction blocks combine related fragments for convenience and consistency.
 *
 * @example
 * ```typescript
 * // Use in instruction blocks for better clarity
 * buildInstructionBlock(
 *   INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
 *   COMPOSITES.CODE_QUALITY,
 * )
 * ```
 */
export const COMPOSITES = {
  /** Pre-composed code quality analysis instructions including metrics and code smells */
  CODE_QUALITY: [
    SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.INTRO,
    SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.FUNCTION_METRICS,
    SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.FUNCTION_SMELLS,
    SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.FILE_METRICS,
  ] as const,

  /** Pre-composed database integration analysis instructions */
  DB_INTEGRATION: [
    SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO,
    SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.REQUIRED_FIELDS,
  ] as const,

  /** Pre-composed integration points instructions */
  INTEGRATION_POINTS: [SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO] as const,

  /** Pre-composed scheduled jobs instructions */
  SCHEDULED_JOBS: [
    SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
    SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
  ] as const,
} as const;
