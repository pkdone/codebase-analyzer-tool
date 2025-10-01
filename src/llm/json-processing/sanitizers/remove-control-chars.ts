import { Sanitizer } from "./sanitizers-types";

/**
 * Remove zero-width + non-printable control chars (except \r\n\t)
 */
export const removeControlChars: Sanitizer = (input) => {
  const cleaned = strip(input);
  return cleaned === input
    ? { content: input, changed: false }
    : { content: cleaned, changed: true, description: "Removed control / zero-width characters" };
};

/**
 * Remove zero-width + non-printable control chars (except \r\n\t)
 * Uses regex for a more declarative and maintainable approach
 */
function strip(input: string): string {
  if (!input) return input;
  // Regex matches:
  // \u0000-\u0008: control chars before tab
  // \u000B-\u000C: vertical tab and form feed
  // \u000E-\u001F: control chars after carriage return
  // \u200B-\u200D: zero-width spaces
  // \uFEFF: zero-width no-break space (BOM)
  // Preserves: \t (0x09), \n (0x0A), \r (0x0D)
  // eslint-disable-next-line no-control-regex
  const controlCharRegex = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u200B-\u200D\uFEFF]/g;
  return input.replace(controlCharRegex, "");
}
