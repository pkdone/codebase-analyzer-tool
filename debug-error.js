const fs = require('fs');
const { parseJsonWithSanitizers } = require('./dist/src/llm/json-processing/core/json-parsing.js');
const { fixHeuristicJsonErrors: fixHeuristic } = require('./dist/src/llm/json-processing/sanitizers/index.js');

const logFile = process.argv[2] || 'output/errors/response-error-2025-12-01T16-30-40-763Z.log';
const content = fs.readFileSync(logFile, 'utf8');
const jsonMatch = content.match(/Bad LLM JSON response:\s*\n\s*```\s*\n([\s\S]*?)```/);

if (jsonMatch) {
  let jsonContent = jsonMatch[1];
  
  // Test just fixHeuristicJsonErrors
  const heuristicResult = fixHeuristic(jsonContent);
  console.log('After fixHeuristicJsonErrors:');
  console.log('Changed:', heuristicResult.changed);
  if (heuristicResult.content.includes('e-12,')) {
    const idx = heuristicResult.content.indexOf('e-12,');
    console.log('e-12, found at position', idx);
    console.log('Context:', JSON.stringify(heuristicResult.content.substring(Math.max(0, idx-30), idx+10)));
  }
  if (heuristicResult.content.includes('alues":')) {
    const idx = heuristicResult.content.indexOf('alues":');
    console.log('alues": found at position', idx);
    console.log('Context:', JSON.stringify(heuristicResult.content.substring(Math.max(0, idx-30), idx+10)));
  }
  
  const result = parseJsonWithSanitizers(jsonContent);
  
  if (!result.success) {
    const error = result.error?.cause || result.error;
    console.log('\nError after full sanitization:', error.message);
    const posMatch = error.message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1]);
      console.log('\nAround position', pos, ':');
      const start = Math.max(0, pos - 100);
      const end = Math.min(jsonContent.length, pos + 100);
      console.log(jsonContent.substring(start, end));
      console.log('\nSanitization steps applied:', result.steps.join(' -> '));
    }
  } else {
    console.log('\nSUCCESS: Fixed!');
  }
}

