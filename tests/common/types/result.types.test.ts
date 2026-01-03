import { ok, err, isOk, isErr, type Result } from "../../../src/common/types/result.types";

describe("Result type and helper functions", () => {
  describe("ok()", () => {
    it("should create an OkResult with the given value", () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it("should work with complex types", () => {
      const data = { name: "test", items: [1, 2, 3] };
      const result = ok(data);
      expect(result.ok).toBe(true);
      expect(result.value).toEqual(data);
    });

    it("should work with null value", () => {
      const result = ok(null);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(null);
    });

    it("should work with undefined value", () => {
      const result = ok(undefined);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(undefined);
    });
  });

  describe("err()", () => {
    it("should create an ErrResult with the given error", () => {
      const error = new Error("Something went wrong");
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(error);
    });

    it("should work with custom error types", () => {
      class CustomError extends Error {
        constructor(
          public code: number,
          message: string,
        ) {
          super(message);
        }
      }
      const error = new CustomError(404, "Not found");
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe(404);
      expect(result.error.message).toBe("Not found");
    });

    it("should work with string errors", () => {
      const result = err("Error message");
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Error message");
    });
  });

  describe("isOk()", () => {
    it("should return true for OkResult", () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
    });

    it("should return false for ErrResult", () => {
      const result = err(new Error("error"));
      expect(isOk(result)).toBe(false);
    });

    it("should narrow types correctly", () => {
      const result: Result<number> = ok(42);
      if (isOk(result)) {
        // TypeScript should allow accessing value here
        expect(result.value).toBe(42);
      }
    });
  });

  describe("isErr()", () => {
    it("should return false for OkResult", () => {
      const result = ok(42);
      expect(isErr(result)).toBe(false);
    });

    it("should return true for ErrResult", () => {
      const result = err(new Error("error"));
      expect(isErr(result)).toBe(true);
    });

    it("should narrow types correctly", () => {
      const result: Result<number> = err(new Error("test error"));
      if (isErr(result)) {
        // TypeScript should allow accessing error here
        expect(result.error.message).toBe("test error");
      }
    });
  });

  describe("Type safety scenarios", () => {
    it("should enforce error handling", () => {
      function divide(a: number, b: number): Result<number> {
        if (b === 0) {
          return err(new Error("Division by zero"));
        }
        return ok(a / b);
      }

      const successResult = divide(10, 2);
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.value).toBe(5);
      }

      const failResult = divide(10, 0);
      expect(isErr(failResult)).toBe(true);
      if (isErr(failResult)) {
        expect(failResult.error.message).toBe("Division by zero");
      }
    });

    it("should work with async functions", async () => {
      async function fetchData(shouldFail: boolean): Promise<Result<{ data: string }>> {
        if (shouldFail) {
          return err(new Error("Fetch failed"));
        }
        return ok({ data: "success" });
      }

      const successResult = await fetchData(false);
      expect(isOk(successResult)).toBe(true);

      const failResult = await fetchData(true);
      expect(isErr(failResult)).toBe(true);
    });
  });
});
