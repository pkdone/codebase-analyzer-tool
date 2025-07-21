import { appConfig } from "../../config/app.config";
import { getFileExtension } from "../../common/utils/path-utils";
import { readFile } from "../../common/utils/fs-utils";

/**
 * Merge the content of all source files.
 */
export async function mergeSourceFilesIntoMarkdownCodeblock(
  filepaths: string[],
  srcDirPath: string,
): Promise<string> {
  const contentParts: string[] = [];

  for (const filepath of filepaths) {
    const relativeFilepath = filepath.replace(`${srcDirPath}/`, "");
    const type = getFileExtension(filepath).toLowerCase();
    if ((appConfig.BINARY_FILE_EXTENSION_IGNORE_LIST as readonly string[]).includes(type)) continue; // Skip file if it has binary content
    const content = await readFile(filepath);
    contentParts.push(`\n\`\`\` ${relativeFilepath}\n${content.trim()}\n\`\`\`\n`);
  }

  return contentParts.join("").trim();
}
