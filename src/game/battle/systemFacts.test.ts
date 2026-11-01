import { describe, expect, it } from "vitest";
import enBattle from "@/i18n/en/battle.json";
import ruBattle from "@/i18n/ru/battle.json";
import ukBattle from "@/i18n/uk/battle.json";
import { PLAYABLE_SHIPS } from "@/data/ships";
import { SLOT_IDS, SLOT_MK } from "@/data/slots";
import { echoRevealRows } from "@/data/echo";
import { computeMutatorMods } from "@/data/mutators";
import {
  BONUS_REROLL_COST,
  evasionTuningFor,
  INTERCEPT_WEAPONS_BONUS,
  NUDGE_COST,
  SURGE_COST,
  VULNERABLE_CAP,
} from "@/game/battle/resolver";
import {
  factsForSlot,
  factVars,
  mkFactFor,
  SYSTEM_FACTS,
  systemWhatKey,
  type FactInput,
} from "@/game/battle/systemFacts";
import { slotAffinity } from "@/game/battle/view/affinity";
import { fogRowsFor } from "@/game/map/fog";

type CopyTree = { readonly [key: string]: string | CopyTree };

const LOCALES: Readonly<Record<"en" | "ru" | "uk", CopyTree>> = {
  en: enBattle as unknown as CopyTree,
  ru: ruBattle as unknown as CopyTree,
  uk: ukBattle as unknown as CopyTree,
};

const copyAt = (tree: CopyTree, key: string): string | undefined => {
  const path = key.replace(/^battle:/u, "").split(".");
  let node: string | CopyTree | undefined = tree;
  for (const step of path) {
    node = node === undefined || typeof node === "string" ? undefined : node[step];
  }
  return typeof node === "string" ? node : undefined;
};

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{\{(\w+)\}\}/gu)].map((match) => match[1] ?? "");

const numbersIn = (text: string): string[] =>
  text
    .replace(/\{\{\w+\}\}/gu, "")
    .replace(/Mk\d/gu, "")
    .match(/\d+/gu) ?? [];

const INPUTS: readonly FactInput[] = [
  {},
  ...PLAYABLE_SHIPS.map((ship) => ({ shipId: ship.id })),
  { shipId: "ram", nudgeCost: 1, chargeCap: 13 },
];

const factKeys = SYSTEM_FACTS.flatMap((fact) =>
  fact.brief === undefined ? [fact.text] : [fact.text, fact.brief],
);

