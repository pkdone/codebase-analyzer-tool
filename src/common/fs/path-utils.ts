import path from "path";

/**
 * Get the base name from a file or directory path.
 * Returns the last segment of the path, which could be a file or directory name.
 */
export function getBaseNameFromPath(filePath: string): string {
  const normalisedPath = filePath.endsWith("/") ? filePath.slice(0, -1) : filePath;
  return path.basename(normalisedPath);
}

/**
 * Returns the extension of a filename from a full file path.
 */
export function getFileExtension(filepath: string): string {
  return path.extname(filepath).slice(1); // .slice(1) to remove the leading dot
}
