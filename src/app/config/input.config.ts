/**
 * Centralized configuration for all input file paths.
 * Provides a single source of truth for all external file inputs the application uses.
 */

const INPUT_BASE_PATH = "./input";

export const inputConfig = {
  /**
   * Base path for all input files
   */
  BASE_PATH: INPUT_BASE_PATH,

  /**
   * Path to file containing user questions/prompts for querying
   */
  QUESTIONS_PROMPTS_FILEPATH: `${INPUT_BASE_PATH}/questions.prompts`,

  /**
   * Path to folder containing requirement prompt files
   */
  REQUIREMENTS_PROMPTS_FOLDERPATH: `${INPUT_BASE_PATH}/requirements`,

  /**
   * Regex pattern to match requirement prompt files
   */
  REQUIREMENTS_FILE_REGEX: /requirement\d+\.prompt$/i,
} as const;
