import { injectable } from "tsyringe";
import { exec } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

/**
 * Configuration options for Mermaid rendering.
 */
export interface MermaidRenderOptions {
  /** Theme for the diagram. Default: "default" */
  theme?: "default" | "forest" | "dark" | "neutral";
  /** Background color. Default: "white" */
  backgroundColor?: string;
  /** Width of the rendered diagram. Default: 800 */
  width?: number;
  /** Height of the rendered diagram. Default: 600 */
  height?: number;
}

/**
 * Service for rendering Mermaid diagram definitions to SVG.
 * Uses mermaid-cli (mmdc) under the hood for server-side rendering.
 */
@injectable()
export class MermaidRenderer {
  private readonly defaultOptions: Required<MermaidRenderOptions> = {
    theme: "default",
    backgroundColor: "white",
    width: 800,
    height: 600,
  };

  /** Path to the Puppeteer configuration file for sandbox-free rendering */
  private readonly puppeteerConfigPath = path.join(__dirname, "puppeteer.config.json");

  /**
   * Render a Mermaid diagram definition to SVG string.
   *
   * @param mermaidDefinition - The Mermaid diagram definition (e.g., "graph LR\n    A --> B")
   * @param options - Optional rendering configuration
   * @returns The rendered SVG as a string
   */
  async renderToSvg(
    mermaidDefinition: string,
    options: MermaidRenderOptions = {},
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };

    // Create unique temp files
    const tempId = crypto.randomBytes(8).toString("hex");
    const tempDir = os.tmpdir();
    const inputFile = path.join(tempDir, `mermaid-input-${tempId}.mmd`);
    const outputFile = path.join(tempDir, `mermaid-output-${tempId}.svg`);

    try {
      // Write the mermaid definition to a temp file
      await fs.writeFile(inputFile, mermaidDefinition, "utf-8");

      // Run mmdc to render the diagram
      await this.runMmdc(inputFile, outputFile, opts);

      // Read the generated SVG
      const svgContent = await fs.readFile(outputFile, "utf-8");

      return svgContent;
    } finally {
      // Clean up temp files
      await this.cleanupTempFiles(inputFile, outputFile);
    }
  }

  /**
   * Escape a shell argument to prevent command injection.
   */
  private escapeShellArg(arg: string): string {
    // Wrap in single quotes and escape any single quotes within
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Run the mermaid-cli (mmdc) command to render a diagram.
   */
  private async runMmdc(
    inputFile: string,
    outputFile: string,
    options: Required<MermaidRenderOptions>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build the command with properly escaped arguments
      const command = [
        "npx",
        "mmdc",
        "-i",
        this.escapeShellArg(inputFile),
        "-o",
        this.escapeShellArg(outputFile),
        "-t",
        options.theme,
        "-b",
        this.escapeShellArg(options.backgroundColor),
        "-w",
        String(options.width),
        "-H",
        String(options.height),
        "-p",
        this.escapeShellArg(this.puppeteerConfigPath),
        "-q",
      ].join(" ");

      exec(command, (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`mmdc exited with code ${String(error.code)}: ${stderr}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Clean up temporary files, ignoring errors if files don't exist.
   */
  private async cleanupTempFiles(...files: string[]): Promise<void> {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch {
        // Ignore errors - file may not exist
      }
    }
  }
}
