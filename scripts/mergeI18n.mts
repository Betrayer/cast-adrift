import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

type Leaf = string | { name: string; desc: string };
type Fragment = Record<string, Record<string, Record<string, Leaf>>>;

const LOCALES = ["en", "ru", "uk"] as const;
type Locale = (typeof LOCALES)[number];

const [fragmentDir] = process.argv.slice(2);
if (fragmentDir === undefined) {
  console.error("usage: mergeI18n <fragment-dir> [--prune section=key,key]");
  process.exit(1);
}

const pruneArg = process.argv.find((a) => a.startsWith("--prune="));
const pruneSections = new Set(
  pruneArg === undefined ? [] : pruneArg.slice("--prune=".length).split(","),
);

const contentPath = (locale: Locale): string =>
  join(process.cwd(), "src", "i18n", locale, "content.json");

const content: Record<Locale, Record<string, Record<string, Leaf>>> = {
  en: JSON.parse(readFileSync(contentPath("en"), "utf8")),
  ru: JSON.parse(readFileSync(contentPath("ru"), "utf8")),
  uk: JSON.parse(readFileSync(contentPath("uk"), "utf8")),
};

const files = readdirSync(fragmentDir).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.error(`mergeI18n: no .json fragments in ${fragmentDir}`);
  process.exit(1);
}

const touched = new Map<string, Set<string>>();
let written = 0;

for (const file of files) {
  const fragment = JSON.parse(
    readFileSync(join(fragmentDir, file), "utf8"),
  ) as Fragment;
  for (const [section, entries] of Object.entries(fragment)) {
    const seen = touched.get(section) ?? new Set<string>();
    for (const [id, byLocale] of Object.entries(entries)) {
      seen.add(id);
      for (const locale of LOCALES) {
        const value = byLocale[locale];
        if (value === undefined) {
          console.error(
            `mergeI18n: ${file} ${section}.${id} is missing "${locale}"`,
          );
          process.exit(1);
        }
        const bucket = (content[locale][section] ??= {});
        bucket[id] = value;
        written += 1;
      }
    }
    touched.set(section, seen);
  }
}

for (const section of pruneSections) {
  const keep = touched.get(section);
  if (keep === undefined) {
    console.error(`mergeI18n: --prune names "${section}" but no fragment wrote it`);
    process.exit(1);
  }
  for (const locale of LOCALES) {
    const bucket = content[locale][section];
    if (bucket === undefined) continue;
    content[locale][section] = Object.fromEntries(
      Object.entries(bucket).filter(([id]) => keep.has(id)),
    );
  }
}

for (const locale of LOCALES) {
  const sorted: Record<string, Record<string, Leaf>> = {};
  for (const [section, entries] of Object.entries(content[locale])) {
    sorted[section] = entries;
  }
  writeFileSync(
    contentPath(locale),
    `${JSON.stringify(sorted, null, 2)}\n`,
    "utf8",
  );
}

for (const [section, ids] of touched) {
  console.log(`mergeI18n: ${section} — ${String(ids.size)} ids`);
}
console.log(
  `mergeI18n: wrote ${String(written)} strings across ${String(LOCALES.length)} locales from ${String(files.length)} fragments`,
);
