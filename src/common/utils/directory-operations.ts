import { promises as fs, Dirent } from "fs";
import path from "path";
import glob, { Entry } from "fast-glob";
import { logErrorMsgAndDetail } from "./logging";

/**
 * Get the handle of the files in a directory
 */
export async function listDirectoryEntries(dirpath: string): Promise<Dirent[]> {
  return fs.readdir(dirpath, { withFileTypes: true });
}

/**
 * Deletes all files and folders in a directory, except for a file named `.gitignore`.
 */
export async function clearDirectory(dirPath: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    const removalPromises = files
      .filter((file) => file !== ".gitignore")
      .map(async (file) => {
        const filePath = path.join(dirPath, file);
        try {
          await fs.rm(filePath, { recursive: true, force: true });
        } catch (error: unknown) {
          logErrorMsgAndDetail(
            `When clearing directory '${dirPath}', unable to remove the item: ${filePath}`,
            error,
          );
        }
      });

    await Promise.allSettled(removalPromises);
  } catch (error: unknown) {
    logErrorMsgAndDetail(`Unable to read directory for clearing: ${dirPath}`, error);
  }

  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (mkdirError: unknown) {
    logErrorMsgAndDetail(
      `Failed to ensure directory exists after clearing: ${dirPath}`,
      mkdirError,
    );
  }
}

/**
 * Build the list of files descending from a directory
 *
 * If `orderByLargestSizeFileFirst` is true, the files are sorted by size, largest first, otherwise
 * they are just ordered in the natural (arbitrary) order they are discovered by glob.
 */
export async function findFilesRecursively(
  srcDirPath: string,
  folderIgnoreList: readonly string[],
  filenameIgnorePrefix: string,
  orderByLargestSizeFileFirst = false,
): Promise<string[]> {
  const ignorePatterns = [
    ...folderIgnoreList.map((folder) => `**/${folder}/**`),
    `**/${filenameIgnorePrefix}*`,
  ];

  // Build glob options dynamically to avoid code duplication
  const globOptions = {
    cwd: srcDirPath,
    absolute: true,
    onlyFiles: true,
    ignore: ignorePatterns,
    ...(orderByLargestSizeFileFirst && { stats: true }),
  };

  const files = await glob("**/*", globOptions);

  if (orderByLargestSizeFileFirst) {
    // When stats is true, glob returns Entry[] with stats property
    const filesWithStats = files as unknown as Entry[];

    // Helper function to check if entry has valid stats
    const hasValidStats = (entry: Entry): entry is Entry & { stats: { size: number } } => {
      if (entry.stats && typeof entry.stats.size === "number") {
        return true;
      } else {
        logErrorMsgAndDetail(
          `Unable to get file size for: ${entry.path}`,
          new Error("Stats not available"),
        );
        return false;
      }
    };

    return filesWithStats
      .filter(hasValidStats)
      .toSorted((a, b) => b.stats.size - a.stats.size)
      .map((entry) => entry.path);
  }

  // When stats is not set, glob returns string[]
  return files;
}

/**
 * Ensures a directory exists by creating it if it doesn't exist
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: unknown) {
    logErrorMsgAndDetail(`Failed to create directory: ${dirPath}`, error);
    throw error;
  }
}
