import { describe, expect, it } from "vitest";
import { ALL_EVENTS } from "@/data/events";
import { allOutcomes, outcomeShipRank } from "@/game/events/engine";

const HEROIC = [
  "brokenLighthouse.reactorLight",
  "driftSalvageCrew.tow",
  "driftingPod.open",
  "farRimHauler.towHer",
  "heretics.escortThem",
  "inesTow.towHer",
  "numberedSister.pullHerOut",
  "yusufDebt.workItOff",
];

const paying = ALL_EVENTS.flatMap((event) =>
  event.options.flatMap((option) =>
    allOutcomes(option)
      .filter((outcome) => outcome.effects.some((effect) => effect.k === "shipRank"))
      .map((outcome) => ({ event, option, outcome })),
  ),
);

describe("heroic outcomes", () => {
  it("pays ship rank xp on exactly the eight chosen outcomes", () => {
    expect(paying.map(({ event, option }) => `${event.id}.${option.id}`).sort()).toEqual(
      HEROIC,
    );
  });

  it("pays only on a passed check, one xp each", () => {
    for (const { event, option, outcome } of paying) {
      expect(option.check, event.id).toBeDefined();
      expect(option.onPass ?? [], event.id).toContain(outcome);
      expect(outcomeShipRank(event, outcome.text), event.id).toBe(1);
    }
  });

  it("reads nothing from the failed branch of the same option", () => {
    for (const { event, option } of paying) {
      for (const failed of option.onFail ?? []) {
        expect(outcomeShipRank(event, failed.text), event.id).toBe(0);
      }
    }
  });
});
