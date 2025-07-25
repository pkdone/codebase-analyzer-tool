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
  const contentPromises = filepaths.map(async (filepath) => {
    const relativeFilepath = filepath.replace(`${srcDirPath}/`, "");
    const type = getFileExtension(filepath).toLowerCase();
    if (ignoreList.includes(type)) return ""; // Skip file if it has binary content
    const content = await readFile(filepath);
    return `\n\`\`\` ${relativeFilepath}\n${content.trim()}\n\`\`\`\n`;
  });
  const contentParts = await Promise.all(contentPromises);
  return contentParts.filter(part => part !== "").join("").trim();
}
