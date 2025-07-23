import { getFileExtension } from "../../common/utils/path-utils";
import { readFile } from "../../common/utils/fs-utils";

/**
 * Merge the content of all source files.
 */
export async function mergeSourceFilesIntoMarkdownCodeblock(
  filepaths: string[],
  srcDirPath: string,
  ignoreList: readonly string[],
): Promise<string> {
  const contentParts: string[] = [];

  for (const filepath of filepaths) {
    const relativeFilepath = filepath.replace(`${srcDirPath}/`, "");
    const type = getFileExtension(filepath).toLowerCase();
    if (ignoreList.includes(type)) continue; // Skip file if it has binary content
    const content = await readFile(filepath);
    contentParts.push(`\n\`\`\` ${relativeFilepath}\n${content.trim()}\n\`\`\`\n`);
  }

  return contentParts.join("").trim();
}
