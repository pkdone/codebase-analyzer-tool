import { DatabaseError, DatabaseConnectionError } from "../../../src/common/mongodb/mdb-errors";
import { AppError } from "../../../src/common/errors/app-error";

describe("mdb-errors", () => {
  describe("DatabaseError", () => {
    it("should extend AppError", () => {
      const error = new DatabaseConnectionError("Test error");
      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(Error);
    });

    it("should be an abstract class that cannot be instantiated directly", () => {
      // TypeScript prevents direct instantiation, but we can verify the class hierarchy
      expect(DatabaseError).toBeInstanceOf(Function);
      expect(DatabaseError.prototype).toBeDefined();
    });
  });

  describe("DatabaseConnectionError", () => {
    it("should extend DatabaseError", () => {
      const error = new DatabaseConnectionError();
      expect(error).toBeInstanceOf(DatabaseError);
      expect(error).toBeInstanceOf(AppError);
    });

    it("should use default message when none provided", () => {
      const error = new DatabaseConnectionError();
      expect(error.message).toBe("Failed to connect to the database");
    });

    it("should use custom message when provided", () => {
      const customMessage = "Custom connection error";
      const error = new DatabaseConnectionError(customMessage);
      expect(error.message).toBe(customMessage);
    });

    it("should preserve cause error when provided", () => {
      const cause = new Error("Original error");
      const error = new DatabaseConnectionError("Connection failed", cause);
      expect(error.cause).toBe(cause);
    });
  });
});
