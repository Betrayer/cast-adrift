import { shapeKey } from "../src/data/contentShape";
import { ALL_MODULES } from "../src/data/modules";
import { ALL_PERKS } from "../src/data/perks";
import { rollPerkChoices, type DraftContext } from "../src/game/run/perkDraft";
import { createStream } from "../src/services/rng";
import { STARTER_DECK } from "../src/data/decks";
import { SHIPS } from "../src/data/ships";

// Baseline capture: every draft this sweep produces, under the CURRENT
// implementation. Written to disk so the post-change run can diff against it.
const DECKS: readonly (readonly string[])[] = [
  STARTER_DECK,
  ["ember", "ember", "red-d6", "red-d6", "red-d6", "ember"],
  ["frostplate", "frostplate", "blue-d6", "blue-d6", "blue-d6", "frostplate"],
  ["black-d6", "black-d6", "ashen", "obsidian", "pitch", "eclipse"],
  ["green-d6", "grey-d8", "yellow-d6", "prism", "red-d12", "blue-d20"],
];
const FLOORS: readonly (DraftContext["floor"] | undefined)[] = [
  undefined,
  "common",
  "uncommon",
  "rare",
];

const rows: string[] = [];
let n = 0;
for (const ship of SHIPS) {
  for (let d = 0; d < DECKS.length; d += 1) {
    for (let sector = 1; sector <= 5; sector += 1) {
      for (const floor of FLOORS) {
        for (let seed = 0; seed < 60; seed += 1) {
          const owned =
            seed % 4 === 0 ? [] : ALL_PERKS.slice(0, seed % 11).map((p) => p.id);
          const banished = seed % 5 === 0 ? [] : [ALL_PERKS[seed % 180]?.id ?? ""];
          const ctx: DraftContext = {
            owned,
            banished: banished.filter((id) => id !== ""),
            sector,
            deckDefIds: DECKS[d] ?? [],
            modules: seed % 3 === 0 ? [] : [ALL_MODULES[seed % 60]?.id ?? ""].filter((id) => id !== ""),
            shipId: ship.id,
            draftsSinceRare: seed % 7,
            ...(floor === undefined ? {} : { floor }),
          };
          rows.push(rollPerkChoices(createStream(seed * 7919 + sector), ctx).join(","));
          n += 1;
        }
      }
    }
  }
}
for (const def of ALL_PERKS) rows.push(`shape:${def.id}=${shapeKey(def)}`);
for (const def of ALL_MODULES) rows.push(`shape:${def.id}=${shapeKey(def)}`);

const out = process.argv[2] ?? "baseline";
const { writeFileSync } = await import("node:fs");
writeFileSync(`sim-out/equiv-${out}.txt`, rows.join("\n"), "utf8");
console.log(`equiv: ${String(n)} drafts + ${String(ALL_PERKS.length + ALL_MODULES.length)} shapes -> sim-out/equiv-${out}.txt`);
