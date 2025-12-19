import { readAndFilterLines } from "../../../src/common/fs/file-content-utils";
import { readFile } from "../../../src/common/fs/file-operations";

jest.mock("../../../src/common/fs/file-operations");

describe("file-content-utils", () => {
  describe("readAndFilterLines", () => {
    const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test("should filter out blank lines and lines starting with # by default", async () => {
      const fileContent = `line1
# comment
line2

line3
# another comment
line4`;
      mockReadFile.mockResolvedValue(fileContent);

      const result = await readAndFilterLines("/test/file.txt");

      expect(mockReadFile).toHaveBeenCalledWith("/test/file.txt");
      expect(result).toEqual(["line1", "line2", "line3", "line4"]);
    });

    test("should handle files with only comments and blank lines", async () => {
      const fileContent = `# comment 1
# comment 2

# comment 3`;
      mockReadFile.mockResolvedValue(fileContent);

      const result = await readAndFilterLines("/test/file.txt");

      expect(result).toEqual([]);
    });

    test("should handle empty files", async () => {
      mockReadFile.mockResolvedValue("");

      const result = await readAndFilterLines("/test/file.txt");

      expect(result).toEqual([]);
    });

    test("should trim lines by default", async () => {
      const fileContent = `  line with leading spaces
line with trailing spaces  
  line with both  `;
      mockReadFile.mockResolvedValue(fileContent);

      const result = await readAndFilterLines("/test/file.txt");

      expect(result).toEqual([
        "line with leading spaces",
        "line with trailing spaces",
        "line with both",
      ]);
    });

    test("should accept custom filter function", async () => {
      const fileContent = `line1
// comment
line2
// another comment
line3`;
      mockReadFile.mockResolvedValue(fileContent);

      // Custom filter for C-style comments (filter receives trimmed lines)
      const customFilter = (line: string) => line !== "" && !line.startsWith("//");

      const result = await readAndFilterLines("/test/file.txt", customFilter);

      expect(result).toEqual(["line1", "line2", "line3"]);
    });

    test("should handle custom filter that keeps all lines", async () => {
      const fileContent = `line1
# comment
line2

line3`;
      mockReadFile.mockResolvedValue(fileContent);

      // Filter that keeps everything
      const keepAllFilter = () => true;

      const result = await readAndFilterLines("/test/file.txt", keepAllFilter);

      expect(result).toEqual(["line1", "# comment", "line2", "", "line3"]);
    });

    test("should handle custom filter that removes all lines", async () => {
      const fileContent = `line1
line2
line3`;
      mockReadFile.mockResolvedValue(fileContent);

      // Filter that removes everything
      const removeAllFilter = () => false;

      const result = await readAndFilterLines("/test/file.txt", removeAllFilter);

      expect(result).toEqual([]);
    });

    test("should handle custom filter with complex logic", async () => {
      const fileContent = `TODO: something
FIXME: fix this
line1
NOTE: remember this
line2`;
      mockReadFile.mockResolvedValue(fileContent);

      // Keep only lines that don't start with keywords (filter receives trimmed lines)
      const customFilter = (line: string) =>
        !line.startsWith("TODO:") && !line.startsWith("FIXME:");

      const result = await readAndFilterLines("/test/file.txt", customFilter);

      expect(result).toEqual(["line1", "NOTE: remember this", "line2"]);
    });

    test("should handle files with mixed line endings", async () => {
      const fileContent = "line1\nline2\nline3";
      mockReadFile.mockResolvedValue(fileContent);

      const result = await readAndFilterLines("/test/file.txt");

      expect(result).toEqual(["line1", "line2", "line3"]);
    });

    test("should handle lines with only whitespace", async () => {
      const fileContent = `line1
   
\t
line2`;
      mockReadFile.mockResolvedValue(fileContent);

      const result = await readAndFilterLines("/test/file.txt");

      expect(result).toEqual(["line1", "line2"]);
    });

    test("should handle comments with leading whitespace", async () => {
      const fileContent = `line1
  # comment with leading whitespace
\t# comment with tab
line2`;
      mockReadFile.mockResolvedValue(fileContent);

      const result = await readAndFilterLines("/test/file.txt");

      expect(result).toEqual(["line1", "line2"]);
    });
  });
});
