import { promises as fs } from "fs";
import { logErr } from "../utils/logging";

/**
 * Sort files by size, largest first.
 * This is useful for distributing work more evenly when processing files concurrently,
 * as larger files typically take longer to process.
 *
 * @param filepaths - Array of file paths to sort
 * @returns Promise resolving to sorted array of file paths (largest first)
 */
export async function sortFilesBySize(filepaths: string[]): Promise<string[]> {
  // Use allSettled to ensure we always process all files even if some stats fail
  const statResults = await Promise.allSettled(filepaths.map(async (fp) => fs.stat(fp)));
  const filesWithSizes = statResults.map((result, idx) => {
    const filepath = filepaths[idx];
    if (result.status === "fulfilled") {
      return { filepath, size: result.value.size };
    }
    logErr(`Unable to get file size for: ${filepath}`, result.reason);
    return { filepath, size: 0 };
  });

  // Use toSorted (ES2023) to avoid mutating the intermediate array
  return filesWithSizes.toSorted((a, b) => b.size - a.size).map((entry) => entry.filepath);
}
