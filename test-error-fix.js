const fs = require('fs');
const path = require('path');
const { parseJsonWithSanitizers } = require('./dist/src/llm/json-processing/core/json-parsing.js');

const errorLogDir = './output/errors';
const logFiles = fs.readdirSync(errorLogDir).filter(f => f.endsWith('.log')).sort();

let fixed = 0;
let stillFailing = 0;

for (const logFile of logFiles) {
  const filePath = path.join(errorLogDir, logFile);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Skip test-resource files
  if (content.includes('Resource: test-resource')) {
    continue;
  }
  
  // Extract JSON content
  const jsonMatch = content.match(/Bad LLM JSON response:\s*\n\s*```\s*\n([\s\S]*?)```/);
  if (!jsonMatch) {
    continue;
  }
  
  const jsonContent = jsonMatch[1];
  const result = parseJsonWithSanitizers(jsonContent);
  
  if (result.success) {
    fixed++;
    console.log(`✓ FIXED: ${logFile}`);
  } else {
    stillFailing++;
    const errorMsg = result.error?.message || result.error?.cause?.message || 'Unknown error';
    console.log(`✗ STILL FAILS: ${logFile} - ${errorMsg.substring(0, 80)}`);
  }
}

console.log(`\nSummary: ${fixed} fixed, ${stillFailing} still failing`);

