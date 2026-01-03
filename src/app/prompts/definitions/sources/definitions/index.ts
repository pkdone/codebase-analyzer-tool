/**
 * Central export for all source prompt definitions.
 * This module aggregates definitions from logical groups.
 */

export {
  type SourceConfigEntry,
  type StandardCodeConfigOptions,
  createDependencyConfig,
  createSimpleConfig,
  createStandardCodeConfig,
} from "./shared-utilities";

export { standardCodeDefinitions } from "./standard-code.definitions";
export { dependencyFileDefinitions } from "./dependency-files.definitions";
export { specialFileDefinitions } from "./special-files.definitions";
