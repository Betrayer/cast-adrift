import { describe, expect, it } from "vitest";
import { ALL_EVENTS } from "../src/data/events";
import { optionRequirements } from "../src/game/events/engine";
import type { EventOption, OptionRequires } from "../src/types/events";
import { purchasePrice } from "./eventCorpus";

const purchase = (requires: OptionRequires | undefined, ...debits: number[]): EventOption => ({
  id: "buy",
  label: "content:events.test.opt.buy",
  ...(requires === undefined ? {} : { requires }),
  outcomes: debits.map((debit) => ({
    text: "content:events.test.out.buy",
    effects: debit === 0 ? [] : [{ k: "scrap", n: -debit }],
  })),
});

const requiredScrap = (option: EventOption): number =>
  Math.max(
    0,
    ...optionRequirements(option.requires).map((req) =>
      req.req === "scrap" ? req.n : 0,
    ),
  );

describe("purchasePrice", () => {
  it("reads the dearest debit of an option every outcome of which pays", () => {
    expect(purchasePrice(purchase(undefined, 60, 60))).toBe(60);
    expect(purchasePrice(purchase(undefined, 40, 55))).toBe(55);
  });

  it("is no price when one branch costs nothing", () => {
    expect(purchasePrice(purchase(undefined, 0, 20))).toBe(0);
  });
});

describe("event purchases are gated at their price", () => {
  it("requires the price of every option that always charges scrap", () => {
    const short = ALL_EVENTS.flatMap((event) =>
      event.options
        .filter((option) => requiredScrap(option) < purchasePrice(option))
        .map((option) => `${event.id}.${option.id}`),
    );
    expect(short).toEqual([]);
  });

  it("leaves every event an option that asks for nothing", () => {
    const locked = ALL_EVENTS.filter((event) =>
      event.options.every(
        (option) => optionRequirements(option.requires).length > 0,
      ),
    ).map((event) => event.id);
    expect(locked).toEqual([]);
  });

  it("gates the nine purchases the audit found charged short", () => {
    const expected: Readonly<Record<string, number>> = {
      "huntressAtTheCore.payIt": 60,
      "rimSurveyor.buyLog": 40,
      "lastYard.refitHere": 50,
      "thresholdMarket.buyEverything": 85,
      "riftPilotage.hirePilot": 35,
      "velaCommission.callTheTow": 20,
      "maraIndulgences.settleOld": 30,
      "yusufAtTheCore.squarePinch": 50,
      "huntressAtTheCore.hireHer": 30,
    };
    const found = Object.fromEntries(
      ALL_EVENTS.flatMap((event) =>
        event.options
          .filter((option) => `${event.id}.${option.id}` in expected)
          .map((option) => [`${event.id}.${option.id}`, requiredScrap(option)]),
      ),
    );
    expect(found).toEqual(expected);
  });
});
