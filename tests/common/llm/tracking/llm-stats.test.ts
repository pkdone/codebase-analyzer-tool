import LLMStats from "../../../../src/common/llm/tracking/llm-stats";

describe("LLMStats", () => {
  let stats: LLMStats;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    stats = new LLMStats();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("constructor", () => {
    it("should initialize all counts to zero", () => {
      const summary = stats.getStatusTypesStatistics();
      expect(summary.SUCCESS.count).toBe(0);
      expect(summary.FAILURE.count).toBe(0);
      expect(summary.SWITCH.count).toBe(0);
      expect(summary.OVERLOAD_RETRY.count).toBe(0);
      expect(summary.HOPEFUL_RETRY.count).toBe(0);
      expect(summary.CROP.count).toBe(0);
      expect(summary.JSON_MUTATED.count).toBe(0);
    });
  });

  describe("record methods", () => {
    it("should record success events", () => {
      stats.recordSuccess();
      stats.recordSuccess();
      const summary = stats.getStatusTypesStatistics();
      expect(summary.SUCCESS.count).toBe(2);
    });

    it("should record failure events", () => {
      stats.recordFailure();
      const summary = stats.getStatusTypesStatistics();
      expect(summary.FAILURE.count).toBe(1);
    });

    it("should record switch events", () => {
      stats.recordSwitch();
      stats.recordSwitch();
      stats.recordSwitch();
      const summary = stats.getStatusTypesStatistics();
      expect(summary.SWITCH.count).toBe(3);
    });

    it("should record overload retry events", () => {
      stats.recordOverloadRetry();
      const summary = stats.getStatusTypesStatistics();
      expect(summary.OVERLOAD_RETRY.count).toBe(1);
    });

    it("should record hopeful retry events", () => {
      stats.recordHopefulRetry();
      stats.recordHopefulRetry();
      const summary = stats.getStatusTypesStatistics();
      expect(summary.HOPEFUL_RETRY.count).toBe(2);
    });

    it("should record crop events", () => {
      stats.recordCrop();
      const summary = stats.getStatusTypesStatistics();
      expect(summary.CROP.count).toBe(1);
    });

    it("should record JSON mutated events", () => {
      stats.recordJsonMutated();
      const summary = stats.getStatusTypesStatistics();
      expect(summary.JSON_MUTATED.count).toBe(1);
    });

    it("should print symbol on record when enabled", () => {
      stats.recordSuccess();
      expect(consoleLogSpy).toHaveBeenCalledWith(">");
    });
  });

  describe("getStatusTypesStatistics()", () => {
    it("should return immutable snapshots", () => {
      stats.recordSuccess();
      const snapshot1 = stats.getStatusTypesStatistics();
      stats.recordSuccess();
      const snapshot2 = stats.getStatusTypesStatistics();

      expect(snapshot1.SUCCESS.count).toBe(1);
      expect(snapshot2.SUCCESS.count).toBe(2);
    });

    it("should include all status definitions", () => {
      const summary = stats.getStatusTypesStatistics();

      expect(summary.SUCCESS).toBeDefined();
      expect(summary.SUCCESS.description).toBe("LLM invocation succeeded");
      expect(summary.SUCCESS.symbol).toBe(">");

      expect(summary.FAILURE).toBeDefined();
      expect(summary.FAILURE.description).toBe("LLM invocation failed (no data produced)");
      expect(summary.FAILURE.symbol).toBe("!");

      expect(summary.SWITCH).toBeDefined();
      expect(summary.SWITCH.description).toBe(
        "Switched to fallback LLM to try to process request",
      );
      expect(summary.SWITCH.symbol).toBe("+");

      expect(summary.OVERLOAD_RETRY).toBeDefined();
      expect(summary.OVERLOAD_RETRY.description).toBe(
        "Retried calling LLM due to provider overload or network issue",
      );
      expect(summary.OVERLOAD_RETRY.symbol).toBe("?");

      expect(summary.HOPEFUL_RETRY).toBeDefined();
      expect(summary.HOPEFUL_RETRY.description).toBe(
        "Retried calling LLM due to invalid JSON response (a hopeful re-attempt)",
      );
      expect(summary.HOPEFUL_RETRY.symbol).toBe("~");

      expect(summary.CROP).toBeDefined();
      expect(summary.CROP.description).toBe(
        "Cropping prompt due to excessive size, before resending",
      );
      expect(summary.CROP.symbol).toBe("-");

      expect(summary.JSON_MUTATED).toBeDefined();
      expect(summary.JSON_MUTATED.description).toBe(
        "LLM response was mutated to force it to be valid JSON",
      );
      expect(summary.JSON_MUTATED.symbol).toBe("#");
    });

    it("should include TOTAL when includeTotal is true", () => {
      stats.recordSuccess();
      stats.recordSuccess();
      stats.recordFailure();

      const summary = stats.getStatusTypesStatistics(true);
      expect(summary.TOTAL).toBeDefined();
      expect(summary.TOTAL?.count).toBe(3);
      expect(summary.TOTAL?.description).toBe("Total successes + failures");
      expect(summary.TOTAL?.symbol).toBe("=");
    });

    it("should not include TOTAL when includeTotal is false", () => {
      const summary = stats.getStatusTypesStatistics(false);
      expect(summary.TOTAL).toBeUndefined();
    });

    it("should not include TOTAL by default", () => {
      const summary = stats.getStatusTypesStatistics();
      expect(summary.TOTAL).toBeUndefined();
    });
  });

  describe("immutability", () => {
    it("should not allow external mutation of returned statistics", () => {
      stats.recordSuccess();
      const summary = stats.getStatusTypesStatistics();
      const originalCount = summary.SUCCESS.count;

      // Attempting to mutate should not affect internal state
      // (The returned object is a new snapshot)
      stats.recordSuccess();
      expect(summary.SUCCESS.count).toBe(originalCount);

      // New snapshot should have updated count
      const newSummary = stats.getStatusTypesStatistics();
      expect(newSummary.SUCCESS.count).toBe(originalCount + 1);
    });
  });

  describe("display methods", () => {
    let consoleTableSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleTableSpy = jest.spyOn(console, "table").mockImplementation();
    });

    afterEach(() => {
      consoleTableSpy.mockRestore();
    });

    it("should display status summary", () => {
      stats.displayLLMStatusSummary();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "LLM invocation event types that will be recorded:",
      );
      expect(consoleTableSpy).toHaveBeenCalled();
    });

    it("should display status details", () => {
      stats.displayLLMStatusDetails();
      expect(consoleTableSpy).toHaveBeenCalled();
    });
  });
});

