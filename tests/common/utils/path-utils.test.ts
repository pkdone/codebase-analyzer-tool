import { getFileExtension, getProjectNameFromPath } from "../../../src/common/utils/path-utils";

describe("Path utilities", () => {
  describe("getFileExtension", () => {
    // Test data for getFileExtension function
    const fileSuffixTestData = [
      { input: "myfile.txt", expected: "txt", description: "normal file with extension" },
      { input: "myfile.", expected: "", description: "file with trailing dot" },
      { input: "myfile", expected: "", description: "file without extension" },
      { input: "path/to/file.js", expected: "js", description: "file with path and extension" },
      { input: "file.test.ts", expected: "ts", description: "file with multiple dots" },
      { input: ".gitignore", expected: "", description: "hidden file without extension" },
      { input: ".env.local", expected: "local", description: "hidden file with extension" },
    ];

    test.each(fileSuffixTestData)("getFileExtension $description", ({ input, expected }) => {
      expect(getFileExtension(input)).toBe(expected);
    });
  });

  describe("getProjectNameFromPath", () => {
    const projectNameTestData = [
      {
        input: "/home/user/projects/my-awesome-project",
        expected: "my-awesome-project",
        description: "normal project path",
      },
      {
        input: "/home/user/projects/my-awesome-project/",
        expected: "my-awesome-project",
        description: "project path with trailing slash",
      },
      // Note: These Windows paths work differently on Unix systems since path.basename
      // handles platform-specific separators
      {
        input: "/projects/single",
        expected: "single",
        description: "short project path",
      },
      {
        input: "/",
        expected: "",
        description: "root directory",
      },
      {
        input: "",
        expected: "",
        description: "empty path",
      },
      {
        input: "my-project",
        expected: "my-project",
        description: "relative path without slashes",
      },
      {
        input: "./my-project",
        expected: "my-project",
        description: "relative path with dot slash",
      },
      {
        input: "../parent-project",
        expected: "parent-project",
        description: "relative path with parent directory",
      },
      {
        input: "/deeply/nested/folder/structure/final-project",
        expected: "final-project",
        description: "deeply nested project path",
      },
      {
        input: "/project-with-dashes-and_underscores",
        expected: "project-with-dashes-and_underscores",
        description: "project name with special characters",
      },
      {
        input: "/123-numeric-project",
        expected: "123-numeric-project",
        description: "project name starting with numbers",
      },
    ];

    test.each(projectNameTestData)("getProjectNameFromPath $description", ({ input, expected }) => {
      expect(getProjectNameFromPath(input)).toBe(expected);
    });

    test("should handle paths with multiple consecutive slashes", () => {
      expect(getProjectNameFromPath("/path//to///project")).toBe("project");
    });

    test("should handle Unix-style paths correctly", () => {
      expect(getProjectNameFromPath("/Users/user/projects/my-project")).toBe("my-project");
    });

    test("should be consistent with normalized and non-normalized paths", () => {
      const projectName = "test-project";
      const paths = [
        `/home/user/${projectName}`,
        `/home/user/${projectName}/`,
        `/home/user/./${projectName}`,
        `/home/user/../user/${projectName}`,
      ];

      paths.forEach((path) => {
        expect(getProjectNameFromPath(path)).toBe(projectName);
      });
    });
  });
});
