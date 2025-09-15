/**
 * Paths and pattern configuration
 */
export const pathsConfig = {
  TRAILING_SLASH_PATTERN: /\/$/, //Regex pattern to match trailing slash at end of string
  REQUIREMENTS_PROMPTS_FOLDERPATH: "./input/requirements",
  REQUIREMENTS_FILE_REGEX: /requirement\d+\.prompt$/i,
  SAMPLE_PROMPT_FILEPATH: "./input/sample.prompt",
  QUESTIONS_PROMPTS_FILEPATH: "./input/questions.prompts",
  APP_DESCRIPTION_KEY: "appDescription",
} as const;
