/**
 * Shared factory for C-family language fragments (C and C++).
 *
 * This module consolidates the common structure and patterns between C and C++
 * prompt fragments, reducing duplication while allowing language-specific customization.
 */

import { createDbMechanismInstructions, dbMech } from "../../utils";
import type { LanguageSpecificFragments } from "../../sources.types";
import { MECHANISM_DESCRIPTIONS } from "../features/common.fragments";

/**
 * Configuration options for creating C-family language fragments.
 */
export interface CFamilyFragmentsOptions {
  /**
   * The typical header file extension for this language.
   * @example ".h" for C, ".hpp" for C++
   */
  headerExtension: string;

  /**
   * Example external headers for the language.
   * @example "<stdio.h>, <stdlib.h>" for C, "<vector>, <string>, <iostream>" for C++
   */
  externalHeaderExamples: string;

  /**
   * Additional text to include in external references description.
   * @example ", STL," for C++ to mention the Standard Template Library
   */
  externalRefsAdditionalText?: string;

  /**
   * Language-specific additions to the public constants description.
   * @example "constexpr variables, " for C++ to mention constexpr
   */
  constantsPrefix?: string;

  /**
   * Language-specific additions to the public constants enum description.
   * @example "enum/enum class values" for C++, "enum values" for C
   */
  enumDescription: string;

  /**
   * Description for public functions/methods.
   * Use this for the content of either PUBLIC_FUNCTIONS or PUBLIC_METHODS.
   */
  publicFunctionsOrMethodsDescription: string;

  /**
   * Whether this language uses PUBLIC_METHODS instead of PUBLIC_FUNCTIONS.
   * When true, the description goes to PUBLIC_METHODS; otherwise PUBLIC_FUNCTIONS.
   */
  usePublicMethods: boolean;

  /**
   * Optional KIND_OVERRIDE for languages with additional entity types.
   * @example "Its kind ('class', 'struct', 'enum', 'union', or 'namespace')" for C++
   */
  kindOverride?: string;

  /**
   * Language-specific integration instructions.
   */
  integrationInstructions: string;

  /**
   * Language-specific database mechanism mappings.
   */
  dbMechanismMappings: string[];
}

/**
 * Creates language-specific fragments for C-family languages.
 *
 * This factory function generates a LanguageSpecificFragments object based on
 * the provided configuration, sharing common patterns between C and C++ while
 * allowing full customization of language-specific details.
 *
 * @param options - Configuration options for the fragments
 * @returns A LanguageSpecificFragments object for the specified language
 */
export function createCFamilyFragments(
  options: CFamilyFragmentsOptions,
): LanguageSpecificFragments {
  const {
    headerExtension,
    externalHeaderExamples,
    externalRefsAdditionalText = "",
    constantsPrefix = "",
    enumDescription,
    publicFunctionsOrMethodsDescription,
    usePublicMethods,
    kindOverride,
    integrationInstructions,
    dbMechanismMappings,
  } = options;

  const fragments: LanguageSpecificFragments = {
    INTERNAL_REFS: `A list of #include directives for project headers (quoted includes like #include "myheader${headerExtension}") belonging to this same application (do not include system headers${externalRefsAdditionalText} or third-party library headers)`,
    EXTERNAL_REFS: `A list of #include directives for system${externalRefsAdditionalText} and library headers (angle bracket includes like #include ${externalHeaderExamples}) that are external to this application`,
    PUBLIC_CONSTANTS: `A list of public constants including ${constantsPrefix}#define macros, const variables, and ${enumDescription} (name, value, and purpose)`,
    INTEGRATION_INSTRUCTIONS: integrationInstructions,
    DB_MECHANISM_MAPPING: createDbMechanismInstructions(dbMechanismMappings),
  };

  // Add either PUBLIC_FUNCTIONS or PUBLIC_METHODS based on configuration
  if (usePublicMethods) {
    return {
      ...fragments,
      PUBLIC_METHODS: publicFunctionsOrMethodsDescription,
      KIND_OVERRIDE: kindOverride,
    };
  }

  return {
    ...fragments,
    PUBLIC_FUNCTIONS: publicFunctionsOrMethodsDescription,
  };
}

// Re-export utilities for use in C and C++ fragment files
export { MECHANISM_DESCRIPTIONS, dbMech };
