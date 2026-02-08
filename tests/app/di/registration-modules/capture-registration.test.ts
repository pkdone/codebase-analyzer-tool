import "reflect-metadata";
import { container } from "tsyringe";
import { captureTokens } from "../../../../src/app/di/tokens";
import { registerCaptureDependencies } from "../../../../src/app/di/registration-modules/capture-registration";

describe("Capture Registration Module", () => {
  beforeEach(() => {
    container.clearInstances();
    container.reset();
  });

  describe("registerCaptureDependencies", () => {
    it("should register CodebaseCaptureOrchestrator as singleton", () => {
      registerCaptureDependencies();

      expect(container.isRegistered(captureTokens.CodebaseCaptureOrchestrator)).toBe(true);
    });

    it("should register FileSummarizerService", () => {
      registerCaptureDependencies();

      expect(container.isRegistered(captureTokens.FileSummarizerService)).toBe(true);
    });

    it("should register BufferedSourcesWriter", () => {
      registerCaptureDependencies();

      expect(container.isRegistered(captureTokens.BufferedSourcesWriter)).toBe(true);
    });

    it("should register FileTypePromptRegistry", () => {
      registerCaptureDependencies();

      expect(container.isRegistered(captureTokens.FileTypePromptRegistry)).toBe(true);
    });

    it("should register all capture components together", () => {
      registerCaptureDependencies();

      // Verify all capture-related components are registered
      expect(container.isRegistered(captureTokens.CodebaseCaptureOrchestrator)).toBe(true);
      expect(container.isRegistered(captureTokens.FileSummarizerService)).toBe(true);
      expect(container.isRegistered(captureTokens.BufferedSourcesWriter)).toBe(true);
      expect(container.isRegistered(captureTokens.FileTypePromptRegistry)).toBe(true);
    });

    it("should allow multiple registration calls without error", () => {
      registerCaptureDependencies();
      const isRegistered1 = container.isRegistered(captureTokens.CodebaseCaptureOrchestrator);

      registerCaptureDependencies();
      const isRegistered2 = container.isRegistered(captureTokens.CodebaseCaptureOrchestrator);

      expect(isRegistered1).toBe(true);
      expect(isRegistered2).toBe(true);
    });
  });
});
