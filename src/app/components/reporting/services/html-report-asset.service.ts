import { injectable, inject } from "tsyringe";
import path from "path";
import { promises as fs } from "fs";
import { coreTokens } from "../../../di/tokens";
import type { OutputConfigType } from "../../../config/output.config";

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
 * Service responsible for loading assets required for HTML report generation.
 * Centralizes asset loading logic that was previously scattered in the report generator,
 * following the Single Responsibility Principle.
 *
 * This service is injected into HtmlReportWriter, allowing the writer to be
 * self-contained and not depend on the generator for asset content.
 */
@injectable()
export class HtmlReportAssetService {
  /** Cached assets to avoid redundant file reads */
  private cachedAssets: HtmlReportAssets | null = null;

  constructor(@inject(coreTokens.OutputConfig) private readonly outputConfig: OutputConfigType) {}

  /**
   * Loads and returns the assets required for HTML report rendering.
   * Assets are cached after the first load to improve performance.
   *
   * @returns Promise resolving to the HTML report assets
   */
  async loadAssets(): Promise<HtmlReportAssets> {
    // Return cached assets if available
    if (this.cachedAssets) {
      return this.cachedAssets;
    }

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

    this.cachedAssets = {
      inlineCss: cssContent,
      jsonIconSvg: jsonIconContent,
    };

    return this.cachedAssets;
  }

  /**
   * Clears the cached assets, forcing a reload on the next call to loadAssets().
   * Useful for testing or when assets may have changed.
   */
  clearCache(): void {
    this.cachedAssets = null;
  }
}
