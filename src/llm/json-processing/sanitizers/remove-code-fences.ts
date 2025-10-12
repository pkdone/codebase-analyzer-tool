import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "./sanitization-steps.constants";

/**
 * Removes markdown code fences from LLM-generated content.
 *
 * ## Purpose
 * LLMs often wrap JSON responses in markdown code blocks, especially when
 * they're instructed to provide formatted output or when they naturally
 * format their responses for readability.
 *
 * ## Patterns Fixed
 * - Generic fences: \`\`\` ... \`\`\`
 * - JSON fences: \`\`\`json ... \`\`\`
 * - JavaScript fences: \`\`\`javascript ... \`\`\`
 * - TypeScript fences: \`\`\`ts ... \`\`\`
 *
 * ## Examples
 * Before: \`\`\`json\n{ "name": "value" }\n\`\`\`
 * After:  { "name": "value" }
 *
 * ## Implementation Notes
 * - Processes patterns in order from most specific to most generic
 * - Uses replaceAll to handle multiple occurrences
 * - Early returns if no backticks found for performance
 *
 * ## Limitations
 * - Does not validate that fences are properly paired
 * - Removes all fence markers regardless of nesting
 * - Does not preserve intentional backticks within JSON strings
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with fences removed if found, or original if unchanged
 */
export const removeCodeFences: Sanitizer = (input) => {
  if (!input.includes("```")) return { content: input, changed: false };

  // Regexes to match code fences for json, javascript, typescript, and generic
  const FENCE_REGEXES = [/```json\s*/gi, /```javascript\s*/gi, /```ts\s*/gi, /```/g] as const;

  let updated = input;
  for (const r of FENCE_REGEXES) {
    updated = updated.replaceAll(r, "");
  }
  if (updated !== input) {
    return { content: updated, changed: true, description: SANITIZATION_STEP.REMOVED_CODE_FENCES };
  }
  return { content: input, changed: false };
};
