import { gzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

// DESIGN §17: main bundle <= 600 KB gz, whole initial payload <= 1.2 MB gz.
// "Initial" is what a cold visitor must download before the menu paints — the
// entry chunk plus everything the manifest marks as its static import, plus the
// CSS those chunks pull in. Lazily imported screens are deliberately excluded;
// that is the entire point of the split.
const MAIN_BUDGET = 600 * 1024;
const INITIAL_BUDGET = 1200 * 1024;

const DIST = join(process.cwd(), "dist");
const APP_DIST = existsSync(join(DIST, "play")) ? join(DIST, "play") : DIST;
const MANIFEST = join(DIST, ".vite", "manifest.json");

interface ManifestEntry {
  file: string;
  name?: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
}

const report = process.argv.includes("--report");

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

if (report) {
  const out = join(process.cwd(), "sim-out", "phase12");
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "size.json"),
    `${JSON.stringify({ mainGz, initialGz, rows }, null, 2)}\n`,
  );
  console.log(`size-check: wrote ${join(out, "size.json")}`);
}

const failures: string[] = [];
if (mainGz > MAIN_BUDGET)
  failures.push(`main chunk ${kb(mainGz)} exceeds ${kb(MAIN_BUDGET)}`);
if (initialGz > INITIAL_BUDGET)
  failures.push(`initial total ${kb(initialGz)} exceeds ${kb(INITIAL_BUDGET)}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`size-check: ${failure}`);
  process.exit(1);
}

console.log("size-check: ok");
