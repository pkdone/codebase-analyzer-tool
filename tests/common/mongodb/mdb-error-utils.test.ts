import { MongoServerError } from "mongodb";
import {
  isMongoServerErrorWithResponse,
  logMongoValidationErrorIfPresent,
} from "../../../src/common/mongodb/mdb-error-utils";

// Simple spy for logging (avoid importing real logger implementation)
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logWarn: jest.fn(),
}));
import { logWarn } from "../../../src/common/utils/logging";

describe("mdb-error-utils", () => {
  /**
   * Build a MongoServerError-like object for testing.
   * Uses Object.setPrototypeOf to satisfy instanceof check.
   */
  function buildMongoError(partial: Record<string, unknown>): MongoServerError {
    // Create a plain object and set prototype to MongoServerError to satisfy instanceof check
    const obj: Record<string, unknown> = { ...partial };
    Object.setPrototypeOf(obj, MongoServerError.prototype);
    return obj as MongoServerError;
  }

  describe("isMongoServerErrorWithResponse", () => {
    it("should return false for non MongoServerError", () => {
      expect(isMongoServerErrorWithResponse({})).toBe(false);
      expect(isMongoServerErrorWithResponse(null)).toBe(false);
      expect(isMongoServerErrorWithResponse(undefined)).toBe(false);
      expect(isMongoServerErrorWithResponse("string error")).toBe(false);
      expect(isMongoServerErrorWithResponse(new Error("plain error"))).toBe(false);
    });

    it("should return false for MongoServerError with errorResponse missing errmsg", () => {
      // MongoDB's ErrorDescription always has errorResponse, but errmsg is optional
      const err = buildMongoError({ errorResponse: { otherField: "value" } });
      expect(isMongoServerErrorWithResponse(err)).toBe(false);
    });

    it("should return false for MongoServerError with undefined errmsg", () => {
      const err = buildMongoError({ errorResponse: { errmsg: undefined } });
      expect(isMongoServerErrorWithResponse(err)).toBe(false);
    });

    it("should return false for MongoServerError with non-string errmsg", () => {
      const err = buildMongoError({ errorResponse: { errmsg: 123 } });
      expect(isMongoServerErrorWithResponse(err)).toBe(false);
    });

    it("should detect MongoServerError with errorResponse.errmsg", () => {
      const err = buildMongoError({ errorResponse: { errmsg: "Validation failed" } });
      expect(isMongoServerErrorWithResponse(err)).toBe(true);
    });

    it("should detect MongoServerError with errorResponse containing errInfo", () => {
      const err = buildMongoError({
        errorResponse: {
          errmsg: "Document failed validation",
          errInfo: { details: "some info" },
        },
      });
      expect(isMongoServerErrorWithResponse(err)).toBe(true);
    });

    it("should handle empty errmsg string", () => {
      const err = buildMongoError({ errorResponse: { errmsg: "" } });
      expect(isMongoServerErrorWithResponse(err)).toBe(true);
    });
  });

  describe("logMongoValidationErrorIfPresent", () => {
    beforeEach(() => {
      (logWarn as jest.Mock).mockClear();
    });

    it("should log validation failure when errmsg contains document failed validation", () => {
      const err = buildMongoError({ errorResponse: { errmsg: "Document failed validation" } });
      logMongoValidationErrorIfPresent(err, true);
      expect(logWarn).toHaveBeenCalled();
    });

    it("should log validation failure case-insensitively", () => {
      const err = buildMongoError({
        errorResponse: { errmsg: "DOCUMENT FAILED VALIDATION" },
      });
      logMongoValidationErrorIfPresent(err, true);
      expect(logWarn).toHaveBeenCalled();
    });

    it("should not log when doLog is false", () => {
      const err = buildMongoError({ errorResponse: { errmsg: "Document failed validation" } });
      logMongoValidationErrorIfPresent(err, false);
      expect(logWarn).not.toHaveBeenCalled();
    });

    it("should not log for non-validation errors", () => {
      const err = buildMongoError({ errorResponse: { errmsg: "Some other error" } });
      logMongoValidationErrorIfPresent(err, true);
      expect(logWarn).not.toHaveBeenCalled();
    });

    it("should not log for non-MongoServerError", () => {
      logMongoValidationErrorIfPresent(new Error("regular error"), true);
      expect(logWarn).not.toHaveBeenCalled();
    });

    it("should include errInfo when logging", () => {
      const errInfo = { details: "validation schema mismatch" };
      const err = buildMongoError({
        errorResponse: { errmsg: "Document failed validation", errInfo },
      });
      logMongoValidationErrorIfPresent(err, true);
      // errInfo is now passed through util.inspect() for deep object expansion
      expect(logWarn).toHaveBeenCalledWith(
        "MongoDB document validation failed",
        "{ details: 'validation schema mismatch' }",
      );
    });
  });
});
