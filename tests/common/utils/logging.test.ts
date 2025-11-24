import { logSingleLineWarning, logError } from "../../../src/common/utils/logging";

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

  describe("logError", () => {
    it("should log an error message with an Error object", () => {
      const error = new Error("Test error");
      logError("Operation failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("Error. Test error");
      expect(loggedMessage).toContain("-");
      // Should contain stack trace (Error objects have stack traces)
      expect(loggedMessage.length).toBeGreaterThan(50);
    });

    it("should log an error message with a string error", () => {
      logError("Operation failed", "String error");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("String error");
    });

    it("should log an error message with an object error", () => {
      logError("Operation failed", { custom: "error object" });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
    });

    it("should log an error message with null error", () => {
      logError("Operation failed", null);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("No error message available");
    });

    it("should log an error message with undefined error", () => {
      logError("Operation failed", undefined);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("No error message available");
    });

    it("should require a message parameter", () => {
      const error = new Error("Test error");
      logError("Required message", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Required message");
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
