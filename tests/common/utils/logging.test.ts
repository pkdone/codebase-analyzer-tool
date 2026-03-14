import {
  logWarn,
  logErr,
  logInfo,
  logOutput,
  logOutputErr,
  logTable,
  logTick,
} from "../../../src/common/utils/logging";

describe("logging", () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  const originalIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    Object.defineProperty(process.stdout, "isTTY", { value: originalIsTTY, writable: true });
  });

  describe("logErr", () => {
    it("should log an error message with an Error object", () => {
      const error = new Error("Test error");
      logErr("Operation failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("Error: Error. Test error");
      // Single line - no newlines
      expect(loggedMessage).not.toContain("\n");
    });

    it("should log an error message with a string error", () => {
      logErr("Operation failed", "String error");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("String error");
    });

    it("should log an error message with an object error", () => {
      logErr("Operation failed", { custom: "error object" });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
    });

    it("should log an error message with null error", () => {
      logErr("Operation failed", null);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("No error message available");
    });

    it("should log an error message with undefined error", () => {
      logErr("Operation failed", undefined);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Operation failed");
      expect(loggedMessage).toContain("No error message available");
    });

    it("should require a message parameter", () => {
      const error = new Error("Test error");
      logErr("Required message", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).toContain("Required message");
    });

    it("should replace newlines in error message with spaces", () => {
      const error = new Error("Error\nwith\nnewlines");
      logErr("Operation failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain("\n");
    });

    it("should prepend newline in TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      const error = new Error("Test error");
      logErr("Operation failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage[0]).toBe("\n");
      expect(loggedMessage).toContain("Operation failed");
    });

    it("should not prepend newline in non-TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      const error = new Error("Test error");
      logErr("Operation failed", error);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedMessage = consoleErrorSpy.mock.calls[0][0];
      expect(loggedMessage[0]).not.toBe("\n");
      expect(loggedMessage.startsWith("Operation failed")).toBe(true);
    });
  });

  describe("logSingleLineWarning", () => {
    it("should log a warning message", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logWarn("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning message");
    });

    it("should replace newlines with spaces in message", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logWarn("Warning\nmessage\nwith\nnewlines");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning message with newlines");
    });

    it("should include context when provided", () => {
      logWarn("Warning message", { key: "value", nested: { data: "test" } });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
      // formatError uses util.inspect which formats objects differently than JSON.stringify
      expect(callArg).toContain("key");
      expect(callArg).toContain("value");
    });

    it("should replace newlines in context JSON", () => {
      logWarn("Warning", { multiline: "text\nwith\nnewlines" });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("\n");
      expect(callArg).toContain("text with newlines");
    });

    it("should handle Error objects in context", () => {
      const error = new Error("Test error message");
      logWarn("Warning message", error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
      expect(callArg).toContain("Error");
      expect(callArg).toContain("Test error message");
    });

    it("should handle Error objects with newlines in message", () => {
      const error = new Error("Error\nwith\nnewlines");
      logWarn("Warning", error);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).not.toContain("\n");
    });

    it("should handle plain objects using formatError (unified logging)", () => {
      const plainObject = { key: "value", nested: { data: "test" } };
      logWarn("Warning message", plainObject);

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
        logWarn("Warning", circular);
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context:");
    });

    it("should handle primitives using String()", () => {
      logWarn("Warning", 123);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context: 123");
    });

    it("should handle string primitives using String()", () => {
      logWarn("Warning", "string context");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context: 'string context'");
    });

    it("should handle boolean primitives using String()", () => {
      logWarn("Warning", true);

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg).toContain("Warning");
      expect(callArg).toContain("Context: true");
    });

    it("should prepend newline in TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      logWarn("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg[0]).toBe("\n");
      expect(callArg).toContain("Warning message");
    });

    it("should not prepend newline in non-TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logWarn("Warning message");

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg[0]).not.toBe("\n");
      expect(callArg.startsWith("Warning message")).toBe(true);
    });

    it("should prepend newline in TTY mode with context", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      logWarn("Warning message", { key: "value" });

      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleWarnSpy.mock.calls[0][0];
      expect(callArg[0]).toBe("\n");
      expect(callArg).toContain("Warning message");
      expect(callArg).toContain("Context:");
    });
  });

  describe("logInfo", () => {
    it("should log an info message in non-TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logInfo("Info message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith("Info message");
    });

    it("should prepend newline in TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      logInfo("Info message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleLogSpy.mock.calls[0][0];
      expect(callArg[0]).toBe("\n");
      expect(callArg).toContain("Info message");
    });

    it("should not prepend newline in non-TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logInfo("Info message");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const callArg = consoleLogSpy.mock.calls[0][0];
      expect(callArg[0]).not.toBe("\n");
      expect(callArg.startsWith("Info message")).toBe(true);
    });
  });

  describe("logOutput", () => {
    it("should log message directly without TTY newline prefix", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      logOutput("Output line");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith("Output line");
    });

    it("should log message directly in non-TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logOutput("Output line");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith("Output line");
    });
  });

  describe("logOutputErr", () => {
    it("should log message to stderr without TTY newline prefix", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      logOutputErr("Error output line");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error output line");
    });

    it("should log message to stderr in non-TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logOutputErr("Error output line");

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error output line");
    });
  });

  describe("logTable", () => {
    let consoleTableSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleTableSpy = jest.spyOn(console, "table").mockImplementation();
    });

    afterEach(() => {
      consoleTableSpy.mockRestore();
    });

    it("should call console.table with data only", () => {
      const data = { key: "value" };
      logTable(data);

      expect(consoleTableSpy).toHaveBeenCalledTimes(1);
      expect(consoleTableSpy).toHaveBeenCalledWith(data);
    });

    it("should call console.table with data and columns", () => {
      const data = { key: { name: "test", value: 42 } };
      const columns = ["name", "value"];
      logTable(data, columns);

      expect(consoleTableSpy).toHaveBeenCalledTimes(1);
      expect(consoleTableSpy).toHaveBeenCalledWith(data, columns);
    });
  });

  describe("logTick", () => {
    let stdoutWriteSpy: jest.SpyInstance;

    beforeEach(() => {
      stdoutWriteSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutWriteSpy.mockRestore();
    });

    it("should use process.stdout.write in TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: true, writable: true });
      logTick(">");

      expect(stdoutWriteSpy).toHaveBeenCalledTimes(1);
      expect(stdoutWriteSpy).toHaveBeenCalledWith(">");
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should use console.log in non-TTY mode", () => {
      Object.defineProperty(process.stdout, "isTTY", { value: false, writable: true });
      logTick(">");

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(">");
      expect(stdoutWriteSpy).not.toHaveBeenCalled();
    });
  });
});
