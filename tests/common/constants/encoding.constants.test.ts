import { ENCODING_UTF8 } from "../../../src/common/constants";

describe("encoding.constants", () => {
  describe("ENCODING_UTF8", () => {
    it("should be the string 'utf8'", () => {
      expect(ENCODING_UTF8).toBe("utf8");
    });

    it("should be a valid BufferEncoding value accepted by Node.js", () => {
      // Verify the constant works with Node.js Buffer API
      const testString = "Hello, World! 你好世界";
      const buffer = Buffer.from(testString, ENCODING_UTF8);
      const decoded = buffer.toString(ENCODING_UTF8);
      expect(decoded).toBe(testString);
    });

    it("should be usable with TextDecoder", () => {
      // Verify compatibility with TextDecoder API
      const testString = "Test encoding 🎉";
      const encoder = new TextEncoder();
      const encoded = encoder.encode(testString);
      const decoder = new TextDecoder(ENCODING_UTF8);
      const decoded = decoder.decode(encoded);
      expect(decoded).toBe(testString);
    });
  });
});
