/**
 * Shutdown behavior types for LLM providers.
 */

/**
 * Enum to define the shutdown behavior required by an LLM provider.
 * This abstracts provider-specific shutdown requirements from the consuming code.
 */
export const ShutdownBehavior = {
  /** Provider can be shut down gracefully via close() method */
  GRACEFUL: "graceful",
  /** Provider requires process.exit() due to SDK limitations (e.g., gRPC connections) */
  REQUIRES_PROCESS_EXIT: "requires_process_exit",
} as const;
export type ShutdownBehavior = (typeof ShutdownBehavior)[keyof typeof ShutdownBehavior];
