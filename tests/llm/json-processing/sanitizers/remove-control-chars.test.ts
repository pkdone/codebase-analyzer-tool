import { removeControlChars } from "../../../../src/llm/json-processing/sanitizers/remove-control-chars";

describe("removeControlChars", () => {
  describe("should remove control characters", () => {
    it("should remove zero-width spaces", () => {
      const input = '{\u200B"key"\u200B:\u200B"value"\u200B}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
      expect(result.description).toBe("Removed control / zero-width characters");
    });

    it("should remove zero-width non-joiner", () => {
      const input = '{\u200C"name"\u200C:\u200C"John"\u200C}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"name":"John"}');
    });

    it("should remove zero-width joiner", () => {
      const input = '{\u200D"key"\u200D:\u200D"value"\u200D}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove BOM (zero-width no-break space)", () => {
      const input = '\uFEFF{ "key": "value" }';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "key": "value" }');
    });

    it("should remove NULL characters", () => {
      const input = '{\u0000"key"\u0000:\u0000"value"\u0000}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove vertical tab", () => {
      const input = '{\u000B"key":\u000B"value"}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove form feed", () => {
      const input = '{\u000C"key":\u000C"value"}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove multiple types of control characters", () => {
      const input = '\uFEFF{\u200B\u0000"key"\u200C:\u000B"value"\u200D}\u000C';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should remove control chars from string values", () => {
      const input = '{ "message": "Hello\u200BWorld\u200C!" }';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{ "message": "HelloWorld!" }');
    });
  });

  describe("should preserve valid whitespace", () => {
    it("should preserve tabs", () => {
      const input = '{\t"key":\t"value"\t}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve newlines", () => {
      const input = '{\n"key":\n"value"\n}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve carriage returns", () => {
      const input = '{\r"key":\r"value"\r}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve spaces", () => {
      const input = '{ "key": "value" }';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve all valid whitespace together", () => {
      const input = '{\n\t "key": "value"\r\n}';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("should not modify content", () => {
    it("should return unchanged when no control characters present", () => {
      const input = '{ "key": "value" }';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
      expect(result.description).toBeUndefined();
    });

    it("should return unchanged for empty string", () => {
      const input = "";
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe("");
    });

    it("should handle clean JSON with nested structures", () => {
      const input = '{ "nested": { "array": [1, 2, 3] } }';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("edge cases", () => {
    it("should handle string with only control characters", () => {
      const input = "\u200B\u200C\u200D\uFEFF\u0000";
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("");
    });

    it("should handle mixed content and control chars", () => {
      const input = "Normal\u200Btext\u0000with\u200Ccontrol\uFEFFchars";
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe("Normaltextwithcontrolchars");
    });

    it("should handle control chars at boundaries", () => {
      const input = '\u200B{"key":"value"}\uFEFF';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"key":"value"}');
    });

    it("should handle large JSON with scattered control chars", () => {
      const input =
        '\u200B{\u200C"users"\u200D:\u0000[\uFEFF{"name":"John"},\u200B{"name":"Jane"}\u200C]\u200D}\uFEFF';
      const result = removeControlChars(input);

      expect(result.changed).toBe(true);
      expect(result.content).toBe('{"users":[{"name":"John"},{"name":"Jane"}]}');
    });

    it("should preserve printable special characters", () => {
      const input = '{ "special": "©®™€£¥" }';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should preserve emojis and unicode", () => {
      const input = '{ "emoji": "😀🎉✨" }';
      const result = removeControlChars(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });
});
