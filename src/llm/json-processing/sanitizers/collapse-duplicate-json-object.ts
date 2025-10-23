import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Collapses a pattern where the exact same JSON object text has been duplicated
 * back-to-back (a behaviour sometimes seen in LLM output) down to a single
 * instance. This is intentionally conservative: it only acts when the two
 * objects are byte-for-byte identical to avoid accidentally dropping content.
 */
export const collapseDuplicateJsonObject: Sanitizer = (input) => {
  const dupPattern = /^(\{[\s\S]+\})\s*\1\s*$/;
  if (!dupPattern.test(input)) return { content: input, changed: false };
  return {
    content: input.replace(dupPattern, "$1"),
    changed: true,
    description: SANITIZATION_STEP.COLLAPSED_DUPLICATE_JSON,
  };
};
