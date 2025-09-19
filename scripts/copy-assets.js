const fs = require('fs');
const path = require('path');

// Configuration constants
const PATHS = {
  SOURCE_RELATIVE: '../src/components/reporting/templates',
  DEST_RELATIVE: '../dist/src/components/reporting/templates',
};

/**
 * Cross-platform asset copying script to copu template files from src to dist directory after
 * TypeScript compilation.
 */
function copyAssets() {
  try {
    const src = path.resolve(__dirname, PATHS.SOURCE_RELATIVE);
    const dest = path.resolve(__dirname, PATHS.DEST_RELATIVE);
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(src, dest, { recursive: true });    
    console.log('Templates copied successfully from:');
    console.log(`  Source: ${src}`);
    console.log(`  Destination: ${dest}`);
  } catch (error) {
    console.error('Error copying templates:', error.message);
    process.exit(1);
  }
}

copyAssets();
