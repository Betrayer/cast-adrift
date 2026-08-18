import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { BARKS } from "../src/data/barks";
import { ASCENSIONS } from "../src/data/ascension";
import { CHART_NODES } from "../src/data/chart";
import { CODEX } from "../src/data/codex";
import { CONTRACTS } from "../src/data/contracts";
import { ALL_DICE } from "../src/data/dice";
import { ENGRAVINGS } from "../src/data/engravings";
import { ALL_ENEMIES } from "../src/data/enemies";
import { ALL_EVENTS } from "../src/data/events";
import { FATE_TABLE } from "../src/data/fate";
import { ALL_MODULES } from "../src/data/modules";
import { MUTATORS } from "../src/data/mutators";
import { FRAGMENTS } from "../src/data/narrative/fragments";
import { KEEPER_LINES } from "../src/data/narrative/keeperLines";
import {
  PROLOGUE_BEATS,
  SYSTEMS_CHECK,
} from "../src/data/narrative/prologue";
import { ALL_PERKS } from "../src/data/perks";
import { PUZZLES } from "../src/data/puzzles";
import { RESONANCE_BONUSES } from "../src/data/resonance";
import { SHIPS } from "../src/data/ships";
import enContent from "../src/i18n/en/content.json" with { type: "json" };
import enMeta from "../src/i18n/en/meta.json" with { type: "json" };
import type { EventOption, Outcome } from "../src/types/events";

type Node = string | { [key: string]: Node };

const has = (root: Node, path: string): boolean => {
  let node: Node | undefined = root;
  for (const seg of path.split(".")) {
    if (typeof node !== "object") return false;
    node = node[seg];
    if (node === undefined) return false;
  }
  return typeof node === "string";
};

const required = new Set<string>();
const add = (key: string | undefined): void => {
  if (key !== undefined) required.add(key);
};

for (const d of ALL_DICE) {
  add(d.name);
  add(d.desc);
}
for (const m of ALL_MODULES) {
  add(m.name);
  add(m.desc);
}
for (const e of ENGRAVINGS) {
  add(e.name);
  add(e.desc);
}
for (const p of ALL_PERKS) {
  add(p.name);
  add(p.desc);
}
for (const e of ALL_ENEMIES) {
  add(e.name);
  add(`content:dossier.${e.id}`);
  for (const sub of e.subsystems ?? []) add(sub.name);
}
for (const c of CODEX) {
  add(c.title);
  add(c.body);
}
for (const f of FATE_TABLE) add(f.text);
for (const f of FRAGMENTS) add(f.text);
for (const k of KEEPER_LINES) add(k.text);
for (const step of SYSTEMS_CHECK) {
  add(step.sayKey);
  if (step.failKey !== null) add(step.failKey);
}
for (const beat of PROLOGUE_BEATS) {
  add(beat.cta);
  for (const line of beat.lines) add(line.text);
}
for (const b of BARKS) for (const l of b.lines) add(l);
for (const p of PUZZLES) {
  add(p.title);
  add(p.goalText);
}
for (const c of CONTRACTS) {
  add(c.name);
  add(c.desc);
}
for (const a of ASCENSIONS) {
  add(a.name);
  add(a.desc);
}
for (const m of MUTATORS) {
  add(m.name);
  add(m.desc);
}
for (const r of RESONANCE_BONUSES) add(r.desc);
for (const s of SHIPS) add(s.name);
for (const n of CHART_NODES) {
  add(n.name);
  add(n.desc);
  add(n.fx);
}

const outcomeKeys = (o: Outcome): void => {
  add(o.text);
  add(o.consequence);
};
const optionKeys = (o: EventOption): void => {
  add(o.label);
  for (const out of [
    ...(o.outcomes ?? []),
    ...(o.onPass ?? []),
    ...(o.onFail ?? []),
  ])
    outcomeKeys(out);
};
for (const e of ALL_EVENTS) {
  add(e.text);
  if (e.speaker !== undefined) add(`content:speaker.${e.speaker}`);
  for (const o of e.options) optionKeys(o);
}

const missing: string[] = [];
for (const key of [...required].sort()) {
  const [ns, path] = key.split(":");
  if (path === undefined) continue;
  const root = ns === "content" ? (enContent as unknown as Node) : (enMeta as unknown as Node);
  if (!has(root, path)) missing.push(key);
}

const NAMESPACES = [
  "battle",
  "common",
  "content",
  "menu",
  "meta",
  "run",
  "settings",
] as const;

const flatten = (node: Node, prefix: string, into: Set<string>): void => {
  if (typeof node === "string") {
    into.add(prefix);
    return;
  }
  for (const [seg, child] of Object.entries(node)) {
    flatten(child, prefix === "" ? seg : `${prefix}.${seg}`, into);
  }
};

const authored = new Set<string>();
for (const ns of NAMESPACES) {
  const raw = JSON.parse(
    readFileSync(join("src", "i18n", "en", `${ns}.json`), "utf8"),
  ) as Node;
  const keys = new Set<string>();
  flatten(raw, "", keys);
  for (const k of keys) authored.add(`${ns}:${k}`);
}

const sourceFiles: string[] = [];
const walk = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(p)) sourceFiles.push(p);
  }
};
walk("src");

const referenced = new Set<string>();
const prefixes = new Set<string>();
const nsAlternation = NAMESPACES.join("|");
const literal = new RegExp(`(?:${nsAlternation}):[A-Za-z0-9_.-]+`, "g");
const dynamic = new RegExp(`(?:${nsAlternation}):[A-Za-z0-9_.-]*(?=\\$\\{)`, "g");
for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(literal)) referenced.add(m[0]);
  for (const m of text.matchAll(dynamic)) prefixes.add(m[0]);
}

const covered = (key: string): boolean => {
  if (required.has(key) || referenced.has(key)) return true;
  for (const p of prefixes) if (key.startsWith(p)) return true;
  return false;
};

const orphans = [...authored].filter((k) => !covered(k)).sort();

mkdirSync("sim-out", { recursive: true });
writeFileSync(
  "sim-out/missing-keys.txt",
  `${["# missing (data -> i18n)", ...missing, "", "# orphans (i18n -> data)", ...orphans].join("\n")}\n`,
  "utf8",
);
console.log(
  `lint:keys — required ${String(required.size)} · authored ${String(authored.size)} · missing ${String(missing.length)} · orphans ${String(orphans.length)} → sim-out/missing-keys.txt`,
);
for (const k of missing) console.log(`  missing  ${k}`);
for (const k of orphans) console.log(`  orphan   ${k}`);
if (missing.length > 0 || orphans.length > 0) process.exit(1);
