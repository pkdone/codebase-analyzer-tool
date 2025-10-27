/**
 * Capture module tokens for dependency injection.
 * These tokens are used to identify and inject capture-related dependencies.
 */
export const captureTokens = {
  FileSummarizer: Symbol("FileSummarizer"),
  CodebaseToDBLoader: Symbol("CodebaseToDBLoader"),
  CodebaseQueryProcessor: Symbol("CodebaseQueryProcessor"),
} as const;

export type CaptureToken = keyof typeof captureTokens;
