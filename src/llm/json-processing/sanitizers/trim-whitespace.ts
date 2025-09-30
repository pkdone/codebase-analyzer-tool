import { Sanitizer } from "./sanitizers-types";

/**
 * Trims leading and trailing whitespace. Kept as a sanitizer for consistency so
 * ordering within a pipeline can be reasoned about / unit tested.
 */
export const trimWhitespace: Sanitizer = (input) => {
  const trimmed = input.trim();
  if (trimmed === input) return { content: input, changed: false };
  return { content: trimmed, changed: true, description: "Trimmed whitespace" };
};
