import { removeControlChars } from "../../src/llm/json-processing/sanitizers/remove-control-chars";

describe("removeControlChars - regex optimization", () => {
  test("should remove zero-width characters", () => {
    const input = "Hello\u200BWorld\u200C!\u200D";
    const result = removeControlChars(input);

    expect(result.content).toBe("HelloWorld!");
    expect(result.changed).toBe(true);
    expect(result.description).toBe("Removed control / zero-width characters");
  });

  test("should remove BOM (zero-width no-break space)", () => {
    const input = "\uFEFFHello World";
    const result = removeControlChars(input);

    expect(result.content).toBe("Hello World");
    expect(result.changed).toBe(true);
  });

  test("should remove control characters except tab, newline, carriage return", () => {
    // Include various control chars
    const input = "Hello\u0000\u0001\u0002World\u001F!";
    const result = removeControlChars(input);

    expect(result.content).toBe("HelloWorld!");
    expect(result.changed).toBe(true);
  });

  test("should preserve tab, newline, and carriage return", () => {
    const input = "Hello\tWorld\nNext\rLine";
    const result = removeControlChars(input);

    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  test("should preserve vertical tab and form feed removal", () => {
    const input = "Hello\u000BWorld\u000C";
    const result = removeControlChars(input);

    expect(result.content).toBe("HelloWorld");
    expect(result.changed).toBe(true);
  });

  test("should handle empty string", () => {
    const result = removeControlChars("");

    expect(result.content).toBe("");
    expect(result.changed).toBe(false);
  });

  test("should handle string with no control characters", () => {
    const input = "Hello World! This is a normal string.";
    const result = removeControlChars(input);

    expect(result.content).toBe(input);
    expect(result.changed).toBe(false);
  });

  test("should handle string with only control characters", () => {
    const input = "\u0000\u0001\u200B\u200C\u200D\uFEFF";
    const result = removeControlChars(input);

    expect(result.content).toBe("");
    expect(result.changed).toBe(true);
  });

  test("should handle mixed content with multiple types of control chars", () => {
    const input = "Start\u0000Middle\u200BEnd\uFEFF\tTab\nNewline";
    const result = removeControlChars(input);

    expect(result.content).toBe("StartMiddleEnd\tTab\nNewline");
    expect(result.changed).toBe(true);
  });

  test("should handle Unicode content properly", () => {
    const input = "Hello\u200B世界\u200CTest\u200D!";
    const result = removeControlChars(input);

    expect(result.content).toBe("Hello世界Test!");
    expect(result.changed).toBe(true);
  });

  test("should be efficient with large strings containing many control chars", () => {
    // Create a large string with control characters
    const parts = [];
    for (let i = 0; i < 1000; i++) {
      parts.push(`Text${i}\u200B`);
    }
    const input = parts.join("");

    const start = Date.now();
    const result = removeControlChars(input);
    const duration = Date.now() - start;

    expect(result.changed).toBe(true);
    expect(result.content).not.toContain("\u200B");
    // Regex implementation should be fast
    expect(duration).toBeLessThan(100);
  });
});
