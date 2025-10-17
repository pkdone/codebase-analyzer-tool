import { redactUrl as genericRedact } from "../../src/common/security/url-redactor";

describe("URL Redactor", () => {
  const urlWithCreds = "mongodb://user:pass@host.example.com:27017/mydb";

  it("removes credentials from URL (generic)", () => {
    const redacted = genericRedact(urlWithCreds);
    expect(redacted).not.toContain("user:pass");
    expect(redacted).toContain("host.example.com");
  });

  it("gracefully handles malformed URL", () => {
    const malformed = "not a real protocol://user:pass@somehost";
    const redacted = genericRedact(malformed);
    // Should not throw and should attempt removal pattern
    expect(typeof redacted).toBe("string");
  });
});
