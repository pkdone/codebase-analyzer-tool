/**
 * Configuration for codebase querying features.
 * Contains tuning parameters for vector search operations.
 */
export const queryingConfig = {
  /**
   * Number of candidates to consider in vector search.
   * Higher values provide more comprehensive search but may impact performance.
   */
  VECTOR_SEARCH_NUM_CANDIDATES: 150,

  /**
   * Maximum number of results to return from vector search.
   * This limits the final result set after candidates are evaluated.
   */
  VECTOR_SEARCH_NUM_LIMIT: 6,
} as const;
