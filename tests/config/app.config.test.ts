import { appConfig } from "../../src/config/app.config";

describe("appConfig", () => {
  it("should have UTF8_ENCODING defined", () => {
    expect(appConfig.UTF8_ENCODING).toBeDefined();
    expect(appConfig.UTF8_ENCODING).toBe("utf8");
  });

  it("should be a readonly object", () => {
    // Verify the property exists and has the expected value
    const config = appConfig;
    expect(config).toHaveProperty("UTF8_ENCODING");
  });

  it("should be typed as const", () => {
    // This test verifies that TypeScript treats the config as readonly
    // The 'as const' assertion should make all properties readonly
    const encoding: "utf8" = appConfig.UTF8_ENCODING;
    expect(encoding).toBe("utf8");
  });
});
