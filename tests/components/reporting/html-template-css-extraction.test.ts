import fs from "node:fs";
import path from "node:path";

describe("HTML report template CSS extraction", () => {
  test("main.ejs links external report.css and no longer contains large inline style block", () => {
    const templatePath = path.join(
      __dirname,
      "../../../src/components/reporting/templates/main.ejs".replace(
        "tests/components/reporting",
        "",
      ),
    );
    // Resolve path relative to project root
    const resolved = path.resolve(templatePath);
    const content = fs.readFileSync(resolved, "utf-8");
    expect(content).toMatch(/<link rel="stylesheet" href="report.css" \/>/);
    // Ensure old inline <style> tag removed
    expect(content).not.toMatch(/<style>/);
  });
});
