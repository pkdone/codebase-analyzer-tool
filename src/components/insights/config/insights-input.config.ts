/**
 * Configuration for insights input files.
 * Contains paths to requirement prompt files used for insight generation.
 */

const INPUT_BASE_PATH = "./input";

export const insightsInputConfig = {
  /**
   * Path to folder containing requirement prompt files
   */
  REQUIREMENTS_PROMPTS_FOLDERPATH: `${INPUT_BASE_PATH}/requirements`,

  /**
   * Regex pattern to match requirement prompt files
   */
  REQUIREMENTS_FILE_REGEX: /requirement\d+\.prompt$/i,
} as const;




