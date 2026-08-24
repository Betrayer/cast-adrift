import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const LANDING = join(ROOT, "landing");
const PLAY = join(DIST, "play");

const UNLINTABLE = [
  "firestore.rules",
  join("landing", "index.html"),
  join("landing", "privacy.html"),
];

const cssFiles = (): string[] =>
  readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".css"))
    .map((entry) => join("src", entry));

const assertNoComments = (): void => {
  const offenders: string[] = [];
  for (const relative of [...UNLINTABLE, ...cssFiles()]) {
    const path = join(ROOT, relative);
    if (!existsSync(path)) continue;
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (/^\s*(\/\/|<!--)/.test(line) || line.includes("/*")) {
          offenders.push(`${relative}:${String(index + 1)}`);
        }
      });
  }
  if (offenders.length === 0) return;
  console.error(
    `build-site: comments are not allowed — move the rationale to docs/design-notes.md:\n  ${offenders.join("\n  ")}`,
  );
  process.exit(1);
};

assertNoComments();

if (!existsSync(join(DIST, "index.html"))) {
  console.error("build-site: dist/index.html missing — run `vite build` first");
  process.exit(1);
}

rmSync(PLAY, { recursive: true, force: true });
mkdirSync(PLAY, { recursive: true });
renameSync(join(DIST, "index.html"), join(PLAY, "index.html"));

const copied: string[] = [];
for (const name of readdirSync(LANDING)) {
  const from = join(LANDING, name);
  cpSync(from, join(DIST, name), { recursive: true });
  copied.push(statSync(from).isDirectory() ? `${name}/` : name);
}

if (!existsSync(join(DIST, "brand", "og.png"))) {
  console.warn(
    "build-site: landing/brand/og.png is missing — the share preview will not render",
  );
}

console.log(
  `build-site: app -> dist/play/index.html · landing -> ${copied.join(", ")}`,
);
