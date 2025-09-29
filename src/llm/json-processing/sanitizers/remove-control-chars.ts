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
 */
function strip(input: string): string {
  if (!input) return input;
  let out = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff) continue;
    if (code < 0x20 && code !== 9 && code !== 10 && code !== 13) continue;
    out += ch;
  }
  return out;
}
