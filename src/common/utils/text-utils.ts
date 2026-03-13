/**
 * Count the physical lines in a piece of text, matching standard LoC tool behavior.
 * A trailing newline terminates the last line rather than starting a new empty one.
 * Uses a simple for-loop with charCodeAt for maximum performance.
 * V8 heavily optimizes this pattern, making it faster than regex/iterator approaches.
 */
export function countLines(text: string): number {
  if (text.length === 0) return 0;

  let newlineCount = 0;

  for (let i = 0; i < text.length; i++) {
    if (text.codePointAt(i) === 10) newlineCount++;
  }

  // If text doesn't end with \n, there's an unterminated final line
  if (text.codePointAt(text.length - 1) !== 10) return newlineCount + 1;

  return newlineCount;
}

/**
 * Convert camelCase or compound words to space-separated words with proper capitalization.
 * Example: "camelCaseString" -> "Camel Case String"
 */
export function camelCaseToTitleCase(text: string): string {
  // Use lookbehind/lookahead to insert space between lowercase and uppercase
  const spacedText = text.replaceAll(/(?<=[a-z])(?=[A-Z])/g, " ");
  return spacedText.replaceAll(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Merges an array of string seperated by newlines unless a different sepeator specified.
 */
export function joinArrayWithSeparators(
  lines: readonly string[],
  separator = "\n",
  prefix = "",
): string {
  return lines.map((line) => `${prefix}${line}`).join(separator);
}
