import { Sanitizer } from "./sanitizers-types";

/**
 * Removes trailing commas from JSON-like strings.
 */
export const removeTrailingCommas: Sanitizer = (input) => {
  const updated = input.replace(/,\s*([}\]])/g, "$1");
  return updated === input
    ? { content: input, changed: false }
    : { content: updated, changed: true, description: "Removed trailing commas" };
};
