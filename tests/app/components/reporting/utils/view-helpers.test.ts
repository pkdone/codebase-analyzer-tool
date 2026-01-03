import {
  calculateCouplingLevel,
  calculateDebtLevel,
  type CouplingLevelResult,
  type DebtLevelResult,
} from "../../../../../src/app/components/reporting/utils/view-helpers";

describe("view-helpers", () => {
  describe("calculateCouplingLevel", () => {
    describe("threshold calculations", () => {
      it("should return Very High for >= 70% of highest coupling count", () => {
        const result = calculateCouplingLevel(70, 100);
        expect(result).toEqual<CouplingLevelResult>({
          level: "Very High",
          cssClass: "badge-danger",
        });
      });

      it("should return High for >= 40% but < 70% of highest coupling count", () => {
        const result = calculateCouplingLevel(40, 100);
        expect(result).toEqual<CouplingLevelResult>({
          level: "High",
          cssClass: "badge-high",
        });
      });

      it("should return Medium for >= 20% but < 40% of highest coupling count", () => {
        const result = calculateCouplingLevel(20, 100);
        expect(result).toEqual<CouplingLevelResult>({
          level: "Medium",
          cssClass: "badge-warning",
        });
      });

      it("should return Low for < 20% of highest coupling count", () => {
        const result = calculateCouplingLevel(19, 100);
        expect(result).toEqual<CouplingLevelResult>({
          level: "Low",
          cssClass: "badge-success",
        });
      });
    });

    describe("boundary conditions", () => {
      it("should return Very High at exactly 70% threshold", () => {
        const result = calculateCouplingLevel(7, 10);
        expect(result.level).toBe("Very High");
      });

      it("should return High just below 70% threshold", () => {
        const result = calculateCouplingLevel(69, 100);
        expect(result.level).toBe("High");
      });

      it("should return High at exactly 40% threshold", () => {
        const result = calculateCouplingLevel(4, 10);
        expect(result.level).toBe("High");
      });

      it("should return Medium at exactly 20% threshold", () => {
        const result = calculateCouplingLevel(2, 10);
        expect(result.level).toBe("Medium");
      });

      it("should return Low just below 20% threshold", () => {
        const result = calculateCouplingLevel(1, 10);
        expect(result.level).toBe("Low");
      });
    });

    describe("edge cases", () => {
      it("should return Low when highest count is 0", () => {
        const result = calculateCouplingLevel(5, 0);
        expect(result).toEqual<CouplingLevelResult>({
          level: "Low",
          cssClass: "badge-success",
        });
      });

      it("should return Low when highest count is negative", () => {
        const result = calculateCouplingLevel(5, -10);
        expect(result).toEqual<CouplingLevelResult>({
          level: "Low",
          cssClass: "badge-success",
        });
      });

      it("should return Very High when reference count equals highest count", () => {
        const result = calculateCouplingLevel(100, 100);
        expect(result.level).toBe("Very High");
      });

      it("should return Very High when reference count exceeds highest count", () => {
        // This shouldn't happen in practice but should handle gracefully
        const result = calculateCouplingLevel(150, 100);
        expect(result.level).toBe("Very High");
      });

      it("should handle zero reference count", () => {
        const result = calculateCouplingLevel(0, 100);
        expect(result.level).toBe("Low");
      });
    });
  });

  describe("calculateDebtLevel", () => {
    describe("threshold calculations", () => {
      it("should return Very High for > 20 total blocks", () => {
        const result = calculateDebtLevel(21);
        expect(result).toEqual<DebtLevelResult>({
          level: "Very High",
          cssClass: "badge-danger",
        });
      });

      it("should return High for > 10 but <= 20 total blocks", () => {
        const result = calculateDebtLevel(15);
        expect(result).toEqual<DebtLevelResult>({
          level: "High",
          cssClass: "badge-warning",
        });
      });

      it("should return Moderate for > 5 but <= 10 total blocks", () => {
        const result = calculateDebtLevel(8);
        expect(result).toEqual<DebtLevelResult>({
          level: "Moderate",
          cssClass: "badge-info",
        });
      });

      it("should return Low for <= 5 total blocks", () => {
        const result = calculateDebtLevel(5);
        expect(result).toEqual<DebtLevelResult>({
          level: "Low",
          cssClass: "badge-success",
        });
      });
    });

    describe("boundary conditions", () => {
      it("should return High at exactly 20 total blocks", () => {
        const result = calculateDebtLevel(20);
        expect(result.level).toBe("High");
      });

      it("should return Very High at 21 total blocks", () => {
        const result = calculateDebtLevel(21);
        expect(result.level).toBe("Very High");
      });

      it("should return Moderate at exactly 10 total blocks", () => {
        const result = calculateDebtLevel(10);
        expect(result.level).toBe("Moderate");
      });

      it("should return High at 11 total blocks", () => {
        const result = calculateDebtLevel(11);
        expect(result.level).toBe("High");
      });

      it("should return Low at exactly 5 total blocks", () => {
        const result = calculateDebtLevel(5);
        expect(result.level).toBe("Low");
      });

      it("should return Moderate at 6 total blocks", () => {
        const result = calculateDebtLevel(6);
        expect(result.level).toBe("Moderate");
      });
    });

    describe("edge cases", () => {
      it("should return Low for 0 total blocks", () => {
        const result = calculateDebtLevel(0);
        expect(result).toEqual<DebtLevelResult>({
          level: "Low",
          cssClass: "badge-success",
        });
      });

      it("should return Low for negative total blocks", () => {
        // Shouldn't happen in practice but should handle gracefully
        const result = calculateDebtLevel(-5);
        expect(result).toEqual<DebtLevelResult>({
          level: "Low",
          cssClass: "badge-success",
        });
      });

      it("should return Very High for very large total blocks", () => {
        const result = calculateDebtLevel(1000);
        expect(result).toEqual<DebtLevelResult>({
          level: "Very High",
          cssClass: "badge-danger",
        });
      });
    });
  });
});
