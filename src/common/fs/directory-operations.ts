import { promises as fs, Dirent } from "fs";
import path from "path";
import glob from "fast-glob";
import { logErrorMsgAndDetail } from "../utils/logging";

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
    const removalPromises: Promise<void>[] = [];

    for (const file of files) {
      if (file === ".gitignore") continue;

      const filePath = path.join(dirPath, file);
      const promise = fs.rm(filePath, { recursive: true, force: true }).catch((error: unknown) => {
        logErrorMsgAndDetail(
          `When clearing directory '${dirPath}', unable to remove the item: ${filePath}`,
          error,
        );
      });
      removalPromises.push(promise);
    }

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
 * Build the list of files descending from a directory.
 * Files are returned in the natural (arbitrary) order they are discovered by glob.
 */
export async function findFilesRecursively(
  srcDirPath: string,
  folderIgnoreList: readonly string[],
  filenameIgnorePrefix: string,
): Promise<string[]> {
  const ignorePatterns = [
    ...folderIgnoreList.map((folder) => `**/${folder}/**`),
    `**/${filenameIgnorePrefix}*`,
  ];

  const globOptions = {
    cwd: srcDirPath,
    absolute: true,
    onlyFiles: true,
    ignore: ignorePatterns,
  };

  const files = await glob("**/*", globOptions);
  return files;
}

/**
 * Sort files by size, largest first.
 * This is useful for distributing work more evenly when processing files concurrently.
 */
export async function sortFilesBySize(filepaths: string[]): Promise<string[]> {
  // Use allSettled to ensure we always process all files even if some stats fail
  const statResults = await Promise.allSettled(filepaths.map(async (fp) => fs.stat(fp)));
  const filesWithSizes = statResults.map((result, idx) => {
    const filepath = filepaths[idx];
    if (result.status === "fulfilled") {
      return { filepath, size: result.value.size };
    }
    logErrorMsgAndDetail(`Unable to get file size for: ${filepath}`, result.reason);
    return { filepath, size: 0 };
  });

  // Use toSorted (ES2023) to avoid mutating the intermediate array
  return filesWithSizes.toSorted((a, b) => b.size - a.size).map((entry) => entry.filepath);
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
