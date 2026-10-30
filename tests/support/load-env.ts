import fs from "node:fs";
import path from "node:path";

export function setup() {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");

  if (!fs.existsSync(envLocalPath)) {
    return;
  }

  const contents = fs.readFileSync(envLocalPath, "utf-8");

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");

    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();

    if (key !== "" && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}
