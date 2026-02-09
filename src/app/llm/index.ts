/**
 * Application-specific LLM utilities and configuration.
 *
 * This module contains LLM-related business logic that is specific to this application,
 * as opposed to the generic LLM utilities in `src/common/llm/`.
 *
 * Exports:
 * - `getLlmArtifactCorrections`: Configuration for fixing common LLM output artifacts
 * - `APP_PROVIDER_REGISTRY`: Singleton instance of the provider registry
 */
export { getLlmArtifactCorrections } from "./llm-artifact-corrections";
export { APP_PROVIDER_REGISTRY } from "./provider-registry";
