import { promises as fs } from "fs";
import path from "path";
import { commonConstants } from "../constants";
import { ensureDirectoryExists } from "./directory-operations";

/**
 * Read content from a file
 */
export async function readFile(filepath: string): Promise<string> {
  return fs.readFile(filepath, commonConstants.UTF8_ENCODING);
}

/**
 * Write content to a file.
 * Ensures the directory exists before writing.
 */
export async function writeFile(filepath: string, content: string): Promise<void> {
  const dirPath = path.dirname(filepath);
  await ensureDirectoryExists(dirPath);
  await fs.writeFile(filepath, content, commonConstants.UTF8_ENCODING);
}

/**
 * Append content to a file.
 */
export async function appendFile(filepath: string, content: string): Promise<void> {
  await fs.appendFile(filepath, content, commonConstants.UTF8_ENCODING);
}

/**
 * Write binary data to a file.
 * Ensures the directory exists before writing.
 */
export async function writeBinaryFile(filepath: string, buffer: Buffer): Promise<void> {
  const dirPath = path.dirname(filepath);
  await ensureDirectoryExists(dirPath);
  await fs.writeFile(filepath, buffer);
}
