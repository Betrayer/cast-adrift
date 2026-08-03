import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { loadEnv } from "./loadEnv.mjs";

loadEnv();

// The only writer of src/i18n/{de,es,fr,pl}. en is the source language, uk and
// ru are hand-written and are never touched here (DESIGN §4). Needs DEEPL_API_KEY.
//
//   npm run i18n:translate            all four machine locales, cached
//   npm run i18n:translate -- --only de
//   npm run i18n:translate -- --check verify existing files, no API calls

const SOURCE_LOCALE = "en";
const MACHINE_LOCALES = ["de", "es", "fr", "pl"] as const;
type MachineLocale = (typeof MACHINE_LOCALES)[number];

const NAMESPACES = [
  "common",
  "menu",
  "settings",
  "battle",
  "content",
  "run",
  "meta",
] as const;

const I18N = join(process.cwd(), "src", "i18n");
const GLOSSARY_PATH = join(process.cwd(), "scripts", "i18n-glossary.json");
const CACHE_PATH = join(process.cwd(), "scripts", ".translate-cache.json");
const BATCH = 45;

interface GlossaryRow {
  en: string;
  de: string;
  es: string;
  fr: string;
  pl: string;
}

type Tree = { [key: string]: string | Tree };

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const onlyAt = args.indexOf("--only");
const only = onlyAt >= 0 ? args[onlyAt + 1] : undefined;
const targets = MACHINE_LOCALES.filter(
  (locale) => only === undefined || locale === only,
);

