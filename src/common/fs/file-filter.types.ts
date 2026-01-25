/**
 * Configuration for filtering files during directory traversal and aggregation.
 * Groups related filter parameters for cleaner API signatures and easier reuse.
 */
export interface FileFilterConfig {
  /** List of folder names to ignore during traversal (e.g., [".git", "node_modules"]) */
  folderIgnoreList: readonly string[];
  /** Prefix for filenames to ignore (e.g., "." for hidden files) */
  filenameIgnorePrefix: string;
  /** List of binary/non-text file extensions to skip (e.g., ["png", "jpg"]) */
  binaryFileExtensionIgnoreList: readonly string[];
  /** List of specific filenames to ignore (e.g., ["package-lock.json"]) */
  filenameIgnoreList?: readonly string[];
}

/**
 * Configuration for file discovery during traversal.
 * A subset of FileFilterConfig used by findFilesRecursively.
 */
export interface FileDiscoveryConfig {
  /** List of folder names to ignore during traversal */
  folderIgnoreList: readonly string[];
  /** Prefix for filenames to ignore */
  filenameIgnorePrefix: string;
  /** List of specific filenames to ignore */
  filenameIgnoreList?: readonly string[];
}
