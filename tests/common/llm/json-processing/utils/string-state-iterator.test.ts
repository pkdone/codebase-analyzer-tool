import { createStringStateTracker } from "../../../../../src/common/llm/json-processing/utils/string-state-iterator";

describe("string-state-iterator", () => {
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
