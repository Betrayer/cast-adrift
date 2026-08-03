import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import process from "node:process";

// Vite builds the app at base `/` so the dev server and every Phase 7-11 e2e
// driver keep working unchanged. Production wants the landing at the root and
// the game one level down, so the split happens here, after the build: the app
// HTML moves to /play/index.html and the static landing takes its place. Asset
// URLs are absolute, so the app runs from either path.
const ROOT = process.cwd();
const DIST = join(ROOT, "dist");
const LANDING = join(ROOT, "landing");
const PLAY = join(DIST, "play");

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
