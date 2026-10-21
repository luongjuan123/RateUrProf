import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("Production CSS & Asset Delivery Integrity", () => {
  const rootDir = process.cwd();
  const nextStaticDir = path.join(rootDir, ".next", "static");
  const serverAppDir = path.join(rootDir, ".next", "server", "app");

  it("01. Static assets directory exists and contains compiled CSS files", () => {
    assert.ok(fs.existsSync(nextStaticDir), ".next/static directory must exist after build");

    // Look for all .css files under .next/static (including chunks and css subdirectories)
    const findCssFiles = (dir: string): string[] => {
      let results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(findCssFiles(fullPath));
        } else if (entry.name.endsWith(".css")) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const cssFiles = findCssFiles(nextStaticDir);
    assert.ok(cssFiles.length > 0, "Production build must emit at least one CSS bundle in .next/static");

    // The primary stylesheet should be non-empty and substantial (> 20 KB)
    const totalCssSize = cssFiles.reduce((acc, f) => acc + fs.statSync(f).size, 0);
    assert.ok(totalCssSize > 20000, `Expected CSS bundle to exceed 20 KB, got ${totalCssSize} bytes`);
  });

  it("02. Compiled CSS contains essential Tailwind utilities and layout rules", () => {
    const findCssFiles = (dir: string): string[] => {
      let results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(findCssFiles(fullPath));
        } else if (entry.name.endsWith(".css")) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const cssFiles = findCssFiles(nextStaticDir);
    const combinedCss = cssFiles.map((f) => fs.readFileSync(f, "utf-8")).join("\n");

    // Critical utility assertions matching RateUrProfs layout requirements
    const requiredRules = [
      { name: "flex layout", pattern: /\.flex\{/ },
      { name: "grid layout", pattern: /\.grid\{/ },
      { name: "flex column", pattern: /\.flex-col\{/ },
      { name: "items center", pattern: /\.items-center\{/ },
      { name: "justify between", pattern: /\.justify-between\{/ },
      { name: "min-h-screen", pattern: /\.min-h-screen\{/ },
      { name: "max-w-7xl", pattern: /\.max-w-7xl\{/ },
      { name: "responsive breakpoint (sm)", pattern: /@media[^{]+\(min-width:\s*40rem\)/ },
      { name: "responsive breakpoint (md)", pattern: /@media[^{]+\(min-width:\s*48rem\)/ },
      { name: "responsive breakpoint (lg)", pattern: /@media[^{]+\(min-width:\s*64rem\)/ },
      { name: "editorial red brand color", pattern: /#e03a3e/ },
    ];

    for (const rule of requiredRules) {
      assert.ok(
        rule.pattern.test(combinedCss),
        `CSS bundle must contain compiled ${rule.name}`
      );
    }
  });

  it("03. Compiled CSS does NOT contain unparsed '@tailwind utilities' or '@import \"tailwindcss\"'", () => {
    const findCssFiles = (dir: string): string[] => {
      let results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(findCssFiles(fullPath));
        } else if (entry.name.endsWith(".css")) {
          results.push(fullPath);
        }
      }
      return results;
    };

    const cssFiles = findCssFiles(nextStaticDir);
    const combinedCss = cssFiles.map((f) => fs.readFileSync(f, "utf-8")).join("\n");

    // If Tailwind v4 failed to compile, these verbatim directives leak into the CSS output
    assert.strictEqual(
      combinedCss.includes("@tailwind utilities"),
      false,
      "CSS bundle must not leak raw '@tailwind utilities' directive"
    );
    assert.strictEqual(
      combinedCss.includes('@import "tailwindcss"') || combinedCss.includes("@import 'tailwindcss'"),
      false,
      "CSS bundle must not leak raw '@import \"tailwindcss\"' directive"
    );
  });

  it("04. Server HTML templates reference existing compiled stylesheets", () => {
    assert.ok(fs.existsSync(serverAppDir), ".next/server/app directory must exist");

    const htmlFiles = ["index.html", "vi.html", "en.html"];
    for (const filename of htmlFiles) {
      const htmlPath = path.join(serverAppDir, filename);
      if (!fs.existsSync(htmlPath)) continue;

      const htmlContent = fs.readFileSync(htmlPath, "utf-8");

      // Extract stylesheet link: href="/_next/static/..."
      const linkMatch = htmlContent.match(/<link[^>]*rel="stylesheet"[^>]*href="(\/_next\/static\/[^"]+)"/);
      assert.ok(linkMatch, `${filename} must contain a stylesheet link tag`);

      const cssHref = linkMatch[1];
      // Convert /_next/static/... to disk path .next/static/...
      const relativeDiskPath = cssHref.replace(/^\/_next\/static\//, "");
      const fullDiskPath = path.join(nextStaticDir, relativeDiskPath);

      assert.ok(
        fs.existsSync(fullDiskPath),
        `Stylesheet referenced in ${filename} (${cssHref}) must exist on disk at ${fullDiskPath}`
      );

      const fileSize = fs.statSync(fullDiskPath).size;
      assert.ok(fileSize > 20000, `Referenced stylesheet must be populated (> 20KB), got ${fileSize} bytes`);
    }
  });
});
