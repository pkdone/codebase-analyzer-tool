import { injectable, inject } from "tsyringe";
import path from "path";
import { promises as fs } from "fs";
import { coreTokens } from "../../../di/tokens";
import type { OutputConfigType } from "../../../config/output.config";
import { generateBrandColorCssBlock } from "../config/brand-theme.config";

/**
 * Interface representing the assets required for HTML report rendering.
 * These assets are embedded inline in the generated HTML report.
 */
export interface HtmlReportAssets {
  /** CSS content to be inlined in the HTML report */
  readonly inlineCss: string;
  /** SVG content for the JSON icon to be inlined in the HTML report */
  readonly jsonIconSvg: string;
}

/**
 * Service responsible for loading and managing assets required for HTML report generation.
 * Centralizes asset loading logic following the Single Responsibility Principle.
 *
 * Responsibilities:
 * - Loading inline CSS and SVG assets for report embedding
 * - Ensuring external assets (like Mermaid.js) are available in the output directory
 *
 * This service is injected into HtmlReportWriter and AppReportGenerator.
 */
@injectable()
export class HtmlReportAssetService {
  constructor(@inject(coreTokens.OutputConfig) private readonly outputConfig: OutputConfigType) {}

  /**
   * Loads and returns the assets required for HTML report rendering.
   * Brand color CSS variables are generated from brand-theme.config.ts and prepended
   * to the CSS content, making TypeScript the single source of truth for colors.
   *
   * @returns Promise resolving to the HTML report assets
   */
  async loadAssets(): Promise<HtmlReportAssets> {
    const templatesDir = path.join(__dirname, "..", this.outputConfig.HTML_TEMPLATES_DIR);
    const cssPath = path.join(templatesDir, this.outputConfig.assets.CSS_FILENAME);
    const jsonIconPath = path.join(
      templatesDir,
      this.outputConfig.assets.ASSETS_SUBDIR,
      this.outputConfig.assets.JSON_ICON_FILENAME,
    );

    const [cssContent, jsonIconContent] = await Promise.all([
      fs.readFile(cssPath, "utf-8"),
      fs.readFile(jsonIconPath, "utf-8"),
    ]);

    // Generate brand color CSS variables from brand-theme.config.ts and prepend to CSS
    const brandColorCss = generateBrandColorCssBlock();
    const fullCss = `${brandColorCss}\n\n${cssContent}`;

    return {
      inlineCss: fullCss,
      jsonIconSvg: jsonIconContent,
    };
  }

  /**
   * Ensures Mermaid.js is available in the output assets directory for offline report viewing.
   * Attempts to copy from local node_modules first, falls back to CDN download if needed.
   * Skips if the file already exists.
   *
   * @param outputDir - The output directory where the report will be generated
   */
  async ensureMermaidAsset(outputDir: string): Promise<void> {
    const assetsDir = path.join(outputDir, this.outputConfig.assets.ASSETS_SUBDIR);
    const mermaidPath = path.join(assetsDir, this.outputConfig.externalAssets.MERMAID_UMD_FILENAME);

    try {
      await fs.mkdir(assetsDir, { recursive: true });

      // Check if file already exists
      try {
        await fs.access(mermaidPath);
        console.log("Mermaid.js already exists in assets directory, skipping download");
        return;
      } catch {
        // File doesn't exist, proceed with download
      }

      // Prefer copying from local node_modules for true offline report generation.
      // Use require.resolve to find the package reliably regardless of CWD
      try {
        const localMermaidPath = require.resolve("mermaid/dist/mermaid.min.js");
        const buffer = await fs.readFile(localMermaidPath);
        await fs.writeFile(mermaidPath, buffer);
        console.log(`Mermaid.js copied from node_modules to ${mermaidPath}`);
        return;
      } catch {
        // Fall back to downloading from CDN (requires internet during report generation)
      }

      console.log("Downloading Mermaid.js for offline report support...");
      const response = await fetch(this.outputConfig.externalAssets.MERMAID_CDN_UMD_URL);
      if (!response.ok) {
        throw new Error(`Failed to download Mermaid.js: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(mermaidPath, buffer);
      console.log(`Mermaid.js downloaded and copied to ${mermaidPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(
        `Warning: Failed to download Mermaid.js. Report will require internet connection: ${errorMessage}`,
      );
      // Don't throw - allow report generation to continue even if Mermaid download fails
    }
  }
}
