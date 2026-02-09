/**
 * File processing configuration with readonly arrays for immutability.
 * This is an application-wide configuration used by multiple components
 * (capture, insights) for consistent file handling rules.
 *
 * CODE_FILE_EXTENSIONS is derived from the unified file type registry.
 * To add a new language extension, update file-type-registry.ts.
 */

import { getEnabledCodeExtensions } from "./file-type-registry";

export const fileProcessingRules = {
  FOLDER_IGNORE_LIST: [
    ".git",
    "bin",
    "build",
    "docs",
    "input",
    "node_modules",
    ".vscode",
    "dist",
    "output",
    "tests",
  ] as const satisfies readonly string[],
  FILENAME_PREFIX_IGNORE: "test-",
  /**
   * List of specific filenames to ignore during codebase processing.
   * These files are typically auto-generated or contain no meaningful source code.
   */
  FILENAME_IGNORE_LIST: [
    "package-lock.json",
    ".gitignore",
    ".npmrc",
    ".nvmrc",
  ] as const satisfies readonly string[],
  BINARY_FILE_EXTENSION_IGNORE_LIST: [
    "aac",
    "abw",
    "arc",
    "avif",
    "avi",
    "azw",
    "bin",
    "bmp",
    "bz",
    "bz2",
    "cda",
    "doc",
    "docx",
    "eot",
    "epub",
    "gz",
    "gif",
    "ico",
    "ics",
    "jar",
    "jpeg",
    "jpg",
    "mid",
    "midi",
    "mp3",
    "mp4",
    "mpeg",
    "mpkg",
    "odp",
    "ods",
    "odt",
    "oga",
    "ogv",
    "ogx",
    "opus",
    "otf",
    "png",
    "pdf",
    "ppt",
    "pptx",
    "rar",
    "rtf",
    "svg",
    "tar",
    "tif",
    "tiff",
    "ttf",
    "vsd",
    "wav",
    "weba",
    "webm",
    "webp",
    "woff",
    "woff2",
    "xls",
    "xlsx",
    "xul",
    "zip",
    "3gp",
    "3g2",
    "7z",
    "ear",
    "war",
    "tar",
    "gz",
    "tgz",
  ] as const satisfies readonly string[],
  /**
   * List of file extensions that represent source code files.
   * Derived from the unified file type registry for single source of truth.
   */
  CODE_FILE_EXTENSIONS: getEnabledCodeExtensions(),
  /**
   * Canonical file types for build/dependency management files.
   * Used by BomDataProvider for Bill of Materials aggregation.
   */
  BOM_DEPENDENCY_CANONICAL_TYPES: [
    "maven",
    "gradle",
    "ant",
    "npm",
    "dotnet-proj",
    "nuget",
    "ruby-bundler",
    "python-pip",
    "python-setup",
    "python-poetry",
  ] as const satisfies readonly string[],
  /**
   * Canonical file types for scheduled job/batch process files.
   * Used by ScheduledJobDataProvider for job aggregation.
   */
  SCHEDULED_JOB_CANONICAL_TYPES: [
    "shell-script",
    "batch-script",
    "jcl",
  ] as const satisfies readonly string[],
} as const;

/**
 * Type alias for the fileProcessingRules value type.
 * Used for dependency injection to avoid circular type references.
 */
export type FileProcessingRulesType = typeof fileProcessingRules;
