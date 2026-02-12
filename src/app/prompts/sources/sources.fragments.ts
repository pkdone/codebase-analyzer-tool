/**
 * Barrel file for source prompt fragments.
 *
 * This module provides convenient re-exports from the fragments subfolder,
 * along with the LanguageSpecificFragments type for consumers who need it.
 */

// Re-export type for consumers
export type { LanguageSpecificFragments } from "./sources.types";

// Re-export PRECONFIGURED_INSTRUCTION_SETS from its dedicated module
export { PRECONFIGURED_INSTRUCTION_SETS } from "./fragments";
