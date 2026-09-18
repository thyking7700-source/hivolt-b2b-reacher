#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const systemPython = process.platform === "win32" ? "python" : "python3";
const python = join(
  root,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const requiredImports = "import bs4; import playwright.async_api";
const browserCheck = "import os, sys; from playwright.sync_api import sync_playwright; p = sync_playwright().start(); path = p.chromium.executable_path; p.stop(); sys.exit(0 if os.path.exists(path) else 1)";

function run(command, args, stdio = "inherit") {
  return spawnSync(command, args, { stdio, shell: false, cwd: root });
}

const version = run(systemPython, ["--version"], "pipe");
if (version.status !== 0) {
  console.error(`[python-setup] ${systemPython} was not found. Install Python 3 to use auto-fill.`);
  process.exit(1);
}

if (!existsSync(python)) {
  console.log("[python-setup] Creating project virtual environment...");
  const venv = run(systemPython, ["-m", "venv", join(root, ".venv")]);
  if (venv.status !== 0) {
    console.error("[python-setup] Could not create .venv.");
    if (process.platform !== "win32") {
      console.error("[python-setup] Run: apt-get update && apt-get install -y python3-venv");
    }
    process.exit(venv.status ?? 1);
  }
}

const importsReady = run(python, ["-c", requiredImports], "ignore").status === 0;
const browserReady = importsReady && run(python, ["-c", browserCheck], "ignore").status === 0;
if (importsReady && browserReady) {
  console.log("[python-setup] Auto-fill dependencies ready.");
  process.exit(0);
}

if (!importsReady) {
  console.log("[python-setup] Installing auto-fill Python packages...");
  const install = run(python, [
    "-m",
    "pip",
    "install",
    "--disable-pip-version-check",
    "beautifulsoup4",
    "playwright",
  ]);
  if (install.status !== 0) {
    console.error("[python-setup] Installation failed inside .venv. Re-run: npm run setup:python");
    process.exit(install.status ?? 1);
  }
}

if (run(python, ["-c", requiredImports], "ignore").status !== 0) {
  console.error("[python-setup] Packages installed, but Python still cannot import them.");
  process.exit(1);
}

if (run(python, ["-c", browserCheck], "ignore").status !== 0) {
  console.log("[python-setup] Installing Chromium for auto-fill...");
  const browserInstall = run(python, ["-m", "playwright", "install", "chromium"]);
  if (browserInstall.status !== 0) {
    console.error("[python-setup] Chromium installation failed. Re-run: npm run setup:python");
    process.exit(browserInstall.status ?? 1);
  }
}

console.log("[python-setup] Auto-fill dependencies ready.");
