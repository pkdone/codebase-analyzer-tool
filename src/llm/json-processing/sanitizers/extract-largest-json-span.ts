import { Sanitizer } from './sanitizers-types';

export const extractLargestJsonSpan: Sanitizer = (input) => {
  const firstBrace = input.indexOf('{');
  const firstBracket = input.indexOf('[');
  let start = -1;
  let startChar = '';
  if (!(firstBrace === -1 && firstBracket === -1)) {
    if (firstBrace === -1 || (firstBracket !== -1 && firstBracket < firstBrace)) {
      start = firstBracket;
      startChar = '[';
    } else {
      start = firstBrace;
      startChar = '{';
    }
  }
  if (start < 0) return { content: input, changed: false };
  const endChar = startChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let endIndex = -1;
  for (let i = start; i < input.length; i++) {
    const ch = input[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\') { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === startChar) depth++;
      else if (ch === endChar) {
        depth--;
        if (depth === 0) { endIndex = i; break; }
      }
    }
  }
  if (endIndex === -1) return { content: input, changed: false };
  const sliced = input.slice(start, endIndex + 1).trim();
  if (sliced !== input.trim()) {
    return { content: sliced, changed: true, description: 'Extracted largest JSON span' };
  }
  return { content: input, changed: false };
};
