import {
  iterateWithStringState,
  createStringStateTracker,
} from "../../../../../src/common/llm/json-processing/utils/string-state-iterator";

describe("string-state-iterator", () => {
  describe("iterateWithStringState", () => {
    it("should yield all characters with correct indices", () => {
      const content = "abc";
      const results = [...iterateWithStringState(content)];

      expect(results).toHaveLength(3);
      expect(results[0].char).toBe("a");
      expect(results[0].index).toBe(0);
      expect(results[1].char).toBe("b");
      expect(results[1].index).toBe(1);
      expect(results[2].char).toBe("c");
      expect(results[2].index).toBe(2);
    });

    it("should track inString state for quoted content", () => {
      const content = '{"key": "value"}';
      const results = [...iterateWithStringState(content)];

      // Characters outside strings
      expect(results[0].char).toBe("{");
      expect(results[0].inString).toBe(false);

      // Opening quote for key
      expect(results[1].char).toBe('"');
      expect(results[1].inString).toBe(false); // Quote itself is outside

      // Inside "key"
      expect(results[2].char).toBe("k");
      expect(results[2].inString).toBe(true);
      expect(results[3].char).toBe("e");
      expect(results[3].inString).toBe(true);
      expect(results[4].char).toBe("y");
      expect(results[4].inString).toBe(true);

      // Closing quote for key
      expect(results[5].char).toBe('"');
      expect(results[5].inString).toBe(true); // Quote is yielded with inString still true

      // After closing quote
      expect(results[6].char).toBe(":");
      expect(results[6].inString).toBe(false);
    });

    it("should handle escaped quotes within strings", () => {
      const content = '"hello \\"world\\""';
      const results = [...iterateWithStringState(content)];

      // Opening quote
      expect(results[0].char).toBe('"');
      expect(results[0].inString).toBe(false);

      // Content inside string
      expect(results[1].char).toBe("h");
      expect(results[1].inString).toBe(true);

      // The escaped quote characters - backslash followed by quote
      const backslashIdx = content.indexOf("\\");
      const backslashResult = results.find((r) => r.index === backslashIdx);
      expect(backslashResult?.char).toBe("\\");
      expect(backslashResult?.inString).toBe(true);

      // The quote after backslash
      const escapedQuoteResult = results.find((r) => r.index === backslashIdx + 1);
      expect(escapedQuoteResult?.char).toBe('"');
      expect(escapedQuoteResult?.inString).toBe(true);
      expect(escapedQuoteResult?.isEscaped).toBe(true);
    });

    it("should handle consecutive backslashes correctly", () => {
      const content = '"a\\\\b"';
      const results = [...iterateWithStringState(content)];

      // Find the second backslash (escaped)
      const firstBackslashIdx = 2; // "a\ position
      const secondBackslashIdx = 3; // \\ position

      const firstBackslash = results.find((r) => r.index === firstBackslashIdx);
      const secondBackslash = results.find((r) => r.index === secondBackslashIdx);

      expect(firstBackslash?.char).toBe("\\");
      expect(firstBackslash?.inString).toBe(true);

      expect(secondBackslash?.char).toBe("\\");
      expect(secondBackslash?.inString).toBe(true);
      expect(secondBackslash?.isEscaped).toBe(true);
    });

    it("should provide nextChar for lookahead", () => {
      const content = "abc";
      const results = [...iterateWithStringState(content)];

      expect(results[0].nextChar).toBe("b");
      expect(results[1].nextChar).toBe("c");
      expect(results[2].nextChar).toBeUndefined();
    });

    it("should handle empty string", () => {
      const results = [...iterateWithStringState("")];
      expect(results).toHaveLength(0);
    });

    it("should provide charCode for each character", () => {
      const content = '{"a": 1}';
      const results = [...iterateWithStringState(content)];

      expect(results[0].charCode).toBe("{".charCodeAt(0));
      expect(results[1].charCode).toBe('"'.charCodeAt(0));
    });

    it("should include content reference in each state", () => {
      const content = "test";
      const results = [...iterateWithStringState(content)];

      results.forEach((result) => {
        expect(result.content).toBe(content);
      });
    });

    it("should handle multiple strings correctly", () => {
      const content = '["a", "b", "c"]';
      const results = [...iterateWithStringState(content)];

      // Find the middle parts between strings
      const commaResults = results.filter((r) => r.char === ",");
      commaResults.forEach((result) => {
        expect(result.inString).toBe(false);
      });

      // Find the letter contents
      const letterResults = results.filter((r) => /[abc]/.test(r.char));
      letterResults.forEach((result) => {
        expect(result.inString).toBe(true);
      });
    });
  });

  describe("createStringStateTracker", () => {
    describe("basic operations", () => {
      it("should start at position 0", () => {
        const tracker = createStringStateTracker("test");
        expect(tracker.position).toBe(0);
      });

      it("should report correct length", () => {
        const tracker = createStringStateTracker("hello");
        expect(tracker.length).toBe(5);
      });

      it("should get current state", () => {
        const tracker = createStringStateTracker("test");
        const state = tracker.getCurrentState();

        expect(state).toBeDefined();
        expect(state?.char).toBe("t");
        expect(state?.index).toBe(0);
        expect(state?.inString).toBe(false);
      });

      it("should advance through content", () => {
        const tracker = createStringStateTracker("abc");

        expect(tracker.getCurrentState()?.char).toBe("a");
        tracker.advance();
        expect(tracker.getCurrentState()?.char).toBe("b");
        expect(tracker.position).toBe(1);
      });

      it("should return undefined when past end", () => {
        const tracker = createStringStateTracker("a");
        tracker.advance();
        expect(tracker.getCurrentState()).toBeUndefined();
      });
    });

    describe("string state tracking", () => {
      it("should track inString state correctly", () => {
        const tracker = createStringStateTracker('"hello"');

        // Initial quote
        expect(tracker.inString).toBe(false);
        tracker.advance();

        // Inside string
        expect(tracker.inString).toBe(true);
        tracker.advance(); // h
        tracker.advance(); // e
        tracker.advance(); // l
        tracker.advance(); // l
        tracker.advance(); // o

        // After closing quote
        tracker.advance();
        expect(tracker.inString).toBe(false);
      });

      it("should handle escaped quotes correctly", () => {
        const tracker = createStringStateTracker('"a\\"b"');

        tracker.advance(); // past opening quote
        expect(tracker.inString).toBe(true);

        tracker.advance(); // a
        tracker.advance(); // backslash
        tracker.advance(); // escaped quote - should still be in string

        expect(tracker.inString).toBe(true);

        tracker.advance(); // b
        tracker.advance(); // closing quote

        expect(tracker.inString).toBe(false);
      });
    });

    describe("advanceTo", () => {
      it("should jump to a specific position", () => {
        const tracker = createStringStateTracker("hello world");

        tracker.advanceTo(6);
        expect(tracker.position).toBe(6);
        expect(tracker.getCurrentState()?.char).toBe("w");
      });

      it("should handle advancing backwards by resetting", () => {
        const tracker = createStringStateTracker('"hello"');

        tracker.advanceTo(5);
        expect(tracker.position).toBe(5);

        tracker.advanceTo(1);
        expect(tracker.position).toBe(1);
        expect(tracker.inString).toBe(true);
      });

      it("should handle advancing to same position", () => {
        const tracker = createStringStateTracker("test");

        tracker.advanceTo(2);
        const posBefore = tracker.position;
        tracker.advanceTo(2);
        expect(tracker.position).toBe(posBefore);
      });
    });

    describe("getStateAt", () => {
      it("should get state at a specific index", () => {
        const tracker = createStringStateTracker("hello");

        const state = tracker.getStateAt(2);
        expect(state?.char).toBe("l");
        expect(state?.index).toBe(2);
      });

      it("should return undefined for out of bounds index", () => {
        const tracker = createStringStateTracker("hi");

        expect(tracker.getStateAt(-1)).toBeUndefined();
        expect(tracker.getStateAt(10)).toBeUndefined();
      });

      it("should get correct inString state for index", () => {
        const tracker = createStringStateTracker('{"key": "val"}');

        // Position inside first string "key"
        const keyState = tracker.getStateAt(2); // 'k'
        expect(keyState?.inString).toBe(true);

        // Position outside string
        const colonState = tracker.getStateAt(6); // ':'
        expect(colonState?.inString).toBe(false);

        // Position inside second string "val"
        const valState = tracker.getStateAt(9); // 'v'
        expect(valState?.inString).toBe(true);
      });

      it("should not affect current tracker position when getting past state", () => {
        const tracker = createStringStateTracker("hello");

        tracker.advanceTo(3);
        const originalPosition = tracker.position;

        tracker.getStateAt(1);
        expect(tracker.position).toBe(originalPosition);
      });
    });

    describe("integration scenarios", () => {
      it("should work with escape sequence handling", () => {
        const content = '"test\\nvalue"';
        const tracker = createStringStateTracker(content);
        let output = "";
        let nullEscapesFixed = 0;

        while (tracker.position < tracker.length) {
          const state = tracker.getCurrentState();
          if (!state) break;

          const { char, inString, nextChar, index } = state;

          // Example: convert \0 to \u0000 (like in normalize-characters.ts)
          if (char === "\\" && inString && nextChar === "0") {
            output += "\\u0000";
            tracker.advanceTo(index + 2);
            nullEscapesFixed++;
            continue;
          }

          output += char;
          tracker.advance();
        }

        // Since there's no \0 in this content, output should match input
        expect(output).toBe(content);
        expect(nullEscapesFixed).toBe(0);
      });

      it("should handle null escape conversion", () => {
        const content = '"value\\0test"';
        const tracker = createStringStateTracker(content);
        let output = "";

        while (tracker.position < tracker.length) {
          const state = tracker.getCurrentState();
          if (!state) break;

          const { char, inString, nextChar, index } = state;

          if (char === "\\" && inString && nextChar === "0") {
            output += "\\u0000";
            tracker.advanceTo(index + 2);
            continue;
          }

          output += char;
          tracker.advance();
        }

        expect(output).toBe('"value\\u0000test"');
      });

      it("should handle complex JSON content", () => {
        const content = '{"name": "John \\"Doe\\"", "age": 30}';
        const tracker = createStringStateTracker(content);
        const insideStringChars: string[] = [];
        const outsideStringChars: string[] = [];

        while (tracker.position < tracker.length) {
          const state = tracker.getCurrentState();
          if (!state) break;

          if (state.inString) {
            insideStringChars.push(state.char);
          } else {
            outsideStringChars.push(state.char);
          }
          tracker.advance();
        }

        // Verify that structural JSON chars are outside strings
        expect(outsideStringChars).toContain("{");
        expect(outsideStringChars).toContain("}");
        expect(outsideStringChars).toContain(":");
        expect(outsideStringChars).toContain(",");

        // Verify that name/value content is inside strings
        expect(insideStringChars.join("")).toContain("name");
        expect(insideStringChars.join("")).toContain("John");
      });
    });
  });
});
