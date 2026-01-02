import { Double } from "bson";
import { numbersToBsonDoubles } from "../../../src/common/mongodb/bson-utils";

describe("bson-utils", () => {
  describe("numbersToBsonDoubles", () => {
    it("should convert an empty array to an empty array", () => {
      const result = numbersToBsonDoubles([]);
      expect(result).toEqual([]);
    });

    it("should convert a single number to a BSON Double", () => {
      const result = numbersToBsonDoubles([1.5]);
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(Double);
      expect(result[0].valueOf()).toBe(1.5);
    });

    it("should convert multiple numbers to BSON Doubles", () => {
      const input = [1.0, 2.5, 3.14159, -4.0, 0];
      const result = numbersToBsonDoubles(input);

      expect(result).toHaveLength(5);
      result.forEach((value, index) => {
        expect(value).toBeInstanceOf(Double);
        expect(value.valueOf()).toBe(input[index]);
      });
    });

    it("should handle integer values correctly", () => {
      const result = numbersToBsonDoubles([1, 2, 3]);
      expect(result).toHaveLength(3);
      expect(result[0].valueOf()).toBe(1);
      expect(result[1].valueOf()).toBe(2);
      expect(result[2].valueOf()).toBe(3);
    });

    it("should handle negative numbers", () => {
      const result = numbersToBsonDoubles([-1.5, -2.5]);
      expect(result).toHaveLength(2);
      expect(result[0].valueOf()).toBe(-1.5);
      expect(result[1].valueOf()).toBe(-2.5);
    });

    it("should handle very small numbers", () => {
      const result = numbersToBsonDoubles([0.0001, 1e-10]);
      expect(result).toHaveLength(2);
      expect(result[0].valueOf()).toBe(0.0001);
      expect(result[1].valueOf()).toBe(1e-10);
    });

    it("should handle very large numbers", () => {
      const result = numbersToBsonDoubles([1e100, Number.MAX_VALUE]);
      expect(result).toHaveLength(2);
      expect(result[0].valueOf()).toBe(1e100);
      expect(result[1].valueOf()).toBe(Number.MAX_VALUE);
    });

    it("should preserve embedding vector precision", () => {
      // Simulate a typical embedding vector with high precision floats
      const embeddingVector = [0.123456789, -0.987654321, 0.5555555555, 0.111111111, 0.999999999];

      const result = numbersToBsonDoubles(embeddingVector);

      expect(result).toHaveLength(5);
      embeddingVector.forEach((value, index) => {
        expect(result[index].valueOf()).toBe(value);
      });
    });

    it("should not mutate the original array", () => {
      const original = [1.0, 2.0, 3.0];
      const copy = [...original];

      numbersToBsonDoubles(original);

      expect(original).toEqual(copy);
    });

    it("should return a new array instance", () => {
      const input = [1.0, 2.0];
      const result = numbersToBsonDoubles(input);

      expect(result).not.toBe(input);
    });
  });
});
