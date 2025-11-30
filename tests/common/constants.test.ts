import { appConfig } from "../../src/config/app.config";

describe("appConfig constants", () => {
  it("should have UTF8_ENCODING defined", () => {
    expect(appConfig.UTF8_ENCODING).toBeDefined();
    expect(appConfig.UTF8_ENCODING).toBe("utf8");
  });
});
