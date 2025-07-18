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
