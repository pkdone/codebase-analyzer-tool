import "reflect-metadata";
import { container } from "tsyringe";
import { captureTokens } from "../../../../src/app/di/tokens";
import { registerCaptureComponents } from "../../../../src/app/di/registration-modules/capture-registration";

describe("Capture Registration Module", () => {
  beforeEach(() => {
    container.clearInstances();
    container.reset();
  });

  describe("registerCaptureComponents", () => {
    it("should register CodebaseToDBLoader as singleton", () => {
      registerCaptureComponents();

      expect(container.isRegistered(captureTokens.CodebaseToDBLoader)).toBe(true);
    });

    it("should register component only once even on multiple calls", () => {
      registerCaptureComponents();
      const isRegistered1 = container.isRegistered(captureTokens.CodebaseToDBLoader);

      registerCaptureComponents();
      const isRegistered2 = container.isRegistered(captureTokens.CodebaseToDBLoader);

      expect(isRegistered1).toBe(true);
      expect(isRegistered2).toBe(true);
    });

    it("should log registration message", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      registerCaptureComponents();

      expect(consoleSpy).toHaveBeenCalledWith("Capture components registered");
      consoleSpy.mockRestore();
    });
  });
});
