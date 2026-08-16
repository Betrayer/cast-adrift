import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { loadEnv } from "./loadEnv.mjs";

loadEnv();

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

const PLACEHOLDER = /(\{\{[^}]+\}\}|<\/?\d+>)/g;

const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const unescapeXml = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

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
  let text = source
    .split(PLACEHOLDER)
    .map((part, index) => (index % 2 === 1 ? hold(part) : escapeXml(part)))
    .join("");
  for (const row of glossary) {
    const pattern = new RegExp(`\\b${escapeRegExp(row.en)}\\b`, "g");
    text = text.replace(pattern, () => hold(row[locale]));
  }
  return { text, slots };
};

const restore = (translated: string, slots: string[]): string =>
  unescapeXml(translated).replace(
    /<ph>\s*(\d+)\s*<\/ph>/g,
    (_, index: string) => {
      const slot = slots[Number(index)];
      return slot ?? "";
    },
  );

const placeholdersOf = (value: string): string[] =>
  (value.match(PLACEHOLDER) ?? []).sort();

const host = (key: string): string =>
  key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";

const RETRY_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const FATAL_STATUS = new Set([401, 403, 456]);
const ATTEMPTS = 5;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

type BatchResult =
  | { ok: true; texts: string[] }
  | { ok: false; status: number; body: string };

const postBatch = async (
  key: string,
  texts: string[],
  locale: MachineLocale,
): Promise<BatchResult> => {
  let last: BatchResult = { ok: false, status: 0, body: "no attempt made" };
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${host(key)}/v2/translate`, {
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
      if (response.ok) {
        const body = (await response.json()) as {
          translations: { text: string }[];
        };
        return { ok: true, texts: body.translations.map((entry) => entry.text) };
      }
      last = {
        ok: false,
        status: response.status,
        body: await response.text(),
      };
      if (FATAL_STATUS.has(response.status)) return last;
      if (!RETRY_STATUS.has(response.status)) return last;
    } catch (error) {
      last = {
        ok: false,
        status: 0,
        body: error instanceof Error ? error.message : String(error),
      };
    }
    if (attempt < ATTEMPTS - 1) {
      const wait = 2 ** attempt * 1000;
      console.log(
        `  retry in ${String(wait)}ms (deepl ${String(last.status)})`,
      );
      await sleep(wait);
    }
  }
  return last;
};

const translateBatch = async (
  key: string,
  texts: string[],
  locale: MachineLocale,
): Promise<(string | null)[]> => {
  if (texts.length === 0) return [];
  const result = await postBatch(key, texts, locale);
  if (result.ok) return result.texts;
  if (FATAL_STATUS.has(result.status)) {
    throw new Error(`deepl ${String(result.status)}: ${result.body}`);
  }
  if (texts.length === 1) {
    console.warn(`  deepl ${String(result.status)} on one string: ${result.body}`);
    return [null];
  }
  const mid = Math.ceil(texts.length / 2);
  const head = await translateBatch(key, texts.slice(0, mid), locale);
  const tail = await translateBatch(key, texts.slice(mid), locale);
  return [...head, ...tail];
};

const reportUsage = async (key: string): Promise<void> => {
  const response = await fetch(`${host(key)}/v2/usage`, {
    headers: { Authorization: `DeepL-Auth-Key ${key}` },
  });
  if (!response.ok) {
    console.error(
      `translate: DeepL rejected the key (${String(response.status)}) — ${await response.text()}`,
    );
    process.exit(1);
  }
  const usage = (await response.json()) as {
    character_count: number;
    character_limit: number;
  };
  console.log(
    `translate: quota ${String(usage.character_count)}/${String(usage.character_limit)} characters used`,
  );
};

const cache: Record<string, string> = existsSync(CACHE_PATH)
  ? (JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Record<string, string>)
  : {};

const cacheKey = (locale: string, source: string): string =>
  `${locale} ${source}`;

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
      if (/&(amp|lt|gt|quot|apos|#\d+);/.test(translated)) {
        problems.push(
          `${locale}/${namespace}: xml entity left at "${key}" ("${translated}")`,
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

    if (pending.length > 0) {
      const chars = pending.reduce(
        (sum, entry) => sum + entry.protection.text.length,
        0,
      );
      console.log(
        `  ${locale}/${namespace}: ${String(pending.length)} new strings, ${String(chars)} characters`,
      );
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
        const raw = translated[index];
        const candidate =
          raw == null ? "" : restore(raw, entry.protection.slots);
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
  await reportUsage(key);
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