describe("the system facts table", () => {
  it("resolves every placeholder of every fact's text and brief in every locale", () => {
    for (const fact of SYSTEM_FACTS) {
      for (const input of INPUTS) {
        const vars = fact.vars(input);
        for (const key of [fact.text, ...(fact.brief === undefined ? [] : [fact.brief])]) {
          for (const [locale, tree] of Object.entries(LOCALES)) {
            const text = copyAt(tree, key);
            expect(text, `${locale} ${key}`).toBeDefined();
            for (const name of placeholders(text ?? "")) {
              expect(vars[name], `${locale} ${key} {{${name}}}`).toBeTypeOf("number");
            }
          }
        }
      }
    }
  });

  it("uses every variable it computes somewhere in the en copy", () => {
    for (const fact of SYSTEM_FACTS) {
      const used = new Set([
        ...placeholders(copyAt(LOCALES.en, fact.text) ?? ""),
        ...placeholders(copyAt(LOCALES.en, fact.brief ?? "") ?? ""),
      ]);
      for (const name of Object.keys(fact.vars({ shipId: "wanderer" }))) {
        expect(used.has(name), `${fact.id} {{${name}}}`).toBe(true);
      }
    }
  });

  it("carries no bare number that should come from a constant", () => {
    const keys = [...factKeys, ...SLOT_IDS.map(systemWhatKey)];
    for (const key of keys) {
      for (const [locale, tree] of Object.entries(LOCALES)) {
        const text = copyAt(tree, key);
        expect(text, `${locale} ${key}`).toBeDefined();
        expect(numbersIn(text ?? ""), `${locale} ${key}`).toEqual([]);
      }
    }
  });

  it("quotes the constants the resolver runs on", () => {
    expect(factVars("charge")).toEqual({
      n: NUDGE_COST,
      reroll: BONUS_REROLL_COST,
      surge: SURGE_COST,
    });
    expect(factVars("charge", { nudgeCost: 1 }).n).toBe(1);
    expect(factVars("targeting")).toEqual({ cap: VULNERABLE_CAP });
    for (const ship of PLAYABLE_SHIPS) {
      const tuning = evasionTuningFor(ship.id);
      expect(factVars("manoeuvre", { shipId: ship.id })).toMatchObject({
        dodge: tuning.dodgePerValue,
        glancing: tuning.glancingPerValue,
        dodgeCap: tuning.dodgeCap,
        glancingCap: tuning.glancingCap,
        interceptBonus: INTERCEPT_WEAPONS_BONUS,
      });
    }
    expect(factVars("spinalJam", { shipId: "ram" }).jamOn).toBe(
      PLAYABLE_SHIPS.find((ship) => ship.id === "ram")?.slots.spinal?.jamOn,
    );
  });

  it("gives every slot a working fact, the fit rule and exactly one Mk fact", () => {
    for (const slotId of SLOT_IDS) {
      const facts = factsForSlot(slotId);
      expect(facts.some((fact) => fact.section === "how"), slotId).toBe(true);
      expect(facts.some((fact) => fact.id === "fit"), slotId).toBe(true);
      const mkFacts = facts.filter(
        (fact) => fact.section === "improve" && fact.id !== "fog",
      );
      expect(mkFacts, slotId).toHaveLength(1);
      expect(mkFactFor(slotId)?.id).toBe(mkFacts[0]?.id);
    }
  });

  it("keeps the generic Mk line for slots where Mk raises both the cap and the affinity", () => {
    for (const slotId of SLOT_IDS) {
      const caps = SLOT_MK[slotId];
      const low = slotAffinity(slotId, { mk: 1 });
      const high = slotAffinity(slotId, { mk: 3 });
      const capRises = caps[0] < caps[2];
      const bonusRises =
        low !== null && high !== null && low.amount < high.amount;
      const id = mkFactFor(slotId)?.id;
      if (capRises && bonusRises) expect(id, slotId).toBe("mk");
      else expect(id, slotId).not.toBe("mk");
    }
    expect(mkFactFor("spinal")?.id).toBe("spinalMk");
    expect(mkFactFor("reactor")?.id).toBe("reactorMk");
    expect(mkFactFor("repairBay")?.id).toBe("repairMk");
  });
});

describe("the fog rows", () => {
  const legacyRows = (
    sensorsMk: number,
    deepScan: boolean,
    bonusReveal: number,
    sectorReveal: number,
    echo: string | null,
    mutators: readonly string[],
  ): number =>
    Math.max(
      1,
      2 +
        (sensorsMk - 1) +
        (deepScan ? 1 : 0) +
        bonusReveal +
        sectorReveal +
        echoRevealRows(echo) +
        computeMutatorMods(mutators).fogRowDelta,
    );

  it("match the map's old inline rule", () => {
    for (const sensorsMk of [1, 2, 3]) {
      for (const deepScan of [false, true]) {
        for (const echo of [null, "echolocation", "reserve"]) {
          for (const mutators of [[], ["fog"], ["fog", "radioSilence"]]) {
            for (const reveal of [0, 1, 2]) {
              expect(
                fogRowsFor({
                  sensorsMk,
                  deepScan,
                  bonusReveal: reveal,
                  sectorReveal: reveal === 2 ? 1 : 0,
                  echo,
                  mutators,
                }),
              ).toBe(
                legacyRows(
                  sensorsMk,
                  deepScan,
                  reveal,
                  reveal === 2 ? 1 : 0,
                  echo,
                  mutators,
                ),
              );
            }
          }
        }
      }
    }
    expect(
      fogRowsFor({
        sensorsMk: 1,
        deepScan: false,
        bonusReveal: 0,
        sectorReveal: 0,
        echo: null,
        mutators: ["fog", "fog", "fog"],
      }),
    ).toBe(1);
  });
});
