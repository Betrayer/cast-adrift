import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SRC = join(process.cwd(), "src");

export const sourceFiles = (suffix: string, under: string = SRC): string[] =>
  readdirSync(under, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(suffix))
    .map((entry) => join(under, entry));

export const readSource = (...parts: string[]): string =>
  readFileSync(join(SRC, ...parts), "utf8");

export const relativeToSrc = (file: string): string =>
  file.slice(SRC.length + 1).replaceAll("\\", "/");