const readTree = (locale: string, namespace: string): Tree | null => {
  const path = join(I18N, locale, `${namespace}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as Tree;
};

const flatten = (tree: Tree, prefix = ""): Map<string, string> => {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === "" ? key : `${prefix}.${key}`;
    if (typeof value === "string") out.set(path, value);
    else for (const [k, v] of flatten(value, path)) out.set(k, v);
  }
  return out;
};

const unflatten = (flat: Map<string, string>): Tree => {
  const root: Tree = {};
  for (const [path, value] of flat) {
    const parts = path.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (part === undefined) continue;
      const next = node[part];
      if (typeof next === "object") node = next;
      else {
        const created: Tree = {};
        node[part] = created;
        node = created;
      }
    }
    const last = parts[parts.length - 1];
    if (last !== undefined) node[last] = value;
  }
  return root;
};

// i18next interpolation and any inline markup must survive the round trip
// byte-for-byte; DeepL is told to leave <ph> alone and the tags are stripped
// after. Glossary terms ride the same channel, so a pinned term can never be
// re-translated on the way back.
const PLACEHOLDER = /(\{\{[^}]+\}\}|<\/?\d+>)/g;

const glossary = (
  JSON.parse(readFileSync(GLOSSARY_PATH, "utf8")) as { terms: GlossaryRow[] }
).terms;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface Protection {
  text: string;
  slots: string[];
}

const protect = (source: string, locale: MachineLocale): Protection => {
  const slots: string[] = [];
  const hold = (value: string): string => {
    slots.push(value);
    return `<ph>${String(slots.length - 1)}</ph>`;
  };
  let text = source.replace(PLACEHOLDER, (match) => hold(match));
  for (const row of glossary) {
    const pattern = new RegExp(`\\b${escapeRegExp(row.en)}\\b`, "g");
    text = text.replace(pattern, () => hold(row[locale]));
  }
  return { text, slots };
};

const restore = (translated: string, slots: string[]): string =>
  translated.replace(/<ph>\s*(\d+)\s*<\/ph>/g, (_, index: string) => {
    const slot = slots[Number(index)];
    return slot ?? "";
  });

const placeholdersOf = (value: string): string[] =>
  (value.match(PLACEHOLDER) ?? []).sort();

const endpoint = (key: string): string =>
  key.endsWith(":fx")
    ? "https://api-free.deepl.com/v2/translate"
    : "https://api.deepl.com/v2/translate";

const translateBatch = async (
  key: string,
  texts: string[],
  locale: MachineLocale,
): Promise<string[]> => {
  const response = await fetch(endpoint(key), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      source_lang: "EN",
      target_lang: locale.toUpperCase(),
      tag_handling: "xml",
      ignore_tags: ["ph"],
      preserve_formatting: true,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `deepl ${String(response.status)}: ${await response.text()}`,
    );
  }
  const body = (await response.json()) as { translations: { text: string }[] };
  return body.translations.map((entry) => entry.text);
};

const cache: Record<string, string> = existsSync(CACHE_PATH)
  ? (JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Record<string, string>)
  : {};

const cacheKey = (locale: string, source: string): string =>
  `${locale} ${source}`;

// Flushed after every batch rather than at the end of the run: the content
// namespace alone is ~1900 strings and several minutes of API calls, and an
// interrupted run must never charge the owner's quota twice for the same string.
const saveCache = (): void => {
  writeFileSync(CACHE_PATH, `${JSON.stringify(cache)}\n`, "utf8");
};

const problems: string[] = [];
const fallbacks: string[] = [];

const verify = (locale: MachineLocale): void => {
  for (const namespace of NAMESPACES) {
    const source = readTree(SOURCE_LOCALE, namespace);
    const target = readTree(locale, namespace);
    if (source === null) continue;
    if (target === null) {
      problems.push(`${locale}/${namespace}: missing`);
      continue;
    }
    const flatSource = flatten(source);
    const flatTarget = flatten(target);
    for (const [key, value] of flatSource) {
      const translated = flatTarget.get(key);
      if (translated === undefined) {
        problems.push(`${locale}/${namespace}: missing key "${key}"`);
        continue;
      }
      const before = placeholdersOf(value).join("|");
      const after = placeholdersOf(translated).join("|");
      if (before !== after) {
        problems.push(
          `${locale}/${namespace}: placeholder drift at "${key}" (${before} -> ${after})`,
        );
      }
    }
  }
};

const generate = async (key: string, locale: MachineLocale): Promise<void> => {
  mkdirSync(join(I18N, locale), { recursive: true });
  let fresh = 0;
  for (const namespace of NAMESPACES) {
    const source = readTree(SOURCE_LOCALE, namespace);
    if (source === null) continue;
    const flat = flatten(source);
    const out = new Map<string, string>();
    const pending: { key: string; protection: Protection }[] = [];

    for (const [path, value] of flat) {
      const hit = cache[cacheKey(locale, value)];
      if (hit !== undefined) {
        out.set(path, hit);
        continue;
      }
      pending.push({ key: path, protection: protect(value, locale) });
    }

    for (let i = 0; i < pending.length; i += BATCH) {
      const slice = pending.slice(i, i + BATCH);
      const translated = await translateBatch(
        key,
        slice.map((entry) => entry.protection.text),
        locale,
      );
      slice.forEach((entry, index) => {
        const original = flat.get(entry.key) ?? "";
        const raw = translated[index] ?? entry.protection.text;
        const candidate = restore(raw, entry.protection.slots);
        // DeepL occasionally answers with an empty string or drops an ignored
        // tag. An empty label in the UI is worse than an untranslated one, so
        // the English source stands in and the key is reported rather than
        // cached — a re-run gets another chance at it.
        const usable =
          candidate.trim() !== "" &&
          placeholdersOf(candidate).join("|") ===
            placeholdersOf(original).join("|");
        const value = usable ? candidate : original;
        out.set(entry.key, value);
        if (usable) cache[cacheKey(locale, original)] = value;
        else fallbacks.push(`${locale}/${namespace}:${entry.key}`);
        fresh += 1;
      });
      saveCache();
      console.log(
        `  ${locale}/${namespace}: ${String(Math.min(i + BATCH, pending.length))}/${String(pending.length)}`,
      );
    }

    const ordered = new Map<string, string>();
    for (const path of flat.keys()) {
      ordered.set(path, out.get(path) ?? "");
    }
    writeFileSync(
      join(I18N, locale, `${namespace}.json`),
      `${JSON.stringify(unflatten(ordered), null, 2)}\n`,
      "utf8",
    );
  }
  saveCache();
  console.log(`translate: ${locale} written (${String(fresh)} new strings)`);
};

const main = async (): Promise<void> => {
  if (checkOnly) {
    for (const locale of targets) verify(locale);
    if (problems.length > 0) {
      for (const problem of problems) console.error(`translate: ${problem}`);
      process.exit(1);
    }
    console.log(`translate: ${targets.join(", ")} check ok`);
    return;
  }
  const key = process.env.DEEPL_API_KEY?.trim();
  if (!key) {
    console.error(
      "translate: DEEPL_API_KEY is not set — this is an owner step, see docs/phase-12-launch-notes.md",
    );
    process.exit(1);
  }
  for (const locale of targets) await generate(key, locale);
  for (const locale of targets) verify(locale);
  if (fallbacks.length > 0) {
    console.warn(
      `translate: ${String(fallbacks.length)} string(s) kept in English — ${fallbacks.slice(0, 20).join(", ")}`,
    );
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error(`translate: ${problem}`);
    process.exit(1);
  }
  console.log("translate: done");
};

void main();
