/**
 * Type definitions for source prompt fragments.
 *
 * This module provides interfaces that establish a common structure
 * for language-specific instruction fragments used in LLM prompts.
 */

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
