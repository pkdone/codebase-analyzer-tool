import { promises as fs } from "fs";
import { commonConstants } from "../constants";

/**
 * Read content from a file
 */
export async function readFile(filepath: string): Promise<string> {
  return fs.readFile(filepath, commonConstants.UTF8_ENCODING);
}

/**
 * Write content to a file.
 */
export async function writeFile(filepath: string, content: string): Promise<void> {
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
 */
export async function writeBinaryFile(filepath: string, buffer: Buffer): Promise<void> {
  await fs.writeFile(filepath, buffer);
}
