import "reflect-metadata";
import { ShutdownService } from "../../src/lifecycle/shutdown-service";
import { IShutdownable } from "../../src/lifecycle/shutdownable.interface";

// Mock tsyringe decorators
jest.mock("tsyringe", () => ({
  injectable: () => (target: any) => target,
  inject: () => () => {},
}));

describe("ShutdownService", () => {
  let shutdownService: ShutdownService;

  beforeEach(() => {
    jest.clearAllMocks();
    shutdownService = new ShutdownService();
  });

  describe("register", () => {
    it("should register a shutdownable component", () => {
      const mockShutdownable: IShutdownable = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      expect(() => {
        shutdownService.register(mockShutdownable);
      }).not.toThrow();
    });

    it("should allow multiple components to be registered", () => {
      const mockShutdownable1: IShutdownable = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      const mockShutdownable2: IShutdownable = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      shutdownService.register(mockShutdownable1);
      shutdownService.register(mockShutdownable2);

      // No exceptions should be thrown
      expect(true).toBe(true);
    });
  });

  describe("gracefulShutdown", () => {
    it("should call shutdown on all registered components", async () => {
      const mockShutdownable1: IShutdownable = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      const mockShutdownable2: IShutdownable = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      shutdownService.register(mockShutdownable1);
      shutdownService.register(mockShutdownable2);

      await shutdownService.gracefulShutdown();

      expect(mockShutdownable1.shutdown).toHaveBeenCalledTimes(1);
      expect(mockShutdownable2.shutdown).toHaveBeenCalledTimes(1);
    });

    it("should handle shutdown when no components are registered", async () => {
      await shutdownService.gracefulShutdown();
      // Should complete without error
      expect(true).toBe(true);
    });

    it("should handle errors from shutdownable components gracefully", async () => {
      const error = new Error("Failed to shutdown component");
      const mockShutdownable1: IShutdownable = {
        shutdown: jest.fn().mockRejectedValue(error),
      };
      const mockShutdownable2: IShutdownable = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      // Spy on console.error to verify error is logged
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      shutdownService.register(mockShutdownable1);
      shutdownService.register(mockShutdownable2);

      // Should not throw - errors are logged instead
      await expect(shutdownService.gracefulShutdown()).resolves.not.toThrow();

      expect(mockShutdownable1.shutdown).toHaveBeenCalledTimes(1);
      expect(mockShutdownable2.shutdown).toHaveBeenCalledTimes(1); // Both should be attempted
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^Shutdown operation failed for component/),
        error,
      );

      consoleSpy.mockRestore();
    });

    it("should continue shutdown even if multiple components fail", async () => {
      const error1 = new Error("Failed to shutdown component 1");
      const error2 = new Error("Failed to shutdown component 2");
      const mockShutdownable1: IShutdownable = {
        shutdown: jest.fn().mockRejectedValue(error1),
      };
      const mockShutdownable2: IShutdownable = {
        shutdown: jest.fn().mockRejectedValue(error2),
      };
      const mockShutdownable3: IShutdownable = {
        shutdown: jest.fn().mockResolvedValue(undefined),
      };

      // Spy on console.error to verify all errors are logged
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      shutdownService.register(mockShutdownable1);
      shutdownService.register(mockShutdownable2);
      shutdownService.register(mockShutdownable3);

      await expect(shutdownService.gracefulShutdown()).resolves.not.toThrow();

      // All shutdown methods should be called
      expect(mockShutdownable1.shutdown).toHaveBeenCalledTimes(1);
      expect(mockShutdownable2.shutdown).toHaveBeenCalledTimes(1);
      expect(mockShutdownable3.shutdown).toHaveBeenCalledTimes(1);

      // Both errors should be logged
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^Shutdown operation failed for component/),
        error1,
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^Shutdown operation failed for component/),
        error2,
      );

      consoleSpy.mockRestore();
    });
  });
});
