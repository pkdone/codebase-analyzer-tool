import { injectable, inject } from "tsyringe";
import path from "node:path";
import { promises as fs } from "node:fs";
import { coreTokens } from "../../../di/tokens";
import type { OutputConfigType } from "../../../config/output.config";
import { generateBrandColorCssBlock } from "../config/brand-theme.config";
import { ENCODING_UTF8 } from "../../../../common/constants";
import { logInfo, logWarn } from "../../../../common/utils/logging";

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
 * This service is injected into HtmlReportWriter and ReportArtifactGenerator.
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
      fs.readFile(cssPath, ENCODING_UTF8),
      fs.readFile(jsonIconPath, ENCODING_UTF8),
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
    await fs.mkdir(assetsDir, { recursive: true });
    await this.ensureSingleAsset(
      path.join(assetsDir, this.outputConfig.externalAssets.MERMAID_UMD_FILENAME),
      "mermaid/dist/mermaid.min.js",
      this.outputConfig.externalAssets.MERMAID_CDN_UMD_URL,
      "Mermaid.js",
    );
  }

  /**
   * Ensures Prism.js (core + SQL language) is available in the output assets directory
   * for offline SQL syntax highlighting in the report. Copies from local node_modules
   * first, falls back to CDN download if needed. Skips if the files already exist.
   *
   * @param outputDir - The output directory where the report will be generated
   */
  async ensurePrismAsset(outputDir: string): Promise<void> {
    const assetsDir = path.join(outputDir, this.outputConfig.assets.ASSETS_SUBDIR);

    await fs.mkdir(assetsDir, { recursive: true });

    await Promise.all([
      this.ensureSingleAsset(
        path.join(assetsDir, this.outputConfig.externalAssets.PRISM_CORE_FILENAME),
        "prismjs/prism.js",
        this.outputConfig.externalAssets.PRISM_CDN_CORE_URL,
        "Prism.js core",
      ),
      this.ensureSingleAsset(
        path.join(assetsDir, this.outputConfig.externalAssets.PRISM_SQL_FILENAME),
        "prismjs/components/prism-sql.min.js",
        this.outputConfig.externalAssets.PRISM_CDN_SQL_URL,
        "Prism.js SQL component",
      ),
    ]);
  }

  /**
   * Helper that ensures a single external asset file exists in the output directory.
   * Attempts to copy from node_modules first, then falls back to CDN download.
   *
   * @param targetPath - Full path where the asset should be placed
   * @param nodeModulesRequire - Module specifier for require.resolve (e.g. "prismjs/prism.js")
   * @param cdnUrl - CDN URL to download from if node_modules copy fails
   * @param label - Human-readable label for log messages
   */
  private async ensureSingleAsset(
    targetPath: string,
    nodeModulesRequire: string,
    cdnUrl: string,
    label: string,
  ): Promise<void> {
    try {
      // Check if file already exists
      try {
        await fs.access(targetPath);
        logInfo(`${label} already exists in assets directory, skipping`);
        return;
      } catch {
        // File doesn't exist, proceed
      }

      // Prefer local node_modules
      try {
        const localPath = require.resolve(nodeModulesRequire);
        const buffer = await fs.readFile(localPath);
        await fs.writeFile(targetPath, buffer);
        logInfo(`${label} copied from node_modules to ${targetPath}`);
        return;
      } catch {
        // Fall back to CDN
      }

      logInfo(`Downloading ${label} for offline report support...`);
      const response = await fetch(cdnUrl);
      if (!response.ok) {
        throw new Error(`Failed to download ${label}: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await fs.writeFile(targetPath, buffer);
      logInfo(`${label} downloaded and copied to ${targetPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logWarn(`Failed to ensure ${label}: ${errorMessage}`);
    }
  }
}
