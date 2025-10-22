import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration constants
const PATHS = {
  SOURCE_RELATIVE: "../src/components/reporting/templates",
  DEST_RELATIVE: "../dist/src/components/reporting/templates",
};

/**
 * Cross-platform asset copying script to copy template files from src to dist directory after
 * TypeScript compilation.
 */
async function copyAssets() {
  try {
    const src = path.resolve(__dirname, PATHS.SOURCE_RELATIVE);
    const dest = path.resolve(__dirname, PATHS.DEST_RELATIVE);
    await fs.mkdir(dest, { recursive: true });
    await fs.cp(src, dest, { recursive: true });
    console.log("Templates and assets copied successfully from:");
    console.log(`  Source: ${src}`);
    console.log(`  Destination: ${dest}`);
  } catch (error) {
    console.error("Error copying templates:", error.message);
    process.exit(1);
  }
}

await copyAssets();

