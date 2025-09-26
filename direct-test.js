// Direct test of the sanitization function
const fs = require('fs');

// Read the compiled JavaScript directly to see the function
const jsContent = fs.readFileSync('./dist/src/llm/utils/json-tools.js', 'utf8');

// Look for the fixOverEscapedSequences function
const funcMatch = jsContent.match(/function fixOverEscapedSequences\([\s\S]*?\n}/);
if (funcMatch) {
  console.log('Found fixOverEscapedSequences function:');
  console.log(funcMatch[0].substring(0, 300) + '...');
} else {
  console.log('Could not find fixOverEscapedSequences function in compiled JS');
}

// Test the actual module
const { convertTextToJSONAndOptionallyValidate } = require('./dist/src/llm/utils/json-tools.js');
const { LLMOutputFormat } = require('./dist/src/llm/types/llm.types.js');

// Test with a minimal JSON containing just the problematic pattern
const testJson = `{
  "test": "REPLACE(field, \\\\\\\\'.\\\\\\\\'\\, \\\\\\\\'\\\\\\\\')"
}`;

console.log('\\n--- Testing minimal problematic JSON ---');
console.log('Original:', JSON.stringify(testJson));

try {
  console.log('Testing original JSON parsing...');
  JSON.parse(testJson);
  console.log('ERROR: Original should have failed but parsed successfully');
} catch (e) {
  console.log('EXPECTED: Original JSON failed:', e.message.substring(0, 100));
}

try {
  console.log('\\nTesting with sanitization function...');
  const result = convertTextToJSONAndOptionallyValidate(
    testJson,
    "direct-test",
    { outputFormat: LLMOutputFormat.JSON }
  );
  console.log('SUCCESS: Sanitization worked!');
  console.log('Result:', result);
} catch (e) {
  console.log('FAILED: Sanitization did not work');
  console.log('Error:', e.message.substring(0, 200));
}
