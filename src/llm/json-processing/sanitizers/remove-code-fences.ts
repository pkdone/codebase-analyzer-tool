import { Sanitizer } from './sanitizers-types';

const FENCE_REGEXES = [
  /```json\s*/gi,
  /```javascript\s*/gi,
  /```ts\s*/gi,
  /```/g,
];

export const removeCodeFences: Sanitizer = (input) => {
  if (!input.includes('```')) return { content: input, changed: false };
  let updated = input;
  for (const r of FENCE_REGEXES) {
    updated = updated.replace(r, '');
  }
  if (updated !== input) {
    return { content: updated, changed: true, description: 'Removed code fences' };
  }
  return { content: input, changed: false };
};
