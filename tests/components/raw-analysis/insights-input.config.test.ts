import { reqsFilesConfig } from "../../../src/components/raw-analysis/reqs-files.config";

describe("insightsInputConfig", () => {
  describe("input file paths", () => {
    it("should have REQUIREMENTS_PROMPTS_FOLDERPATH defined", () => {
      expect(reqsFilesConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBeDefined();
      expect(reqsFilesConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBe("./input/requirements");
    });

    it("should have REQUIREMENTS_FILE_REGEX defined", () => {
      expect(reqsFilesConfig.REQUIREMENTS_FILE_REGEX).toBeDefined();
      expect(reqsFilesConfig.REQUIREMENTS_FILE_REGEX).toBeInstanceOf(RegExp);
    });

    it("should match requirement files with REQUIREMENTS_FILE_REGEX", () => {
      expect(reqsFilesConfig.REQUIREMENTS_FILE_REGEX.test("requirement00.prompt")).toBe(true);
      expect(reqsFilesConfig.REQUIREMENTS_FILE_REGEX.test("requirement99.prompt")).toBe(true);
      expect(reqsFilesConfig.REQUIREMENTS_FILE_REGEX.test("REQUIREMENT10.PROMPT")).toBe(true);
      expect(reqsFilesConfig.REQUIREMENTS_FILE_REGEX.test("requirement.txt")).toBe(false);
      expect(reqsFilesConfig.REQUIREMENTS_FILE_REGEX.test("other.prompt")).toBe(false);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = reqsFilesConfig;
      expect(config).toHaveProperty("REQUIREMENTS_PROMPTS_FOLDERPATH");
      expect(config).toHaveProperty("REQUIREMENTS_FILE_REGEX");
    });
  });
});
