import { Sanitizer } from "./sanitizers-types";
import { SANITIZATION_STEP } from "./sanitization-steps.constants";

/**
 * Attempts to complete obviously truncated JSON structures by:
 * 1. Closing any open string literal at EOF
 * 2. Balancing unmatched object/array delimiters (objects before arrays when both present)
 *
 * This logic was previously embedded inside the progressive parsing flow and has been extracted
 * so it can be unit tested independently and re-ordered within sanitation pipelines later if needed.
 */
export const completeTruncatedStructures: Sanitizer = (input) => {
  const trimmed = input.trim();
  if (!trimmed) return { content: input, changed: false };

  if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
    // Already appears structurally closed – nothing to do
    return { content: input, changed: false };
  }

  // Track structure with a stack for correct closure ordering
  const stack: string[] = [];
  let inString = false;
  let escapeNext = false;
  for (const ch of trimmed) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === "\\") {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}" || ch === "]") stack.pop();
    }
  }

  let sanitized = trimmed;
  if (inString) sanitized += '"';
  while (stack.length) {
    const opener = stack.pop();
    sanitized += opener === "{" ? "}" : "]";
  }

  if (sanitized === input) return { content: input, changed: false };
  return {
    content: sanitized,
    changed: true,
    description: SANITIZATION_STEP.COMPLETED_TRUNCATED_STRUCTURES,
  };
};
