import { redactUrl } from "../../../src/common/security/url-redactor";
import { logErr } from "../../../src/common/utils/logging";

// Mock the logging module
jest.mock("../../../src/common/utils/logging");
// No need to mock the old shim path; using generic redactor directly
const mockLogOneLineError = logErr as jest.MockedFunction<typeof logErr>;

describe("url-redactor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("redactUrl", () => {
    test("redacts username and password from MongoDB URL", () => {
      const url = "mongodb://username:password@localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe("mongodb://REDACTED:REDACTED@localhost:27017/mydb");
    });

    test("redacts only username when no password", () => {
      const url = "mongodb://username@localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe("mongodb://REDACTED:REDACTED@localhost:27017/mydb");
    });

    test("handles URL without credentials", () => {
      const url = "mongodb://localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe("mongodb://localhost:27017/mydb");
    });

    test("handles MongoDB Atlas URL with credentials", () => {
      const url =
        "mongodb+srv://user:pass@cluster0.example.mongodb.net/mydb?retryWrites=true&w=majority";
      const result = redactUrl(url);

      expect(result).toBe(
        "mongodb+srv://REDACTED:REDACTED@cluster0.example.mongodb.net/mydb?retryWrites=true&w=majority",
      );
    });

    test("handles complex credentials with special characters", () => {
      const url = "mongodb://user%40domain:p%40ssw0rd@localhost:27017/mydb";
      const result = redactUrl(url);

      expect(result).toBe("mongodb://REDACTED:REDACTED@localhost:27017/mydb");
    });

    test("returns REDACTED_URL when URL parsing fails", () => {
      const invalidUrl = "not-a-valid-url";
      const result = redactUrl(invalidUrl);

      expect(result).toBe("REDACTED_URL");
      expect(mockLogOneLineError).toHaveBeenCalledWith(
        "Could not parse URL for redaction",
        expect.anything(),
      );
    });

    test("handles empty string", () => {
      const result = redactUrl("");

      expect(result).toBe("REDACTED_URL");
      expect(mockLogOneLineError).toHaveBeenCalledWith(
        "Could not parse URL for redaction",
        expect.anything(),
      );
    });

    test("gracefully handles malformed URL with invalid protocol", () => {
      const malformed = "not a real protocol://user:pass@somehost";
      const result = redactUrl(malformed);
      // Should not throw and should return REDACTED_URL when parsing fails
      expect(typeof result).toBe("string");
      expect(result).toBe("REDACTED_URL");
      expect(mockLogOneLineError).toHaveBeenCalledWith(
        "Could not parse URL for redaction",
        expect.anything(),
      );
    });
  });
});
