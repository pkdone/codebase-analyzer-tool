import { getSchemaSpecificSanitizerConfig } from "../prompts/config/schema-specific-sanitizer.config";

/**
 * Centralized export of the schema-specific sanitizer configuration.
 * This provides the domain-specific sanitization rules for JSON processing in LLM responses.
 *
 * The sanitizer config is passed per-call in LLM completion options rather than at module-level,
 * allowing different calls to use different sanitization rules if needed.
 */
export { getSchemaSpecificSanitizerConfig };
