import process from "node:process";
import { ENGRAVINGS } from "../src/data/engravings";
import { ALL_MODULES } from "../src/data/modules";
import { ALL_PERKS } from "../src/data/perks";
import { normalizedBody, shapeKey } from "../src/data/contentShape";

interface Row {
  kind: string;
  id: string;
  body: string;
  shape: string;
}

const rows: Row[] = [
  ...ALL_PERKS.map((p) => ({
    kind: "perk",
    id: p.id,
    body: normalizedBody(p),
    shape: shapeKey(p),
  })),
  ...ALL_MODULES.map((m) => ({
    kind: "module",
    id: m.id,
    body: normalizedBody(m),
    shape: shapeKey(m),
  })),
  ...ENGRAVINGS.map((e) => ({
    kind: "engraving",
    id: e.id,
    body: normalizedBody(e),
    shape: shapeKey(e),
  })),
];

const group = (pick: (row: Row) => string): Map<string, Row[]> => {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const key = pick(row);
    const list = map.get(key);
    if (list === undefined) map.set(key, [row]);
    else list.push(row);
  }
  return map;
};

const onlyPerksAndModules = (list: Row[]): Row[] =>
  list.filter((r) => r.kind !== "engraving");

console.log("== exact duplicate bodies (perks + modules) ==");
let exact = 0;
for (const [body, list] of group((r) => r.body)) {
  const members = onlyPerksAndModules(list);
  if (members.length < 2) continue;
  exact += 1;
  console.log(
    `  ${members.map((m) => `${m.kind}:${m.id}`).join("  ==  ")}\n     ${body}`,
  );
}
console.log(`  total groups: ${String(exact)}`);

console.log("\n== shared shapes (same knob, different magnitude/condition) ==");
const shapeGroups = [...group((r) => r.shape)]
  .map(([shape, list]) => [shape, onlyPerksAndModules(list)] as const)
  .filter(([, list]) => list.length >= 3)
  .sort((a, b) => b[1].length - a[1].length);
for (const [shape, list] of shapeGroups) {
  console.log(`  ${String(list.length).padStart(2)} × ${shape}`);
  console.log(`       ${list.map((m) => `${m.kind}:${m.id}`).join(" ")}`);
}

console.log("\n== engraving shapes ==");
for (const [shape, list] of [...group((r) => r.shape)]
  .map(([shape, list]) => [shape, list.filter((r) => r.kind === "engraving")] as const)
  .filter(([, list]) => list.length >= 2)
  .sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${String(list.length).padStart(2)} × ${shape}`);
  console.log(`       ${list.map((m) => m.id).join(" ")}`);
}

process.exit(0);
