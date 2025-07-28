import { promises as fs, Dirent } from "fs";
import path from "path";
import glob from "fast-glob";
import { logErrorMsgAndDetail } from "./error-utils";
const UTF8_ENCODING = "utf8";

/**
 * Read content from a file
 */
export async function readFile(filepath: string): Promise<string> {
  return fs.readFile(filepath, UTF8_ENCODING);
}

/**
 * Write content to a file.
 */
export async function writeFile(filepath: string, content: string): Promise<void> {
  await fs.writeFile(filepath, content, UTF8_ENCODING);
}

/**
 * Append content to a file.
 */
export async function appendFile(filepath: string, content: string): Promise<void> {
  await fs.appendFile(filepath, content, UTF8_ENCODING);
}

/**
 * Get the handle of the files in a directory
 */
export async function readDirContents(dirpath: string): Promise<Dirent[]> {
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
 * Reads the contents of a file and returns an array of lines, filtering out blank lines and lines
 * starting with #.
 */
export async function getTextLines(filePath: string): Promise<string[]> {
  const fileContents = await readFile(filePath);
  const lines = fileContents
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  return lines;
}

/**
 * Build the list of files descending from a directory
 *
 * If `orderByLargestSizeFileFirst` is true, the files are sorted by size, largest first, otherwise
 * they are just ordered in the natural (abitrary) order they are discovered by glob.
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

  if (orderByLargestSizeFileFirst) {
    // Use fast-glob's stats option to get file stats efficiently in a single operation
    const filesWithStats = await glob("**/*", {
      cwd: srcDirPath,
      absolute: true,
      onlyFiles: true,
      ignore: ignorePatterns,
      stats: true,
    });
    const validFilesWithStats: { path: string; size: number }[] = [];

    for (const entry of filesWithStats) {
      if (entry.stats && typeof entry.stats.size === "number") {
        validFilesWithStats.push({
          path: entry.path,
          size: entry.stats.size,
        });
      } else {
        logErrorMsgAndDetail(
          `Unable to get file size for: ${entry.path}`,
          new Error("Stats not available"),
        );
      }
    }

    return validFilesWithStats.toSorted((a, b) => b.size - a.size).map(({ path }) => path);
  }

  // If not ordering by size, return files in natural ordering from glob
  const files = await glob("**/*", {
    cwd: srcDirPath,
    absolute: true,
    onlyFiles: true,
    ignore: ignorePatterns,
  });

  return files;
}
