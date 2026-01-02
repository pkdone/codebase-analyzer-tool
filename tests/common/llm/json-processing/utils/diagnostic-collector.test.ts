import { DiagnosticCollector } from "../../../../../src/common/llm/json-processing/utils/diagnostic-collector";

describe("DiagnosticCollector", () => {
  describe("constructor", () => {
    it("should create an empty collector with the specified limit", () => {
      const collector = new DiagnosticCollector(10);
      expect(collector.count).toBe(0);
      expect(collector.isEmpty()).toBe(true);
      expect(collector.hasReachedLimit()).toBe(false);
    });
  });

  describe("add", () => {
    it("should add a message and return true when under the limit", () => {
      const collector = new DiagnosticCollector(5);
      const result = collector.add("Test message");
      expect(result).toBe(true);
      expect(collector.count).toBe(1);
      expect(collector.getAll()).toEqual(["Test message"]);
    });

    it("should add multiple messages up to the limit", () => {
      const collector = new DiagnosticCollector(3);
      collector.add("Message 1");
      collector.add("Message 2");
      collector.add("Message 3");
      expect(collector.count).toBe(3);
      expect(collector.hasReachedLimit()).toBe(true);
    });

    it("should return false and not add when the limit is reached", () => {
      const collector = new DiagnosticCollector(2);
      collector.add("Message 1");
      collector.add("Message 2");
      const result = collector.add("Message 3");
      expect(result).toBe(false);
      expect(collector.count).toBe(2);
      expect(collector.getAll()).toEqual(["Message 1", "Message 2"]);
    });

    it("should handle zero limit", () => {
      const collector = new DiagnosticCollector(0);
      const result = collector.add("Test message");
      expect(result).toBe(false);
      expect(collector.count).toBe(0);
      expect(collector.hasReachedLimit()).toBe(true);
    });
  });

  describe("addConditional", () => {
    it("should add message when condition is true", () => {
      const collector = new DiagnosticCollector(10);
      const result = collector.addConditional(true, "Conditional message");
      expect(result).toBe(true);
      expect(collector.getAll()).toEqual(["Conditional message"]);
    });

    it("should not add message when condition is false", () => {
      const collector = new DiagnosticCollector(10);
      const result = collector.addConditional(false, "Conditional message");
      expect(result).toBe(false);
      expect(collector.isEmpty()).toBe(true);
    });

    it("should not add message when condition is true but limit is reached", () => {
      const collector = new DiagnosticCollector(1);
      collector.add("First message");
      const result = collector.addConditional(true, "Second message");
      expect(result).toBe(false);
      expect(collector.count).toBe(1);
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
      expect(collector.count).toBe(2);
    });

    it("should return empty array when no messages added", () => {
      const collector = new DiagnosticCollector(10);
      expect(collector.getAll()).toEqual([]);
    });
  });

  describe("count", () => {
    it("should return correct count as messages are added", () => {
      const collector = new DiagnosticCollector(10);
      expect(collector.count).toBe(0);
      collector.add("Message 1");
      expect(collector.count).toBe(1);
      collector.add("Message 2");
      expect(collector.count).toBe(2);
    });
  });

  describe("hasReachedLimit", () => {
    it("should return false when under limit", () => {
      const collector = new DiagnosticCollector(5);
      collector.add("Message 1");
      collector.add("Message 2");
      expect(collector.hasReachedLimit()).toBe(false);
    });

    it("should return true when at limit", () => {
      const collector = new DiagnosticCollector(2);
      collector.add("Message 1");
      collector.add("Message 2");
      expect(collector.hasReachedLimit()).toBe(true);
    });
  });

  describe("isEmpty", () => {
    it("should return true when no messages added", () => {
      const collector = new DiagnosticCollector(10);
      expect(collector.isEmpty()).toBe(true);
    });

    it("should return false when messages have been added", () => {
      const collector = new DiagnosticCollector(10);
      collector.add("Message");
      expect(collector.isEmpty()).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all collected messages", () => {
      const collector = new DiagnosticCollector(10);
      collector.add("Message 1");
      collector.add("Message 2");
      expect(collector.count).toBe(2);

      collector.clear();
      expect(collector.count).toBe(0);
      expect(collector.isEmpty()).toBe(true);
      expect(collector.getAll()).toEqual([]);
    });

    it("should allow adding new messages after clearing", () => {
      const collector = new DiagnosticCollector(2);
      collector.add("Message 1");
      collector.add("Message 2");
      expect(collector.hasReachedLimit()).toBe(true);

      collector.clear();
      const result = collector.add("New message");
      expect(result).toBe(true);
      expect(collector.getAll()).toEqual(["New message"]);
    });
  });

  describe("integration scenarios", () => {
    it("should work correctly in typical sanitizer usage pattern", () => {
      const collector = new DiagnosticCollector(20);

      // Simulate typical sanitizer pattern
      const fixedSomething = true;
      const fixedSomethingElse = false;

      collector.addConditional(fixedSomething, "Fixed something");
      collector.addConditional(fixedSomethingElse, "Fixed something else");

      for (let i = 0; i < 25; i++) {
        collector.add(`Fix ${i}`);
      }

      // Should have 21 messages total (1 + up to 20 from loop, but limited to 20)
      expect(collector.count).toBe(20);
      expect(collector.hasReachedLimit()).toBe(true);
      expect(collector.getAll()[0]).toBe("Fixed something");
    });
  });
});

