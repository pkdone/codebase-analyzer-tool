import { Sanitizer } from "./sanitizers-types";

// Regexes to match code fences for json, javascript, typescript, and generic
const FENCE_REGEXES = [/```json\s*/gi, /```javascript\s*/gi, /```ts\s*/gi, /```/g];

/**
 * Removes code fences from the input string.
 */
export const removeCodeFences: Sanitizer = (input) => {
  if (!input.includes("```")) return { content: input, changed: false };
  let updated = input;
  for (const r of FENCE_REGEXES) {
    updated = updated.replaceAll(r, "");
  }
  if (updated !== input) {
    return { content: updated, changed: true, description: "Removed code fences" };
  }
  return { content: input, changed: false };
};
