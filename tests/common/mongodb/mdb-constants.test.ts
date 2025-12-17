import {
  MONGODB_DUPLICATE_OBJ_ERROR_CODES,
  MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET,
  MONGODB_NAMESPACE_EXISTS_ERROR_CODE,
} from "../../../src/common/mongodb/mdb.constants";

describe("MongoDB Constants", () => {
  describe("MONGODB_DUPLICATE_OBJ_ERROR_CODES", () => {
    it("should be defined and contain expected error codes", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES).toBeDefined();
      expect(Array.isArray(MONGODB_DUPLICATE_OBJ_ERROR_CODES)).toBe(true);
    });

    it("should contain error code 11000 (DuplicateKey)", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES).toContain(11000);
    });

    it("should contain error code 68 (DuplicateKey alternate)", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES).toContain(68);
    });

    it("should have exactly 2 error codes", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES).toHaveLength(2);
    });

    it("should be a const array", () => {
      // TypeScript enforces immutability at compile time with 'as const'
      // Runtime immutability would require Object.freeze()
      expect(Object.isFrozen(MONGODB_DUPLICATE_OBJ_ERROR_CODES)).toBe(false);
    });
  });

  describe("MONGODB_NAMESPACE_EXISTS_ERROR_CODE", () => {
    it("should be defined", () => {
      expect(MONGODB_NAMESPACE_EXISTS_ERROR_CODE).toBeDefined();
    });

    it("should be error code 48", () => {
      expect(MONGODB_NAMESPACE_EXISTS_ERROR_CODE).toBe(48);
    });

    it("should be a number", () => {
      expect(typeof MONGODB_NAMESPACE_EXISTS_ERROR_CODE).toBe("number");
    });
  });

  describe("constants availability for MongoDB error handling", () => {
    it("should export constants that can be used with Array.includes()", () => {
      const testErrorCode = 11000;
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES.includes(testErrorCode)).toBe(true);
    });

    it("should work with MongoDB error code comparisons", () => {
      // Simulate checking if an error code matches the NamespaceExists error
      const checkIfNamespaceExistsError = (code: number) =>
        code === MONGODB_NAMESPACE_EXISTS_ERROR_CODE;
      expect(checkIfNamespaceExistsError(48)).toBe(true);
      expect(checkIfNamespaceExistsError(999)).toBe(false);
    });
  });

  describe("MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET", () => {
    it("should be a Set instance", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET).toBeInstanceOf(Set);
    });

    it("should contain the same error codes as the array", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET.has(11000)).toBe(true);
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET.has(68)).toBe(true);
    });

    it("should have the same size as the array", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET.size).toBe(
        MONGODB_DUPLICATE_OBJ_ERROR_CODES.length,
      );
    });

    it("should return false for non-existent error codes", () => {
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET.has(999)).toBe(false);
      expect(MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET.has(0)).toBe(false);
    });

    it("should provide O(1) lookup for error code checking", () => {
      // The Set provides efficient membership checking
      const checkIfDuplicateError = (code: number) =>
        MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET.has(code);
      expect(checkIfDuplicateError(11000)).toBe(true);
      expect(checkIfDuplicateError(68)).toBe(true);
      expect(checkIfDuplicateError(48)).toBe(false);
    });
  });
});
