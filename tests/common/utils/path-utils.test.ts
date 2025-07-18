import { getFileSuffix } from "../../../src/common/utils/path-utils";

describe("File system utilities", () => {
  // Test data for getFileSuffix function
  const fileSuffixTestData = [
    { input: "myfile.txt", expected: "txt", description: "normal file with extension" },
    { input: "myfile.", expected: "", description: "file with trailing dot" },
    { input: "myfile", expected: "", description: "file without extension" },
  ];

  test.each(fileSuffixTestData)("getFileSuffix $description", ({ input, expected }) => {
    expect(getFileSuffix(input)).toBe(expected);
  });
});
