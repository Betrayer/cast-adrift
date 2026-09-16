import { describe, expect, it } from "vitest";
import { ALL_EVENTS } from "@/data/events";
import {
  CABIN_CAP,
  OFFICERS,
  OFFICER_BY_ID,
  officerActions,
  officerChargeCost,
  officerDef,
  officerLabelVars,
  officerToken,
  type OfficerActive,
} from "@/data/officers";
import { ZERO_PERK_MODS } from "@/data/perks/types";
import { VULNERABLE_CAP, vulnerableFor } from "@/game/battle/resolver";
import enContent from "@/i18n/en/content.json";
import type { EventEffect, Outcome } from "@/types/events";

const outcomesOf = (eventId: string, optionId: string): readonly Outcome[] => {
  const event = ALL_EVENTS.find((def) => def.id === eventId);
  const option = event?.options.find((opt) => opt.id === optionId);
  if (option === undefined) return [];
  return [
    ...(option.outcomes ?? []),
    ...(option.onPass ?? []),
    ...(option.onFail ?? []),
  ];
};

const officerGrants = (effects: readonly EventEffect[]): readonly string[] =>
  effects.flatMap((eff) => (eff.k === "officer" ? [eff.id] : []));

describe("the officer roster", () => {
  it("carries six officers with unique ids against two cabins", () => {
    expect(OFFICERS).toHaveLength(6);
    expect(new Set(OFFICERS.map((def) => def.id)).size).toBe(6);
    expect(CABIN_CAP).toBe(2);
    for (const def of OFFICERS) {
      expect(OFFICER_BY_ID.get(def.id)).toBe(def);
      expect(officerDef(def.id)).toBe(def);
    }
    expect(officerDef("nobody")).toBeUndefined();
  });

  it("names every officer, role, origin and console tag in the source locale", () => {
    const copy = enContent.officers as unknown as Record<
      string,
      Record<string, string> | undefined
    >;
    for (const def of OFFICERS) {
      const entry = copy[def.id];
      expect(entry).toBeDefined();
      for (const field of ["name", "role", "desc", "origin", "short"]) {
        expect(entry?.[field]?.length ?? 0).toBeGreaterThan(0);
      }
      expect(def.name).toBe(`content:officers.${def.id}.name`);
      expect(def.short).toBe(`content:officers.${def.id}.short`);
    }
  });

  it("interpolates every {{var}} its console tag asks for", () => {
    const copy = enContent.officers as unknown as Record<
      string,
      { short: string } | undefined
    >;
    for (const def of OFFICERS) {
      const short = copy[def.id]?.short ?? "";
      const vars = officerLabelVars(def.active);
      for (const match of short.matchAll(/\{\{(\w+)\}\}/g)) {
        const name = match[1] ?? "";
        expect(vars[name]).toBeGreaterThan(0);
      }
    }
  });

  it("gives every passive a real PerkMods key with a non-zero value", () => {
    for (const def of OFFICERS) {
      const entries = Object.entries(def.passive);
      expect(entries.length).toBeGreaterThan(0);
      for (const [key, value] of entries) {
        expect(Object.keys(ZERO_PERK_MODS)).toContain(key);
        expect(value).not.toBe(0);
      }
    }
  });

  it("ties every officer to a shipped rescue outcome that grants exactly them", () => {
    for (const def of OFFICERS) {
      const outcomes = outcomesOf(def.event, def.option);
      expect(outcomes.length).toBeGreaterThan(0);
      const granted = outcomes.flatMap((out) => officerGrants(out.effects));
      expect(granted).toContain(def.id);
    }
  });

  it("grants no officer from an outcome the roster does not own", () => {
    const wired: string[] = [];
    for (const event of ALL_EVENTS) {
      for (const option of event.options) {
        for (const outcome of [
          ...(option.outcomes ?? []),
          ...(option.onPass ?? []),
          ...(option.onFail ?? []),
        ]) {
          for (const id of officerGrants(outcome.effects)) {
            expect(OFFICER_BY_ID.get(id)).toBeDefined();
            wired.push(`${event.id}.${option.id}:${id}`);
          }
        }
      }
    }
    expect(new Set(wired).size).toBe(OFFICERS.length);
  });

  it("spells each active's arithmetic exactly once, in the pipeline's own verbs", () => {
    const byActive = new Map<OfficerActive["id"], readonly unknown[]>(
      OFFICERS.map((def) => [def.active.id, officerActions(def.active)]),
    );
    expect(byActive.get("patch")).toEqual([
      { a: "heal", n: 1 },
      { a: "charge", n: -1 },
    ]);
    expect(byActive.get("designate")).toEqual([
      { a: "addStatus", s: "mark", n: 4, target: "target" },
    ]);
    expect(byActive.get("brace")).toEqual([{ a: "shield", n: 1 }]);
    expect(byActive.get("crank")).toEqual([{ a: "charge", n: 4 }]);
    expect(byActive.get("hymn")).toEqual([
      { a: "addStatus", s: "jam", n: 1, target: "target" },
    ]);
    expect(byActive.get("restart")).toEqual([]);
  });

  it("charges only the active that spends reactor, and by its own number", () => {
    for (const def of OFFICERS) {
      const cost = officerChargeCost(def.active);
      expect(cost).toBe(def.active.id === "patch" ? def.active.charge : 0);
      const spend = officerActions(def.active).flatMap((act) =>
        act.a === "charge" && act.n < 0 ? [-act.n] : [],
      );
      expect(spend[0] ?? 0).toBe(cost);
    }
  });

  it("marks harder than a sensors die can, so the button is never dead", () => {
    const designate = OFFICERS.find((def) => def.active.id === "designate");
    const magnitude =
      designate?.active.id === "designate" ? designate.active.mark : 0;
    expect(magnitude).toBe(VULNERABLE_CAP);
    for (let value = 0; value <= 12; value += 1) {
      expect(magnitude).toBeGreaterThanOrEqual(vulnerableFor(value));
    }
    expect(magnitude).toBeGreaterThan(vulnerableFor(6));
  });

  it("namespaces the once-per-battle token", () => {
    expect(officerToken("mechanic")).toBe("officer:mechanic");
  });
});
