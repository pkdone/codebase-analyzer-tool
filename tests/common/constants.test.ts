import { commonConstants } from "../../src/common/constants";

describe("commonConstants", () => {
  it("should have UTF8_ENCODING defined", () => {
    expect(commonConstants.UTF8_ENCODING).toBeDefined();
    expect(commonConstants.UTF8_ENCODING).toBe("utf8");
  });
});
