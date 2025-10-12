import { readFile } from "./file-operations";

/**
 * Reads the contents of a file and returns an array of lines, filtering out blank lines and lines
 * starting with #.
 */
export async function readAndFilterLines(filePath: string): Promise<string[]> {
  const fileContents = await readFile(filePath);
  const lines = fileContents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return lines;
}
