import { removeThoughtMarkers } from "../../../../src/llm/json-processing/sanitizers/remove-thought-markers";

describe("removeThoughtMarkers", () => {
  describe("basic functionality", () => {
    it("should remove <ctrl94>thought marker", () => {
      const input = `<ctrl94>thought
I need to analyze the code...`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<ctrl94>thought");
      expect(result.content).toContain("I need to analyze the code...");
    });

    it("should remove <ctrlXX>thought patterns", () => {
      const input = `<ctrl123>thought\nHere's the JSON:`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<ctrl123>thought");
    });

    it("should remove literal 'thought:' marker", () => {
      const input = `thought:
Here's the JSON:`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("thought:");
    });

    it("should remove 'Thought:' marker", () => {
      const input = `Thought:
{"name": "value"}`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('{"name": "value"}');
      expect(result.content).not.toMatch(/^Thought\s*:/im);
    });
  });

  describe("removing text before braces", () => {
    it("should remove 'command{' pattern", () => {
      const input = `command{
  "name": "value"
}`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  "name": "value"
}`);
    });

    it("should remove 'data{' pattern", () => {
      const input = `data{
  "key": "value"
}`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe(`{
  "key": "value"
}`);
    });

    it("should handle the exact error scenario from the log file", () => {
      const input = `<ctrl94>thought
I need to analyze...
command{
  "name": "Loan",
  "kind": "CLASS"
}`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<ctrl94>thought");
      expect(result.content).not.toContain("command{");
      expect(result.content).toContain('"name": "Loan"');
      expect(result.content).toMatch(/^\s*\{/m);
    });

    it("should handle text before brace with whitespace", () => {
      const input = `  command {
  "name": "value"
}`;

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toContain('"name": "value"');
      expect(result.content).not.toContain("command");
      expect(result.content).toMatch(/^\s*\{/m);
    });

    it("should not remove valid property names", () => {
      const input = `{
  "command": "value",
  "data": "test"
}`;

      const result = removeThoughtMarkers(input);

      // Should not change - "command" and "data" are property names, not prefixes
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle multiple common words", () => {
      const testCases = [
        "command",
        "data",
        "result",
        "output",
        "json",
        "response",
        "object",
        "content",
      ];

      testCases.forEach((word) => {
        const input = `${word}{
  "name": "value"
}`;

        const result = removeThoughtMarkers(input);

        expect(result.changed).toBe(true);
        expect(result.content).toContain('"name": "value"');
        expect(result.content).not.toContain(`${word}{`);
        expect(result.content).toMatch(/^\s*\{/m);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = removeThoughtMarkers("");

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle valid JSON without markers", () => {
      const input = '{"name": "value", "age": 30}';

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle only thought marker with no content", () => {
      const input = "<ctrl94>thought\n";

      const result = removeThoughtMarkers(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("");
    });
  });

  describe("error handling", () => {
    it("should handle errors gracefully", () => {
      const input = `<ctrl94>thought
command{
  "name": "value"
}`;

      const result = removeThoughtMarkers(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });
  });
});
