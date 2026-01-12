import { DiagnosticCollector } from "../../../../../src/common/llm/json-processing/utils/diagnostic-collector";

describe("DiagnosticCollector", () => {
  describe("constructor", () => {
    it("should create an empty collector with the specified limit", () => {
      const collector = new DiagnosticCollector(10);
      expect(collector.getAll()).toEqual([]);
    });
  });

  describe("add", () => {
    it("should add a message and return true when under the limit", () => {
      const collector = new DiagnosticCollector(5);
      const result = collector.add("Test message");
      expect(result).toBe(true);
      expect(collector.getAll()).toEqual(["Test message"]);
    });

    it("should add multiple messages up to the limit", () => {
      const collector = new DiagnosticCollector(3);
      collector.add("Message 1");
      collector.add("Message 2");
      collector.add("Message 3");
      expect(collector.getAll()).toHaveLength(3);
    });

    it("should return false and not add when the limit is reached", () => {
      const collector = new DiagnosticCollector(2);
      collector.add("Message 1");
      collector.add("Message 2");
      const result = collector.add("Message 3");
      expect(result).toBe(false);
      expect(collector.getAll()).toEqual(["Message 1", "Message 2"]);
    });

    it("should handle zero limit", () => {
      const collector = new DiagnosticCollector(0);
      const result = collector.add("Test message");
      expect(result).toBe(false);
      expect(collector.getAll()).toEqual([]);
    });
  });

  describe("getAll", () => {
    it("should return a copy of the diagnostics array", () => {
      const collector = new DiagnosticCollector(10);
      collector.add("Message 1");
      collector.add("Message 2");
      const result = collector.getAll();
      expect(result).toEqual(["Message 1", "Message 2"]);

      // Modifying the result should not affect the collector
      result.push("Message 3");
      expect(collector.getAll()).toHaveLength(2);
    });

    it("should return empty array when no messages added", () => {
      const collector = new DiagnosticCollector(10);
      expect(collector.getAll()).toEqual([]);
    });
  });

  describe("integration scenarios", () => {
    it("should work correctly in typical sanitizer usage pattern", () => {
      const collector = new DiagnosticCollector(20);

      // Simulate typical sanitizer pattern
      collector.add("Fixed something");

      for (let i = 0; i < 25; i++) {
        collector.add(`Fix ${i}`);
      }

      // Should have 20 messages total (1 + 19 from loop, limited to 20)
      expect(collector.getAll()).toHaveLength(20);
      expect(collector.getAll()[0]).toBe("Fixed something");
    });
  });
});
