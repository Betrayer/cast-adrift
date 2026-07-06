import { beforeEach, describe, expect, it } from "vitest";
import { EVENT_BY_ID } from "@/data/events";
import { flagShopDiscount } from "@/game/economy/shop";
import { applyOutcome } from "@/game/events/apply";
import { eventEligible, type EventContext } from "@/game/events/engine";
import { buildEncounterIds, shouldInjectBounty } from "@/game/run/encounter";
import { createStream } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";
import type { EventOption } from "@/types/events";

const must = <T>(value: T | undefined | null, msg: string): T => {
  if (value === undefined || value === null) throw new Error(msg);
  return value;
};

const firstOutcome = (option: EventOption) =>
  must(option.outcomes?.[0], `${option.id}: no outcome`);

const optionById = (eventId: string, optionId: string): EventOption => {
  const event = must(EVENT_BY_ID.get(eventId), `event ${eventId}`);
  return must(
    event.options.find((o) => o.id === optionId),
    `${eventId}.${optionId}`,
  );
};

const runCtx = (): EventContext => {
  const s = useRunStore.getState();
  return {
    sector: s.sector,
    axis: s.axis,
    flags: s.flags,
    seenEvents: s.seenEvents,
  };
};

describe("flag callbacks", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  it("freeing the courier makes courierReturns eligible and fires its discount", () => {
    const returns = must(EVENT_BY_ID.get("courierReturns"), "courierReturns");
    expect(eventEligible(returns, runCtx())).toBe(false);

    applyOutcome(firstOutcome(optionById("freedCourier", "free")), createStream(1));
    expect(useRunStore.getState().flags.courierFreed).toBe(true);
    expect(eventEligible(returns, runCtx())).toBe(true);

    applyOutcome(
      firstOutcome(optionById("courierReturns", "discount")),
      createStream(1),
    );
    expect(useRunStore.getState().flags.courierDiscount).toBe(2);
    expect(flagShopDiscount(useRunStore.getState().flags)).toBe(20);
  });

  it("hunterMark injects the Bounty Huntress into the next elite once", () => {
    useRunStore.getState().setFlag("hunterMark");
    expect(shouldInjectBounty("elite", useRunStore.getState().flags)).toBe(true);
    const ids = buildEncounterIds(
      "elite",
      createStream(2),
      useRunStore.getState().flags,
    );
    expect(ids).toContain("bountyHuntress");

    useRunStore.getState().setFlag("hunterEngaged");
    expect(shouldInjectBounty("elite", useRunStore.getState().flags)).toBe(false);
  });

  it("Mara's goodwill and grudge move shop prices", () => {
    expect(flagShopDiscount({ maraFriend: true })).toBe(15);
    expect(flagShopDiscount({ maraGrudge: true })).toBe(-20);
    expect(flagShopDiscount({})).toBe(0);
  });
});
