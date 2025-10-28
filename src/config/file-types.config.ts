import { z } from "zod";

/**
 * Supported file types for metadata configuration.
 * Defined as a constant tuple to enable both runtime iteration and compile-time type safety.
 * The Zod schema `canonicalFileTypeSchema` is derived from this array to keep a single source of truth.
 */
export const CANONICAL_FILE_TYPES = [
  "java",
  "javascript",
  "default",
  "sql",
  "xml",
  "jsp",
  "markdown",
  "csharp",
  "ruby",
  "maven",
  "gradle",
  "ant",
  "npm",
  "python",
  "dotnet-proj",
  "nuget",
  "ruby-bundler",
  "python-pip",
  "python-setup",
  "python-poetry",
  "shell-script",
  "batch-script",
  "jcl",
  "default",
] as const;

/** Inferred TypeScript type for canonical file types */
export type CanonicalFileType = (typeof CANONICAL_FILE_TYPES)[number];

/** Zod enum schema for canonical file types */
export const canonicalFileTypeSchema = z.enum(CANONICAL_FILE_TYPES);
