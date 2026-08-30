#!/usr/bin/env node
import { execSync, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const configPath = join(root, "hivolt.config.json");

function ask(rl, q, fallback = "") {
  const hint = fallback ? ` [${fallback}]` : "";
  return rl.question(`${q}${hint}: `).then((v) => v.trim() || fallback);
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
  return res.status === 0;
}

function detectPublicIp() {
  try {
    return execSync("curl -4 -fsS --max-time 6 https://api.ipify.org", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function writeStartScripts(port) {
  const bat = `@echo off\r\ncd /d "%~dp0"\r\necho.\r\necho  HIVOLT B2B REACHER\r\necho  Login page comes first — paste the access token you were sold.\r\necho.\r\nnode ".\\node_modules\\vite\\bin\\vite.js" dev --host 0.0.0.0 --port ${port}\r\npause\r\n`;
  writeFileSync(join(root, "start-hivolt.bat"), bat);
  const sh = `#!/bin/sh\ncd "$(dirname "$0")"\necho\necho " HIVOLT B2B REACHER"\nexec node ./node_modules/vite/bin/vite.js dev --host 0.0.0.0 --port ${port}\n`;
  writeFileSync(join(root, "start-hivolt.sh"), sh);
}

async function main() {
  console.log("\n====================================");
  console.log(" HIVOLT B2B REACHER  ·  easy setup");
  console.log("====================================\n");

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 20) {
    console.error(`Node ${process.versions.node} is too old. Install Node 22 LTS and re-run setup.`);
    process.exit(1);
  }
  console.log(`Node ${process.versions.node}  OK`);

  if (!existsSync(join(root, "package.json"))) {
    console.error("Run this from the project folder (package.json not found).");
    process.exit(1);
  }

  const rl = createInterface({ input, output });
  try {
    if (!existsSync(join(root, "node_modules"))) {
      console.log("\nInstalling npm packages (this can take a few minutes)...");
      const okInstall = run(process.platform === "win32" ? "npm.cmd" : "npm", ["install"]);
      if (!okInstall) {
        console.error("npm install failed. Check the log above and re-run setup.");
        process.exit(1);
      }
    }

    const publicIp = detectPublicIp();
    if (publicIp) console.log(`\nThis machine's public IP: ${publicIp}`);

    const domain = await ask(rl, "Domain to use for this panel (example panel.yourdomain.com). Leave blank to skip", "");
    const portRaw = await ask(rl, "Port to listen on (80 needs Administrator on Windows)", "80");
    const port = String(Math.max(1, Number(portRaw) || 80));

    writeFileSync(configPath, JSON.stringify({ publicHost: domain || "", port: Number(port), publicIp, updatedAt: new Date().toISOString() }, null, 2) + "\n");
    writeStartScripts(port);

    if (process.platform === "win32") {
      const openFw = (await ask(rl, "Open Windows Firewall for this port? (y/n)", "y")).toLowerCase().startsWith("y");
      if (openFw) {
        const rule = `netsh advfirewall firewall add rule name="HIVOLT B2B Reacher" dir=in action=allow protocol=TCP localport=${port}`;
        const fw = spawnSync("powershell.exe", ["-NoProfile", "-Command", rule], { stdio: "inherit" });
        if (fw.status !== 0) console.log("Firewall rule skipped (run setup as Administrator to add it).");
      }
    }

    console.log("\n------------------------------------");
    console.log(" Setup finished");
    console.log("------------------------------------");
    if (domain && publicIp) {
      console.log("Create a DNS A record:");
      console.log(`   ${domain}   A   ${publicIp}`);
      console.log(`Then open http://${domain}${port === "80" ? "" : ":" + port}/`);
    } else if (publicIp) {
      console.log(`Open  http://${publicIp}${port === "80" ? "" : ":" + port}/`);
    }
    console.log("Start with start-hivolt.bat (Windows) or sh start-hivolt.sh");
    console.log("Paste the HV1 access token on the login page.");
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
