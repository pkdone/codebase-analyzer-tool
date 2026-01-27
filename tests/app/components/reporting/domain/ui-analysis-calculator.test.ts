import {
  calculateDebtLevel,
  classifyTagLibrary,
} from "../../../../../src/app/components/reporting/domain/ui-analysis-calculator";
import { DebtLevel } from "../../../../../src/app/components/reporting/config/ui-analysis.config";

describe("ui-analysis-calculator", () => {
  describe("calculateDebtLevel", () => {
    describe("threshold calculations", () => {
      it("should return VERY_HIGH for > 20 total blocks", () => {
        expect(calculateDebtLevel(21)).toBe(DebtLevel.VERY_HIGH);
        expect(calculateDebtLevel(100)).toBe(DebtLevel.VERY_HIGH);
      });

      it("should return HIGH for > 10 but <= 20 total blocks", () => {
        expect(calculateDebtLevel(11)).toBe(DebtLevel.HIGH);
        expect(calculateDebtLevel(20)).toBe(DebtLevel.HIGH);
      });

      it("should return MODERATE for > 5 but <= 10 total blocks", () => {
        expect(calculateDebtLevel(6)).toBe(DebtLevel.MODERATE);
        expect(calculateDebtLevel(10)).toBe(DebtLevel.MODERATE);
      });

      it("should return LOW for <= 5 total blocks", () => {
        expect(calculateDebtLevel(5)).toBe(DebtLevel.LOW);
        expect(calculateDebtLevel(0)).toBe(DebtLevel.LOW);
      });
    });

    describe("boundary conditions", () => {
      it("should return HIGH at exactly 20 total blocks", () => {
        expect(calculateDebtLevel(20)).toBe(DebtLevel.HIGH);
      });

      it("should return MODERATE at exactly 10 total blocks", () => {
        expect(calculateDebtLevel(10)).toBe(DebtLevel.MODERATE);
      });

      it("should return LOW at exactly 5 total blocks", () => {
        expect(calculateDebtLevel(5)).toBe(DebtLevel.LOW);
      });
    });

    describe("edge cases", () => {
      it("should return LOW for 0 total blocks", () => {
        expect(calculateDebtLevel(0)).toBe(DebtLevel.LOW);
      });

      it("should return LOW for negative total blocks", () => {
        expect(calculateDebtLevel(-5)).toBe(DebtLevel.LOW);
      });

      it("should return VERY_HIGH for very large total blocks", () => {
        expect(calculateDebtLevel(1000)).toBe(DebtLevel.VERY_HIGH);
      });
    });
  });

  describe("classifyTagLibrary", () => {
    describe("JSTL classification", () => {
      it("should classify JSTL core URI as JSTL", () => {
        expect(classifyTagLibrary("http://java.sun.com/jsp/jstl/core")).toBe("JSTL");
      });

      it("should classify JSTL fmt URI as JSTL", () => {
        expect(classifyTagLibrary("http://java.sun.com/jsp/jstl/fmt")).toBe("JSTL");
      });

      it("should classify JSTL functions URI as JSTL", () => {
        expect(classifyTagLibrary("http://java.sun.com/jsp/jstl/functions")).toBe("JSTL");
      });
    });

    describe("Spring classification", () => {
      it("should classify Spring tags URI as Spring", () => {
        expect(classifyTagLibrary("http://www.springframework.org/tags")).toBe("Spring");
      });

      it("should classify Spring form URI as Spring", () => {
        expect(classifyTagLibrary("http://www.springframework.org/tags/form")).toBe("Spring");
      });
    });

    describe("Custom classification", () => {
      it("should classify WEB-INF URIs as Custom", () => {
        expect(classifyTagLibrary("/WEB-INF/tlds/mytags.tld")).toBe("Custom");
      });

      it("should classify URIs containing 'custom' as Custom", () => {
        expect(classifyTagLibrary("http://mycompany.com/custom/tags")).toBe("Custom");
      });
    });

    describe("Other classification", () => {
      it("should classify unrecognized URIs as Other", () => {
        expect(classifyTagLibrary("http://mycompany.com/tags")).toBe("Other");
      });

      it("should classify empty string as Other", () => {
        expect(classifyTagLibrary("")).toBe("Other");
      });

      it("should classify Struts URIs as Other", () => {
        expect(classifyTagLibrary("http://struts.apache.org/tags-html")).toBe("Other");
      });
    });
  });
});
