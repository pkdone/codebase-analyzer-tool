import { injectable, inject } from "tsyringe";
import path from "path";
import ejs from "ejs";
import { coreTokens, reportingTokens } from "../../di/tokens";
import type { OutputConfigType } from "../../config/output.config";
import { writeFile } from "../../../common/fs/file-operations";
import { HtmlReportAssetService } from "./services/html-report-asset.service";
import type {
  PreparedHtmlReportData,
  PreparedHtmlReportDataWithoutAssets,
} from "./types/html-report-data.types";

/**
 * Class responsible for rendering HTML reports from prepared template data.
 * This is a pure presentation component that handles template rendering, asset loading, and file writing.
 *
 * Assets (CSS and SVG icons) are loaded via the injected HtmlReportAssetService,
 * decoupling the generator from asset management concerns.
 */
@injectable()
export class HtmlReportWriter {
  constructor(
    @inject(coreTokens.OutputConfig) private readonly config: OutputConfigType,
    @inject(reportingTokens.HtmlReportAssetService)
    private readonly assetService: HtmlReportAssetService,
  ) {}

  /**
   * Renders HTML report from prepared template data and writes it to file.
   * Automatically loads and injects CSS and SVG assets via HtmlReportAssetService.
   *
   * @param preparedData - The prepared report data (without inline assets)
   * @param htmlFilePath - The path where the HTML report will be written
   */
  async writeHTMLReportFile(
    preparedData: PreparedHtmlReportDataWithoutAssets,
    htmlFilePath: string,
  ): Promise<void> {
    // Load assets via the asset service
    const assets = await this.assetService.loadAssets();

    // Combine prepared data with loaded assets
    const fullData: PreparedHtmlReportData = {
      ...preparedData,
      inlineCss: assets.inlineCss,
      jsonIconSvg: assets.jsonIconSvg,
    };

    const templatePath = path.join(
      __dirname,
      this.config.HTML_TEMPLATES_DIR,
      this.config.HTML_MAIN_TEMPLATE_FILE,
    );

    const htmlContent = await ejs.renderFile(templatePath, fullData);
    await writeFile(htmlFilePath, htmlContent);

    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
