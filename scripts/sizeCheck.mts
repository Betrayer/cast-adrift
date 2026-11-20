import { gzipSync } from "node:zlib";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import process from "node:process";
import { filesUnder } from "./files";

const MAIN_BUDGET = 600 * 1024;
const INITIAL_BUDGET = 1200 * 1024;
const AUDIO_BUDGET = 400 * 1024;
const LANDING_BUDGET = 60 * 1024;

const DIST = join(process.cwd(), "dist");
const SPLIT = existsSync(join(DIST, "play", "index.html"));
const APP_DIST = SPLIT ? join(DIST, "play") : DIST;
const MANIFEST = join(DIST, ".vite", "manifest.json");

interface ManifestEntry {
  file: string;
  name?: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
}

const report = process.argv.includes("--report");

const AUDIO_DIR = existsSync(join(APP_DIST, "audio"))
  ? join(APP_DIST, "audio")
  : join(process.cwd(), "public", "audio");

const audioBytes = (ext: string): number =>
  filesUnder(AUDIO_DIR, (path) => path.endsWith(ext)).reduce((total, path) => total + statSync(path).size, 0);

const shippedAudio = audioBytes(".webm");
const fallbackAudio = audioBytes(".wav");

const landingBytes = (): number => {
  if (!SPLIT) return 0;
  const page = join(DIST, "index.html");
  if (!existsSync(page)) return 0;
  let total = statSync(page).size;
  const ships = join(DIST, "ships");
  if (!existsSync(ships)) return total;
  for (const entry of readdirSync(ships, { withFileTypes: true })) {
    if (entry.isFile()) total += statSync(join(ships, entry.name)).size;
  }
  return total;
};

const landing = landingBytes();

const E2E_MARKERS: readonly string[] = ["caTest", "ca-test-api"];

const e2eLeaks = (): string[] => {
  const hits: string[] = [];
  for (const path of filesUnder(join(DIST, "assets"), (file) => file.endsWith(".js"))) {
    const source = readFileSync(path, "utf8");
    for (const marker of E2E_MARKERS) if (source.includes(marker)) hits.push(`${basename(path)} → ${marker}`);
  }
  return hits;
};

const VOICE_MARKER = "speechSynthesis";

const voiceScripts = (dir: string): { files: number; hits: string[] } => {
  const files = filesUnder(join(dir, "assets"), (file) => file.endsWith(".js"));
  const hits = files.filter((path) => readFileSync(path, "utf8").includes(VOICE_MARKER)).map((path) => basename(path));
  return { files: files.length, hits };
};

if (process.argv.includes("--novoice")) {
  const { files, hits } = voiceScripts(join(process.cwd(), "dist-novoice"));
  if (files === 0) {
    console.error("size-check: no build at dist-novoice: run npm run build:novoice first");
    process.exit(1);
  }
  if (hits.length > 0) {
    for (const hit of hits) console.error(`size-check: the novoice build carries ${VOICE_MARKER} in ${hit}`);
    process.exit(1);
  }
  console.log(`size-check: the novoice build carries no ${VOICE_MARKER} (${String(files)} scripts)`);
  process.exit(0);
}

if (!existsSync(MANIFEST)) {
  console.error(
    `size-check: no manifest at ${MANIFEST} — run \`npm run build\` first`,
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as Record<
  string,
  ManifestEntry
>;

const gzipOf = (file: string): number => {
  const path = join(DIST, file);
  if (!existsSync(path)) return 0;
  return gzipSync(readFileSync(path), { level: 9 }).length;
};

const entries = Object.entries(manifest);
const entryKey = entries.find(([, value]) => value.isEntry === true)?.[0];
if (entryKey === undefined) {
  console.error("size-check: manifest has no entry chunk");
  process.exit(1);
}

const initial = new Set<string>();
const walk = (key: string): void => {
  if (initial.has(key)) return;
  initial.add(key);
  for (const next of manifest[key]?.imports ?? []) walk(next);
};
walk(entryKey);

interface Row {
  name: string;
  file: string;
  gz: number;
}

const rows: Row[] = [];
for (const key of initial) {
  const entry = manifest[key];
  if (entry === undefined) continue;
  rows.push({ name: entry.name ?? key, file: entry.file, gz: gzipOf(entry.file) });
  for (const css of entry.css ?? []) {
    rows.push({ name: `${entry.name ?? key} (css)`, file: css, gz: gzipOf(css) });
  }
}
rows.sort((a, b) => b.gz - a.gz);

const entryFile = manifest[entryKey]?.file ?? "";
const mainGz = gzipOf(entryFile);
const initialGz = rows.reduce((sum, row) => sum + row.gz, 0);

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;

console.log(`size-check: app dist ${APP_DIST}`);
for (const row of rows) {
  console.log(`  ${kb(row.gz).padStart(10)}  ${row.name}`);
}
console.log(`  main chunk   ${kb(mainGz)} / ${kb(MAIN_BUDGET)}`);
console.log(`  initial total ${kb(initialGz)} / ${kb(INITIAL_BUDGET)}`);
console.log(`  audio (opus)  ${kb(shippedAudio)} / ${kb(AUDIO_BUDGET)}`);
console.log(`  landing       ${kb(landing)} / ${kb(LANDING_BUDGET)}`);
console.log(`  audio (wav fallback, unbudgeted) ${kb(fallbackAudio)}`);

if (report) {
  const out = join(process.cwd(), "sim-out", "phase12");
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "size.json"),
    `${JSON.stringify(
      { mainGz, initialGz, shippedAudio, fallbackAudio, landing, rows },
      null,
      2,
    )}\n`,
  );
  console.log(`size-check: wrote ${join(out, "size.json")}`);
}

const leaks = e2eLeaks();
if (leaks.length === 0) console.log("  e2e hooks   absent from the bundle");
const voiced = voiceScripts(DIST);
if (voiced.hits.length > 0) console.log(`  voice       ${voiced.hits.join(", ")}`);

const failures: string[] = [];
for (const leak of leaks) failures.push(`e2e hook shipped to production: ${leak}`);
if (voiced.hits.length === 0)
  failures.push(`no script in the build carries ${VOICE_MARKER}: the voice is missing, so the novoice check proves nothing`);
if (mainGz > MAIN_BUDGET)
  failures.push(`main chunk ${kb(mainGz)} exceeds ${kb(MAIN_BUDGET)}`);
if (initialGz > INITIAL_BUDGET)
  failures.push(`initial total ${kb(initialGz)} exceeds ${kb(INITIAL_BUDGET)}`);
if (shippedAudio === 0)
  failures.push("no encoded audio found in public/audio — see docs/audio-credits.md");
if (shippedAudio > AUDIO_BUDGET)
  failures.push(`audio ${kb(shippedAudio)} exceeds ${kb(AUDIO_BUDGET)}`);
if (!SPLIT)
  failures.push("no dist/play/index.html: the site split did not run, so dist/index.html is the app and not the landing; run npm run build");
else if (landing === 0)
  failures.push("no landing at dist/index.html: run npm run build");
if (landing > LANDING_BUDGET)
  failures.push(
    `landing ${kb(landing)} exceeds ${kb(LANDING_BUDGET)} — it is one request plus six ship svgs`,
  );

if (failures.length > 0) {
  for (const failure of failures) console.error(`size-check: ${failure}`);
  process.exit(1);
}

console.log("size-check: ok");
