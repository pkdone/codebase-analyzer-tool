/**
 * Configuration for input files and codebase querying features.
 * Contains paths to input files and tuning parameters for vector search operations.
 */

const INPUT_BASE_PATH = "./input";

export const queryingInputConfig = {
  /**
   * Path to file containing user questions/prompts for querying
   */
  QUESTIONS_PROMPTS_FILEPATH: `${INPUT_BASE_PATH}/questions.prompts`,

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




