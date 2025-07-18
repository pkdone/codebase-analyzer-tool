import path from "path";

/**
 * Get the name of a project from its path.
 */
export function getProjectNameFromPath(filePath: string): string {
  const normalisedPath = filePath.endsWith("/") ? filePath.slice(0, -1) : filePath;
  return path.basename(normalisedPath);
}

/**
 * Returns the suffix of a filename from a full file path.
 */
export function getFileSuffix(filepath: string): string {
  return path.extname(filepath).slice(1); // .slice(1) to remove the leading dot
}
