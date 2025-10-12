import { logThrownError, logErrorMsg, logWarningMsg } from "../../../src/common/utils/logging";

describe("logging", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("logThrownError", () => {
    it("should log an Error object with its stack trace", () => {
      const error = new Error("Test error");
      logThrownError(error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Test error");
    });

    it("should log a string error", () => {
      logThrownError("String error");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain("String error");
    });

    it("should handle unknown error types", () => {
      logThrownError({ custom: "error object" });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it("should handle null and undefined errors", () => {
      logThrownError(null);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      consoleErrorSpy.mockClear();

      logThrownError(undefined);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("logErrorMsg", () => {
    it("should log an error message", () => {
      logErrorMsg("Error message");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error message");
    });
  });

  describe("logWarningMsg", () => {
    it("should log a warning message", () => {
      logWarningMsg("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning message");
    });
  });
});
