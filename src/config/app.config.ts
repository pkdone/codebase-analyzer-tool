/**
 * Application configuration
 */
export const appConfig = {
  OUTPUT_DIR: "output",
  FOLDER_IGNORE_LIST: [
    ".git",
    "bin",
    "build",
    "node_modules",
    ".vscode",
    "dist",
    "output",
  ] as const,
  FILENAME_PREFIX_IGNORE: "test-",
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
  ] as const,
  CODE_FILE_EXTENSIONS: ["js", "ts", "java", "py", "sql"] as const,
  FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
    ["java", "java"],
    ["js", "javascript"],
    ["ts", "javascript"],
    ["javascript", "javascript"],
    ["typescript", "javascript"],
    ["ddl", "sql"],
    ["sql", "sql"],
    ["xml", "xml"],
    ["jsp", "jsp"],
    ["markdown", "markdown"],
    ["md", "markdown"],
  ]),
  FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
    ["readme", "markdown"],
    ["license", "markdown"],
    ["changelog", "markdown"],
  ]),
  DEFAULT_FILE_TYPE: "default",
  JAVA_FILE_TYPE: "java",
  MANIFEST_FILE_SUFFIX: ".manifest.js",
  PROVIDER_MANIFEST_EXPORT_SUFFIX: "ProviderManifest",
  PROVIDERS_FOLDER_PATH: "../providers",
  TRAILING_SLASH_PATTERN: /\/$/, //Regex pattern to match trailing slash at end of string
  REQUIREMENTS_PROMPTS_FOLDERPATH: "./input/requirements",
  REQUIREMENTS_FILE_REGEX: /requirement\d+\.prompt$/i,
  SAMPLE_PROMPT_FILEPATH: "./input/sample.prompt",
  QUESTIONS_PROMPTS_FILEPATH: "./input/questions.prompts",
  MAX_CONCURRENCY: 50,
  VECTOR_SEARCH_NUM_CANDIDATES: 150,
  VECTOR_SEARCH_NUM_LIMIT: 6,
  OUTPUT_SUMMARY_FILENAME: "codebase-report",
  OUTPUT_SUMMARY_HTML_FILE: "codebase-report.html",
  APP_DESCRIPTION_KEY: "appDescription",
  HTML_TEMPLATES_DIR: "templates",
  HTML_MAIN_TEMPLATE_FILE: "main.ejs",
} as const;
