import { promises as fs, Dirent } from "fs";
import path from "path";
import glob, { Entry } from "fast-glob";
import { logErr } from "../utils/logging";
import type { FileDiscoveryConfig } from "./file-filter.types";

/**
 * Type guard to check if a fast-glob entry has the expected structure with stats.
 * Used when glob is called with `stats: true` option to safely access entry properties.
 *
 * @param entry - The entry returned by fast-glob
 * @returns True if the entry has the expected Entry structure with path and optional stats
 */
function isGlobEntryWithStats(entry: unknown): entry is Entry {
  if (!entry || typeof entry !== "object") return false;
  const obj = entry as Record<string, unknown>;

  if (typeof obj.path !== "string") return false;
  // stats is optional but if present should be an object
  if (obj.stats !== undefined && (typeof obj.stats !== "object" || obj.stats === null)) {
    return false;
  }

  return true;
}

/**
 * Builds glob ignore patterns from file discovery configuration.
 * Centralizes pattern construction to avoid duplication.
 */
function buildIgnorePatterns(config: FileDiscoveryConfig): string[] {
  const { folderIgnoreList, filenameIgnorePrefix, filenameIgnoreList = [] } = config;
  return [
    ...folderIgnoreList.map((folder) => `**/${folder}/**`),
    `**/${filenameIgnorePrefix}*`,
    ...filenameIgnoreList.map((filename) => `**/${filename}`),
  ];
}

/**
 * Get the handle of the files in a directory
 */
export async function listDirectoryEntries(dirpath: string): Promise<Dirent[]> {
  return fs.readdir(dirpath, { withFileTypes: true });
}

/**
 * Deletes all files and folders in a directory, except for files matching the ignore criteria.
 * By default, `.gitignore` is preserved.
 * @param dirPath - The directory to clear
 * @param ignore - Either an array of filenames to ignore, or a filter function that returns true for files to ignore
 */
export async function clearDirectory(
  dirPath: string,
  ignore: string[] | ((filename: string) => boolean) = [".gitignore"],
): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    const removalPromises: Promise<void>[] = [];

    // Create a unified shouldIgnore function
    const shouldIgnore = Array.isArray(ignore) ? (file: string) => ignore.includes(file) : ignore;

    for (const file of files) {
      if (shouldIgnore(file)) continue;

      const filePath = path.join(dirPath, file);
      const promise = fs.rm(filePath, { recursive: true, force: true }).catch((error: unknown) => {
        logErr(
          `When clearing directory '${dirPath}', unable to remove the item: ${filePath}`,
          error,
        );
      });
      removalPromises.push(promise);
    }

    await Promise.allSettled(removalPromises);
  } catch (error: unknown) {
    logErr(`Unable to read directory for clearing: ${dirPath}`, error);
  }

  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (mkdirError: unknown) {
    logErr(`Failed to ensure directory exists after clearing: ${dirPath}`, mkdirError);
  }
}

/**
 * Build the list of files descending from a directory.
 * Files are returned in the natural (arbitrary) order they are discovered by glob.
 *
 * @param srcDirPath - The root directory to search
 * @param config - Configuration for file discovery filtering
 * @returns Promise resolving to array of absolute file paths
 */
export async function findFilesRecursively(
  srcDirPath: string,
  config: FileDiscoveryConfig,
): Promise<string[]> {
  const globOptions = {
    cwd: srcDirPath,
    absolute: true,
    onlyFiles: true,
    ignore: buildIgnorePatterns(config),
  };

  const files = await glob("**/*", globOptions);
  return files;
}

/**
 * Result type for files discovered with their sizes.
 */
export interface FileWithSize {
  /** Absolute path to the file */
  filepath: string;
  /** File size in bytes */
  size: number;
}

/**
 * Build the list of files with their sizes descending from a directory.
 * Uses fast-glob's stats option to retrieve file sizes in a single pass,
 * avoiding separate fs.stat calls for each file.
 *
 * Files are returned sorted by size (largest first) for optimal work distribution
 * during concurrent processing.
 *
 * @param srcDirPath - The root directory to search
 * @param config - Configuration for file discovery filtering
 * @returns Promise resolving to array of file paths with sizes, sorted by size descending
 */
export async function findFilesWithSize(
  srcDirPath: string,
  config: FileDiscoveryConfig,
): Promise<FileWithSize[]> {
  const globOptions = {
    cwd: srcDirPath,
    absolute: true,
    onlyFiles: true,
    ignore: buildIgnorePatterns(config),
    stats: true, // Include file stats in the result
  };

  const entries = await glob("**/*", globOptions);

  // Map entries to FileWithSize and sort by size descending
  const filesWithSize: FileWithSize[] = entries.map((entry) => {
    // When stats: true, fast-glob returns Entry objects with stats property
    if (isGlobEntryWithStats(entry)) {
      return {
        filepath: entry.path,
        size: entry.stats?.size ?? 0,
      };
    }
    // Fallback for unexpected entry format (should not happen with stats: true)
    // Handle both string entries and object entries that failed the type guard
    const pathStr = typeof entry === "string" ? entry : (entry as { path: string }).path;
    return { filepath: pathStr, size: 0 };
  });

  // Sort by size descending (largest first) for better work distribution
  return filesWithSize.toSorted((a, b) => b.size - a.size);
}

/**
 * Ensures a directory exists by creating it if it doesn't exist
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: unknown) {
    logErr(`Failed to create directory: ${dirPath}`, error);
    throw error;
  }
}
