import { promises as fs } from "fs";
import path from "path";
import { ensureDirectoryExists } from "./directory-operations";
import { ENCODING_UTF8 } from "../constants";

/**
 * Read content from a file
 */
export async function readFile(filepath: string): Promise<string> {
  return fs.readFile(filepath, ENCODING_UTF8);
}

/**
 * Write content to a file.
 * Ensures the directory exists before writing.
 */
export async function writeFile(filepath: string, content: string): Promise<void> {
  const dirPath = path.dirname(filepath);
  await ensureDirectoryExists(dirPath);
  await fs.writeFile(filepath, content, ENCODING_UTF8);
}
