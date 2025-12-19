import { readFile } from "./file-operations";

/**
 * Reads the contents of a file and returns an array of trimmed lines, applying a filter predicate.
 * By default, filters out blank lines and lines starting with #.
 * @param filePath - The path to the file to read
 * @param filter - A predicate function to filter lines. Receives each trimmed line and returns true to keep it.
 */
export async function readAndFilterLines(
  filePath: string,
  filter: (line: string) => boolean = (line) => line !== "" && !line.startsWith("#"),
): Promise<string[]> {
  const fileContents = await readFile(filePath);
  return fileContents
    .split("\n")
    .map((line) => line.trim())
    .filter(filter);
}
