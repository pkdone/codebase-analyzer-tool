import type { Sanitizer } from "./sanitizers-types";

/** Fix over-escaped sequences within JSON string content. */
export function repairOverEscapedStringSequences(content: string): string {
  let fixed = content;
  fixed = fixed.replace(/\\\\\\'/g, "'"); // 5 backslashes + quote
  fixed = fixed.replace(/\\\\'/g, "'"); // 4 backslashes + quote
  fixed = fixed.replace(/\\'/g, "'"); // 3 backslashes + quote OR generic pattern
  fixed = fixed.replace(/\\\\\\'\\\./g, "'.");
  fixed = fixed.replace(/\\\\\\'\\\\\\'/g, "''"); // 5-backslash empty quotes
  fixed = fixed.replace(/\\'\\\./g, "'.");
  fixed = fixed.replace(/\\'\\\\'/g, "''");
  fixed = fixed.replace(/\\\\\\0/g, "\\0"); // reduce 5-backslash null
  fixed = fixed.replace(/\\\\0/g, "\\0"); // reduce 4-backslash null
  fixed = fixed.replace(/\\\\\s*,/g, ",");
  fixed = fixed.replace(/\\\\\s*\)/g, ")");
  fixed = fixed.replace(/\\,/g, ",");
  fixed = fixed.replace(/\\\)/g, ")");
  return fixed;
}

export const overEscapedSequencesSanitizer: Sanitizer = (input) => {
  const result = repairOverEscapedStringSequences(input);
  if (result !== input) {
    return { content: result, changed: true, description: "Fixed over-escaped sequences" };
  }
  return { content: input, changed: false };
};
