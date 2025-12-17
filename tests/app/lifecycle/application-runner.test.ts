import { runApplication } from "../../../src/app/lifecycle/application-runner";

// Mock the container and dependencies
jest.mock("../../../src/app/di/container", () => ({
  bootstrapContainer: jest.fn().mockResolvedValue(undefined),
  container: {
    resolve: jest.fn(),
    isRegistered: jest.fn().mockReturnValue(false),
  },
}));

describe("application-runner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.exitCode = undefined;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("runApplication", () => {
    it("should export runApplication function", () => {
      expect(typeof runApplication).toBe("function");
    });

    it("should have correct function signature", () => {
      expect(runApplication.length).toBe(1); // Takes one parameter: taskToken
    });
  });
});
