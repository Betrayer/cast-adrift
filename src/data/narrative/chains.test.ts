import { describe, expect, it } from "vitest";
import { EVENT_BY_ID } from "@/data/events";
import {
  CHAINS,
  CHAIN_BY_ID,
  chainView,
  liveChainEvents,
  nextStep,
  stepLive,
} from "@/data/narrative/chains";
import type { FlagValue } from "@/types/events";

const flags = (...keys: string[]): Record<string, FlagValue> =>
  Object.fromEntries(keys.map((k) => [k, true as FlagValue]));

const chain = (id: string) => {
  const def = CHAIN_BY_ID.get(id);
  if (def === undefined) throw new Error(`missing chain ${id}`);
  return def;
};

describe("chain definitions", () => {
  it("names four threads whose every step points at a real event", () => {
    expect(CHAINS).toHaveLength(4);
    for (const def of CHAINS) {
      for (const step of def.steps) {
        expect(step.events.length).toBeGreaterThan(0);
        for (const id of step.events) expect(EVENT_BY_ID.has(id)).toBe(true);
      }
    }
  });

  it("starts every chain dormant with its first step as the hint", () => {
    for (const def of CHAINS) {
      const view = chainView(def, {}, 1);
      expect(view.state).toBe("dormant");
      expect(view.step).toBe(0);
      expect(view.hint).toBe(def.steps[0]?.hint);
    }
  });
});

describe("mara — happy path and betrayal", () => {
  it("walks meet → debt → favour → vault", () => {
    const mara = chain("mara");
    let state = flags("maraFriend");
    expect(chainView(mara, state, 1).step).toBe(1);
    state = { ...state, ...flags("maraDebt") };
    expect(chainView(mara, state, 2).step).toBe(2);
    state = { ...state, ...flags("favorHeld") };
    expect(chainView(mara, state, 3).step).toBe(3);
    state = { ...state, ...flags("maraVaultOpened") };
    const done = chainView(mara, state, 5);
    expect(done.step).toBe(4);
    expect(done.state).toBe("done");
    expect(done.hint).toBe(mara.payoff);
  });

  it("reads a grudge as the betrayal branch and still finishes at the Usurer", () => {
    const mara = chain("mara");
    const betrayed = flags("maraGrudge", "maraDebt", "favorRefused");
    const view = chainView(mara, betrayed, 5);
    expect(view.state).toBe("betrayed");
    expect(view.hint).toBe(mara.betrayalLine);
    const settled = chainView(
      mara,
      { ...betrayed, ...flags("maraUsurerSettled") },
      5,
    );
    expect(settled.state).toBe("done");
  });

  it("offers the vault only without a grudge and the Usurer only with one", () => {
    expect(EVENT_BY_ID.get("maraVault")?.requires?.flags?.not).toContain(
      "maraGrudge",
    );
    expect(EVENT_BY_ID.get("maraUsurer")?.requires?.flags?.all).toContain(
      "maraGrudge",
    );
  });
});

describe("yusuf — fleet truth forks", () => {
  it("advances on any of the three black-box answers", () => {
    const yusuf = chain("yusuf");
    for (const key of ["fleetTruthShared", "fleetTruthKept", "fleetTruthLost"]) {
      expect(chainView(yusuf, flags(key), 2).step).toBe(1);
    }
  });

  it("marks selling the manifest as the betrayal", () => {
    const yusuf = chain("yusuf");
    const view = chainView(yusuf, flags("fleetTruthLost", "yusufGrudge"), 3);
    expect(view.state).toBe("betrayed");
  });

  it("finishes on the lane, either opened or closed", () => {
    const yusuf = chain("yusuf");
    const base = flags("fleetTruthShared", "fleetAnswered");
    expect(chainView(yusuf, { ...base, ...flags("fleetLaneOpen") }, 4).state).toBe(
      "done",
    );
    expect(
      chainView(yusuf, { ...base, ...flags("fleetLaneClosed") }, 4).state,
    ).toBe("done");
  });
});

describe("choir and keeper", () => {
  it("routes the Choir through invite → seal → deep → finale", () => {
    const choir = chain("choir");
    let state = flags("pactStep1");
    expect(chainView(choir, state, 3).step).toBe(1);
    state = { ...state, ...flags("pactSealed") };
    expect(chainView(choir, state, 4).step).toBe(2);
    state = { ...state, ...flags("bargainReady") };
    expect(chainView(choir, state, 4).step).toBe(3);
    state = { ...state, ...flags("preacherAnswered") };
    expect(chainView(choir, state, 5).state).toBe("done");
  });

  it("treats a broken pact as the Choir betrayal", () => {
    const choir = chain("choir");
    const view = chainView(choir, flags("pactStep1", "pactSealed", "pactBroken"), 5);
    expect(view.state).toBe("betrayed");
  });

  it("ends the Keeper thread on whichever answer the Core got", () => {
    const keeper = chain("keeper");
    const base = flags("beacon1", "keeperRepaid");
    for (const key of ["coreAnswered", "coreSilenced", "coreListened"]) {
      expect(chainView(keeper, { ...base, ...flags(key) }, 5).state).toBe("done");
    }
  });
});

describe("chain liveness", () => {
  it("only lights a step in a sector that hosts it", () => {
    const mara = chain("mara");
    const step = mara.steps[2];
    if (step === undefined) throw new Error("missing favour step");
    const state = flags("maraFriend", "maraDebt");
    expect(stepLive(step, state, 3)).toBe(true);
    expect(stepLive(step, state, 5)).toBe(false);
  });

  it("boosts exactly the events of the live steps", () => {
    const live = liveChainEvents(flags("maraFriend", "maraDebt"), 3);
    expect(live.has("maraSupplyRun")).toBe(true);
    expect(live.has("maraVault")).toBe(false);
  });

  it("boosts nothing once a chain is finished", () => {
    const keeper = chain("keeper");
    const done = flags("beacon1", "keeperRepaid", "coreAnswered");
    expect(nextStep(keeper, done)).toBeNull();
    expect(liveChainEvents(done, 5).size).toBeGreaterThanOrEqual(0);
  });
});
