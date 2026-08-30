import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function projectRootFromHere() {
  return dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
}

export function loadLicenseSecret(root = projectRootFromHere()) {
  const env = process.env.HIVOLT_LICENSE_SECRET?.trim();
  if (env) return env;
  const file = join(root, "license.secret");
  if (existsSync(file)) {
    const text = readFileSync(file, "utf8").trim();
    if (text) return text;
  }
  throw new Error("License secret missing. Place license.secret in the project root.");
}
