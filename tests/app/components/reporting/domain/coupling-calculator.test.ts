import { calculateCouplingLevel } from "../../../../../src/app/components/reporting/domain/coupling-calculator";
import { CouplingLevel } from "../../../../../src/app/components/reporting/config/module-coupling.config";

describe("coupling-calculator", () => {
  describe("calculateCouplingLevel", () => {
    describe("threshold calculations", () => {
      it("should return VERY_HIGH for >= 70% of highest coupling count", () => {
        expect(calculateCouplingLevel(70, 100)).toBe(CouplingLevel.VERY_HIGH);
        expect(calculateCouplingLevel(100, 100)).toBe(CouplingLevel.VERY_HIGH);
      });

      it("should return HIGH for >= 40% but < 70% of highest coupling count", () => {
        expect(calculateCouplingLevel(40, 100)).toBe(CouplingLevel.HIGH);
        expect(calculateCouplingLevel(69, 100)).toBe(CouplingLevel.HIGH);
      });

      it("should return MEDIUM for >= 20% but < 40% of highest coupling count", () => {
        expect(calculateCouplingLevel(20, 100)).toBe(CouplingLevel.MEDIUM);
        expect(calculateCouplingLevel(39, 100)).toBe(CouplingLevel.MEDIUM);
      });

      it("should return LOW for < 20% of highest coupling count", () => {
        expect(calculateCouplingLevel(19, 100)).toBe(CouplingLevel.LOW);
        expect(calculateCouplingLevel(0, 100)).toBe(CouplingLevel.LOW);
      });
    });

    describe("boundary conditions", () => {
      it("should return VERY_HIGH at exactly 70% threshold", () => {
        expect(calculateCouplingLevel(7, 10)).toBe(CouplingLevel.VERY_HIGH);
      });

      it("should return HIGH at exactly 40% threshold", () => {
        expect(calculateCouplingLevel(4, 10)).toBe(CouplingLevel.HIGH);
      });

      it("should return MEDIUM at exactly 20% threshold", () => {
        expect(calculateCouplingLevel(2, 10)).toBe(CouplingLevel.MEDIUM);
      });

      it("should return LOW just below 20% threshold", () => {
        expect(calculateCouplingLevel(1, 10)).toBe(CouplingLevel.LOW);
      });
    });

    describe("edge cases", () => {
      it("should return LOW when highest count is 0", () => {
        expect(calculateCouplingLevel(5, 0)).toBe(CouplingLevel.LOW);
      });

      it("should return LOW when highest count is negative", () => {
        expect(calculateCouplingLevel(5, -10)).toBe(CouplingLevel.LOW);
      });

      it("should return VERY_HIGH when reference count exceeds highest count", () => {
        expect(calculateCouplingLevel(150, 100)).toBe(CouplingLevel.VERY_HIGH);
      });
    });
  });
});
