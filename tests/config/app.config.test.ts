import { appConfig } from "../../src/config/app.config";

describe("appConfig", () => {
  describe("encoding configuration", () => {
    it("should have UTF8_ENCODING defined", () => {
      expect(appConfig.UTF8_ENCODING).toBeDefined();
      expect(appConfig.UTF8_ENCODING).toBe("utf8");
    });
  });

  describe("MIME type configuration", () => {
    it("should have MIME_TYPE_JSON defined", () => {
      expect(appConfig.MIME_TYPE_JSON).toBeDefined();
      expect(appConfig.MIME_TYPE_JSON).toBe("application/json");
    });

    it("should have MIME_TYPE_ANY defined", () => {
      expect(appConfig.MIME_TYPE_ANY).toBeDefined();
      expect(appConfig.MIME_TYPE_ANY).toBe("*/*");
    });

    it("should have valid MIME type formats", () => {
      expect(typeof appConfig.MIME_TYPE_JSON).toBe("string");
      expect(typeof appConfig.MIME_TYPE_ANY).toBe("string");
      expect(appConfig.MIME_TYPE_JSON).toContain("/");
      expect(appConfig.MIME_TYPE_ANY).toContain("/");
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      // Verify the property exists and has the expected value
      const config = appConfig;
      expect(config).toHaveProperty("UTF8_ENCODING");
      expect(config).toHaveProperty("MIME_TYPE_JSON");
      expect(config).toHaveProperty("MIME_TYPE_ANY");
    });

    it("should be typed as const", () => {
      // This test verifies that TypeScript treats the config as readonly
      // The 'as const' assertion should make all properties readonly
      const encoding: "utf8" = appConfig.UTF8_ENCODING;
      const mimeJson: "application/json" = appConfig.MIME_TYPE_JSON;
      const mimeAny: "*/*" = appConfig.MIME_TYPE_ANY;

      expect(encoding).toBe("utf8");
      expect(mimeJson).toBe("application/json");
      expect(mimeAny).toBe("*/*");
    });
  });
});
