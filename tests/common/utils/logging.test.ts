import { logOneLineWarning, logOneLineError } from "../../../src/common/utils/logging";

describe("logging", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("logOneLineError", () => {
    it("should log an error message with an Error object", () => {
      const error = new Error("Test error");
      logOneLineError("Operation failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("Error: Error. Test error");
      // Single line - no newlines
      expect(loggedMessage).not.toContain("\n");
    });

    it("should log an error message with a string error", () => {
      logOneLineError("Operation failed", "String error");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("String error");
    });

    it("should log an error message with an object error", () => {
      logOneLineError("Operation failed", { custom: "error object" });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
    });

    it("should log an error message with null error", () => {
      logOneLineError("Operation failed", null);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("No error message available");
    });

    it("should log an error message with undefined error", () => {
      logOneLineError("Operation failed", undefined);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("No error message available");
    });

    it("should require a message parameter", () => {
      const error = new Error("Test error");
      logOneLineError("Required message", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Required message");
    });

    it("should replace newlines in error message with spaces", () => {
      const error = new Error("Error\nwith\nnewlines");
      logOneLineError("Operation failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain("\n");
    });
  });

  describe("logSingleLineWarning", () => {
    it("should log a warning message", () => {
      logOneLineWarning("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning message");
    });

    it("should replace newlines with spaces in message", () => {
      logOneLineWarning("Warning\nmessage\nwith\nnewlines");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning message with newlines");
    });

    it("should include context when provided", () => {
      logOneLineWarning("Warning message", { key: "value", nested: { data: "test" } });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
      // formatError uses util.inspect which formats objects differently than JSON.stringify
      expect(callArg).toContain("key");
      expect(callArg).toContain("value");
    });

    it("should replace newlines in context JSON", () => {
      logOneLineWarning("Warning", { multiline: "text\nwith\nnewlines" });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("\n");
      expect(callArg).toContain("text with newlines");
    });

    it("should handle Error objects in context", () => {
      const error = new Error("Test error message");
      logOneLineWarning("Warning message", error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
      expect(callArg).toContain("Error");
      expect(callArg).toContain("Test error message");
    });

    it("should handle Error objects with newlines in message", () => {
      const error = new Error("Error\nwith\nnewlines");
      logOneLineWarning("Warning", error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("\n");
    });

    it("should handle plain objects using formatError (unified logging)", () => {
      const plainObject = { key: "value", nested: { data: "test" } };
      logOneLineWarning("Warning message", plainObject);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
      // formatError uses util.inspect which formats objects safely
      expect(callArg).toContain("key");
      expect(callArg).toContain("value");
    });

    it("should handle circular references safely using formatError", () => {
      const circular: any = { key: "value" };
      circular.self = circular; // Create circular reference

      // Should not throw - formatError uses util.inspect which handles circular refs
      expect(() => {
        logOneLineWarning("Warning", circular);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context:");
    });

    it("should handle primitives using String()", () => {
      logOneLineWarning("Warning", 123);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context: 123");
    });

    it("should handle string primitives using String()", () => {
      logOneLineWarning("Warning", "string context");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context: 'string context'");
    });

    it("should handle boolean primitives using String()", () => {
      logOneLineWarning("Warning", true);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context: true");
    });
  });
});
