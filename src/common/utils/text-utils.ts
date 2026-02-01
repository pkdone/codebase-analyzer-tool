/**
 * Count the lines in a piece of text.
 * Uses a simple for-loop with charCodeAt for maximum performance.
 * V8 heavily optimizes this pattern, making it faster than regex/iterator approaches.
 */
export function countLines(text: string): number {
  if (text.length === 0) return 1;

  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      // 10 is the char code for \n
      count++;
    }
  }

  return count;
}

/**
 * Convert camelCase or compound words to space-separated words with proper capitalization.
 * Example: "camelCaseString" -> "Camel Case String"
 */
export function convertToDisplayName(text: string): string {
  const spacedText = text.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spacedText.replace(/\b\w/g, (char) => char.toUpperCase());
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
