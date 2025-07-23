/**
 * Convert camelCase or compound words to space-separated words with proper capitalization.
 * Example: "camelCaseString" -> "Camel Case String"
 */
export function convertToDisplayName(text: string): string {
  const spacedText = text.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spacedText.replace(/\b\w/g, (char) => char.toUpperCase());
}
/**
 * Count the lines in a piece of text.
 */
export function countLines(text: string): number {
  return text.split("\n").length;
}

/**
 *  Merges an array of string seperated by newlines unless a different sepeator specified.
 */
export function joinArrayWithSeparators(lines: string[], separator = "\n", prefix = ""): string {
  return lines.map((line) => `${prefix}${line}`).join(separator);
}
