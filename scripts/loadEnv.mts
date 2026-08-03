import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

// Vite loads .env files for the app; a standalone tsx script does not, so an
// owner key that lives in .env.local would be invisible to `npm run` scripts
// without this. A real environment variable always wins, so CI and one-off
// shell overrides keep working.
const FILES = [".env.local", ".env"];

const stripQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

export const loadEnv = (root = process.cwd()): void => {
  for (const name of FILES) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (line === "" || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      process.env[key] = stripQuotes(line.slice(eq + 1));
    }
  }
};
