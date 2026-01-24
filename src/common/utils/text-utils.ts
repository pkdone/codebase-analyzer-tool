/**
 * Count the lines in a piece of text.
 * Uses matchAll iterator (ES2020) to avoid allocating an array of substrings,
 * providing better memory efficiency for large source files.
 */
export function countLines(text: string): number {
  let count = 1;

  for (const _ of text.matchAll(/\n/g)) {
    count++;
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
