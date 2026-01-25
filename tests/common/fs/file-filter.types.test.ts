import type {
  FileFilterConfig,
  FileDiscoveryConfig,
} from "../../../src/common/fs/file-filter.types";

describe("FileFilterConfig and FileDiscoveryConfig types", () => {
  describe("FileFilterConfig", () => {
    it("should accept a valid configuration with all required fields", () => {
      const config: FileFilterConfig = {
        folderIgnoreList: [".git", "node_modules"],
        filenameIgnorePrefix: ".",
        binaryFileExtensionIgnoreList: ["png", "jpg", "gif"],
        filenameIgnoreList: ["package-lock.json"],
      };

      expect(config.folderIgnoreList).toHaveLength(2);
      expect(config.filenameIgnorePrefix).toBe(".");
      expect(config.binaryFileExtensionIgnoreList).toHaveLength(3);
      expect(config.filenameIgnoreList).toHaveLength(1);
    });

    it("should allow filenameIgnoreList to be optional", () => {
      const config: FileFilterConfig = {
        folderIgnoreList: [".git"],
        filenameIgnorePrefix: ".",
        binaryFileExtensionIgnoreList: ["png"],
      };

      expect(config.filenameIgnoreList).toBeUndefined();
    });

    it("should accept empty arrays", () => {
      const config: FileFilterConfig = {
        folderIgnoreList: [],
        filenameIgnorePrefix: "",
        binaryFileExtensionIgnoreList: [],
        filenameIgnoreList: [],
      };

      expect(config.folderIgnoreList).toHaveLength(0);
      expect(config.binaryFileExtensionIgnoreList).toHaveLength(0);
    });

    it("should work with readonly arrays", () => {
      const config: FileFilterConfig = {
        folderIgnoreList: Object.freeze([".git", "node_modules"]),
        filenameIgnorePrefix: ".",
        binaryFileExtensionIgnoreList: Object.freeze(["png"]),
      };

      expect(config.folderIgnoreList).toContain(".git");
    });
  });

  describe("FileDiscoveryConfig", () => {
    it("should accept a valid configuration with required fields", () => {
      const config: FileDiscoveryConfig = {
        folderIgnoreList: ["node_modules", ".git"],
        filenameIgnorePrefix: "_",
      };

      expect(config.folderIgnoreList).toHaveLength(2);
      expect(config.filenameIgnorePrefix).toBe("_");
    });

    it("should accept optional filenameIgnoreList", () => {
      const config: FileDiscoveryConfig = {
        folderIgnoreList: ["node_modules"],
        filenameIgnorePrefix: ".",
        filenameIgnoreList: [".gitignore", ".env"],
      };

      expect(config.filenameIgnoreList).toHaveLength(2);
    });

    it("should be usable as a subset of FileFilterConfig", () => {
      // FileDiscoveryConfig can be extracted from FileFilterConfig
      const fullConfig: FileFilterConfig = {
        folderIgnoreList: [".git"],
        filenameIgnorePrefix: ".",
        binaryFileExtensionIgnoreList: ["png"],
        filenameIgnoreList: ["package-lock.json"],
      };

      const discoveryConfig: FileDiscoveryConfig = {
        folderIgnoreList: fullConfig.folderIgnoreList,
        filenameIgnorePrefix: fullConfig.filenameIgnorePrefix,
        filenameIgnoreList: fullConfig.filenameIgnoreList,
      };

      expect(discoveryConfig.folderIgnoreList).toBe(fullConfig.folderIgnoreList);
      expect(discoveryConfig.filenameIgnorePrefix).toBe(fullConfig.filenameIgnorePrefix);
      expect(discoveryConfig.filenameIgnoreList).toBe(fullConfig.filenameIgnoreList);
    });
  });
});
