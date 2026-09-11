import { beforeEach, describe, expect, it } from "vitest";
import { CARGO_IDS, cargoDef } from "@/data/cargo";
import { ALL_EVENTS } from "@/data/events";
import { optionMet, type OptionContext } from "@/game/events/engine";
import { generateSectorMap } from "@/game/map/generator";
import { isStationNode } from "@/game/map/reach";
import { nodeById, type MapGraph, type MapNode } from "@/game/map/types";
import { cargoOfferable } from "@/game/run/cargo";
import { startRun } from "@/game/run/flow";
import { createStreams } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";
import type { EventDef, EventOption } from "@/types/events";

interface Offer {
  event: EventDef;
  option: EventOption;
  cargoId: string;
}

const offers: readonly Offer[] = ALL_EVENTS.flatMap((event) =>
  event.options.flatMap((option) => {
    const cargoEffect = (option.outcomes ?? []).flatMap((outcome) =>
      outcome.effects.filter((effect) => effect.k === "cargo"),
    );
    const first = cargoEffect[0];
    return first === undefined
      ? []
      : [{ event, option, cargoId: first.id } satisfies Offer];
  }),
);

const ctx = (offerable: readonly string[]): OptionContext => ({
  scrap: 999,
  hull: 20,
  axis: 0,
  deck: [],
  mkLevels: {},
  flags: {},
  offerableCargo: offerable,
});

describe("the cargo offer table", () => {
  it("gives every shipped cargo exactly one offer", () => {
    for (const id of CARGO_IDS) {
      const mine = offers.filter((offer) => offer.cargoId === id);
      expect(mine.map((offer) => offer.event.id), id).toHaveLength(1);
    }
    expect(offers).toHaveLength(CARGO_IDS.length);
  });

  it("spreads the offers across the acts instead of stacking them", () => {
    const hosts = offers.map(
      (offer) => offer.event.requires?.sector?.join("") ?? "any",
    );
    expect(new Set(hosts).size).toBeGreaterThanOrEqual(6);
  });

  it("gates every offer on the cargo its outcome actually grants", () => {
    for (const offer of offers) {
      expect(offer.option.requires, offer.event.id).toEqual({
        req: "cargo",
        id: offer.cargoId,
      });
      expect(cargoDef(offer.cargoId), offer.cargoId).toBeDefined();
    }
  });

  it("is never the only thing an offering event has to say", () => {
    for (const offer of offers) {
      const rest = offer.event.options.filter(
        (option) => option.id !== offer.option.id,
      );
      expect(rest.length, offer.event.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("never asks the player to pay to take the cargo", () => {
    for (const offer of offers) {
      for (const outcome of offer.option.outcomes ?? []) {
        expect(outcome.effects.map((effect) => effect.k), offer.event.id).toEqual(
          ["cargo"],
        );
      }
    }
  });

  it("leaves every declining option paying what it always paid", () => {
    for (const offer of offers) {
      const declines = offer.event.options.filter(
        (option) => option.id !== offer.option.id,
      );
      for (const option of declines) {
        const outcomes = [
          ...(option.outcomes ?? []),
          ...(option.onPass ?? []),
          ...(option.onFail ?? []),
        ];
        expect(outcomes.length, `${offer.event.id}.${option.id}`).toBeGreaterThan(
          0,
        );
        for (const outcome of outcomes) {
          expect(
            outcome.effects.some((effect) => effect.k === "cargo"),
            `${offer.event.id}.${option.id}`,
          ).toBe(false);
        }
      }
    }
  });
});

describe("an offer with nothing ahead to deliver to", () => {
  it("is refused by the option gate", () => {
    for (const offer of offers) {
      expect(optionMet(offer.option.requires, ctx([]))).toBe(false);
      expect(optionMet(offer.option.requires, ctx([offer.cargoId]))).toBe(true);
    }
  });

  it("is refused with no offerable list at all", () => {
    const first = offers[0];
    expect(first).toBeDefined();
    const bare: OptionContext = {
      scrap: 0,
      hull: 1,
      axis: 0,
      deck: [],
      mkLevels: {},
      flags: {},
    };
    expect(optionMet(first?.option.requires, bare)).toBe(false);
  });
});

const lastStationless = (map: MapGraph): MapNode | undefined => {
  const deepest = Math.max(...map.nodes.map((node) => node.row));
  return map.nodes.find(
    (node) => node.row === deepest && node.hole !== true && !isStationNode(node),
  );
};

describe("the live gate on a real map", () => {
  beforeEach(() => {
    startRun(19);
  });

  it("offers when a station still lies ahead", () => {
    expect(CARGO_IDS.filter((id) => cargoOfferable(id)).length).toBeGreaterThan(
      0,
    );
  });

  it("offers nothing from a node with no station left in front of it", () => {
    const map = useRunStore.getState().map;
    expect(map).not.toBeNull();
    if (map === null) return;
    const stranded = lastStationless(map) ?? map.nodes[map.nodes.length - 1];
    expect(stranded).toBeDefined();
    if (stranded === undefined) return;
    useRunStore.setState({
      position: stranded.id,
      depthRow: stranded.row,
      visited: [stranded.id],
    });
    expect(nodeById(map).get(stranded.id)).toBeDefined();
    expect(CARGO_IDS.filter((id) => cargoOfferable(id))).toEqual([]);
  });

  it("offers nothing once the hold is full", () => {
    const map = useRunStore.getState().map;
    if (map === null) return;
    const target = map.nodes.find((node) => isStationNode(node));
    expect(target).toBeDefined();
    if (target === undefined) return;
    useRunStore.setState({
      cargo: [
        {
          defId: "stasisPods",
          nodeId: target.id,
          sectorIndex: 1,
          takenRow: 0,
        },
      ],
    });
    expect(CARGO_IDS.filter((id) => cargoOfferable(id))).toEqual([]);
  });
});

describe("the generator still has stations to deliver to", () => {
  it("finds one on every act's map", () => {
    for (let sector = 1; sector <= 6; sector += 1) {
      const map = generateSectorMap(createStreams(100 + sector).map, sector);
      expect(
        map.nodes.some((node) => isStationNode(node)),
        `sector ${String(sector)}`,
      ).toBe(true);
    }
  });
});
