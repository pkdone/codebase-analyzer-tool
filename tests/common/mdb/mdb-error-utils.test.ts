import { MongoServerError } from "mongodb";
import {
  isMongoServerErrorWithResponse,
  logMongoValidationErrorIfPresent,
} from "../../../src/common/mdb/mdb-error-utils";

// Simple spy for logging (avoid importing real logger implementation)
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
}));
import { logErrorMsg } from "../../../src/common/utils/logging";

describe("mdb-error-utils", () => {
  function buildMongoError(
    partial: Partial<MongoServerError> & { errorResponse?: any },
  ): MongoServerError {
    // Create a plain object and set prototype to MongoServerError to satisfy instanceof check
    const obj: any = { ...partial };
    Object.setPrototypeOf(obj, MongoServerError.prototype);
    return obj as MongoServerError;
  }

  it("should return false for non MongoServerError", () => {
    expect(isMongoServerErrorWithResponse({})).toBe(false);
    expect(isMongoServerErrorWithResponse(null)).toBe(false);
  });

  it("should return false for MongoServerError without errorResponse", () => {
    const err = buildMongoError({ message: "some error" });
    expect(isMongoServerErrorWithResponse(err)).toBe(false);
  });

  it("should detect MongoServerError with errorResponse.errmsg", () => {
    const err = buildMongoError({ errorResponse: { errmsg: "Validation failed" } });
    expect(isMongoServerErrorWithResponse(err)).toBe(true);
  });

  it("should log validation failure when errmsg contains document failed validation", () => {
    const err = buildMongoError({ errorResponse: { errmsg: "Document failed validation" } });
    logMongoValidationErrorIfPresent(err, true);
    expect(logErrorMsg).toHaveBeenCalled();
  });

  it("should not log when doLog is false", () => {
    const err = buildMongoError({ errorResponse: { errmsg: "Document failed validation" } });
    (logErrorMsg as jest.Mock).mockClear();
    logMongoValidationErrorIfPresent(err, false);
    expect(logErrorMsg).not.toHaveBeenCalled();
  });
});
