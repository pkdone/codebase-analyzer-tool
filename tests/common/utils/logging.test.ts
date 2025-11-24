import {
  logThrownError,
  logErrorMsg,
  logSingleLineWarning,
} from "../../../src/common/utils/logging";

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

  describe("logSingleLineWarning", () => {
    it("should log a warning message", () => {
      logSingleLineWarning("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning message");
    });

    it("should replace newlines with spaces in message", () => {
      logSingleLineWarning("Warning\nmessage\nwith\nnewlines");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning message with newlines");
    });

    it("should include context when provided", () => {
      logSingleLineWarning("Warning message", { key: "value", nested: { data: "test" } });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
      expect(callArg).toContain('"key":"value"');
    });

    it("should replace newlines in context JSON", () => {
      logSingleLineWarning("Warning", { multiline: "text\nwith\nnewlines" });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("\n");
      expect(callArg).toContain("text with newlines");
    });

    it("should handle Error objects in context", () => {
      const error = new Error("Test error message");
      logSingleLineWarning("Warning message", error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
      expect(callArg).toContain("Error");
      expect(callArg).toContain("Test error message");
    });

    it("should handle Error objects with newlines in message", () => {
      const error = new Error("Error\nwith\nnewlines");
      logSingleLineWarning("Warning", error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("\n");
    });
  });
});
