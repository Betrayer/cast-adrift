import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KEEPER_LINES, keeperLinesFor } from "@/data/narrative/keeperLines";
import type { FlagValue } from "@/types/events";

const flagsOf = (...keys: string[]): Record<string, FlagValue> =>
  Object.fromEntries(keys.map((k) => [k, true as FlagValue]));

const shopIds = (...keys: string[]): string[] =>
  keeperLinesFor("shop", flagsOf(...keys)).map((line) => line.id);

describe("keeper line continuity", () => {
  it("lets Mara thank the courier's route only when the courier was never netted", () => {
    expect(shopIds("courierFreed")).toContain("mCourier1");
    expect(shopIds("courierFreed", "courierNetted")).not.toContain("mCourier1");
  });
});

describe("the Keeper's beacon lines", () => {
  it("leave his name to the event card's tag instead of opening with it in any locale", () => {
    const names: Readonly<Record<string, string>> = {
      en: "The Keeper", uk: "Хранитель", ru: "Хранитель", de: "Der Wächter", es: "El Guardián", fr: "Le Gardien", pl: "Strażnik",
    };
    const beacon = KEEPER_LINES.filter((line) => line.venue === "beacon").map((line) => line.id);
    expect(beacon).toHaveLength(30);
    for (const [locale, name] of Object.entries(names)) {
      const keeper = (JSON.parse(readFileSync(new URL(`../../i18n/${locale}/content.json`, import.meta.url), "utf8")) as {
        keeper: Record<string, string>;
      }).keeper;
      const named = beacon.filter((id) => (keeper[id] ?? "").toLowerCase().startsWith(name.toLowerCase()));
      expect({ locale, named }).toEqual({ locale, named: [] });
    }
  });
});
