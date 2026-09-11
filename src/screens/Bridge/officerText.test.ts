import { describe, expect, it } from "vitest";
import enRun from "@/i18n/en/run.json";
import { OFFICERS } from "@/data/officers";
import type { PerkMods } from "@/data/perks/types";
import { officerPassiveLines, passiveLabelFor } from "./officerText";

const authored = enRun.bridge.passive as Readonly<Record<string, string>>;

describe("the officer passive line", () => {
  it("labels every field the shipped roster actually uses", () => {
    for (const def of OFFICERS) {
      for (const field of Object.keys(def.passive) as (keyof PerkMods)[]) {
        expect(passiveLabelFor(field), `${def.id} · ${field}`).toBeDefined();
      }
    }
  });

  it("carries the number the passive is worth", () => {
    const lines = officerPassiveLines({ scrapMultPct: 5 });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.n).toBe(5);
    expect(lines[0]?.key).toBe("run:bridge.passive.scrapMultPct");
  });

  it("says nothing for a field with no label rather than printing a key", () => {
    expect(officerPassiveLines({ jamPowerDelta: 2 })).toHaveLength(0);
  });

  it("resolves every label it hands out against the English source", () => {
    for (const def of OFFICERS) {
      for (const line of officerPassiveLines(def.passive)) {
        const leaf = line.key.replace("run:bridge.passive.", "");
        expect(authored[leaf], `${def.id} · ${leaf}`).toBeDefined();
      }
    }
  });
});
