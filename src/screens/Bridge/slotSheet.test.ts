import { beforeEach, describe, expect, it } from "vitest";
import { MODULE_FIRE_MODE } from "@/data/fireModes";
import { PLAYABLE_SHIPS, SHIP_BY_ID, type ShipId } from "@/data/ships";
import { AFFINITY, type MkLevel } from "@/data/slots";
import {
  evasionFor,
  evasionTuningFor,
  OVERFLOW_HULL_COST,
  REPAIR_DIVISOR,
  VULNERABLE_CAP,
  vulnerableFor,
} from "@/game/battle/resolver";
import { CRIT_MULT } from "@/game/battle/damage";
import { SCHOOL_ORDER } from "@/data/schools";
import { shipHullMax } from "@/game/battle/setup";
import { projectSlot, type SlotProjection } from "@/game/battle/view/project";
import { discountedMkCost } from "@/game/economy/prices";
import { runSlotCap } from "@/game/run/battleInit";
import { abandonRun, startEventBattle, startRun } from "@/game/run/flow";
import { sourceMods } from "@/game/run/runMods";
import { useBattleStore } from "@/stores/battleStore";
import {
  createInitialRunValues,
  useRunStore,
  type DieInstance,
  type RunCargo,
} from "@/stores/runStore";
import type { SlotId } from "@/types/battle";
import type { School } from "@/types/content";
import {
  PLAIN_SCHOOL,
  PROBE_CONDITIONS,
  PROBE_DIE_UID,
  probeBoard,
  slotSheetModel,
  withProbeDie,
  type SlotSheetCell,
  type SlotSheetModel,
  type SlotSheetRow,
  type SlotSheetRun,
} from "./slotSheet";

const must = <T>(value: T | null | undefined, what: string): T => {
  if (value === null || value === undefined) throw new Error(what);
  return value;
};

const deckOf = (ids: readonly string[]): DieInstance[] =>
  ids.map((defId, index) => ({ uid: `d${String(index)}`, defId }));

const cargo = (defId: string): RunCargo => ({
  defId,
  nodeId: "r3l0",
  sectorIndex: 1,
  takenRow: 0,
});

const runFor = (
  shipId: ShipId,
  over: Partial<SlotSheetRun> = {},
): SlotSheetRun => ({
  ...createInitialRunValues(),
  shipId,
  hull: 5,
  hullMax: shipHullMax(shipId),
  deck: [],
  ...over,
});

const EQUIPPED: Partial<SlotSheetRun> = {
  deck: deckOf(["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4", "black-d6", "magma", "lancehead"]),
  perks: ["targeter", "afterburner", "kindling", "hammerhead", "coldFusion"],
  modules: ["targetingMesh", "hardpointClamp", "autoloader", "capacitorBank", "executioner"],
  chartPicks: ["red-s2", "green-s2", "black-s2"],
  officers: ["defector", "welder"],
  mutators: ["glassFleet"],
  echo: "calculus",
};

const slotsOf = (shipId: ShipId): SlotId[] =>
  Object.keys(must(SHIP_BY_ID.get(shipId), shipId).slots) as SlotId[];

const sheet = (run: SlotSheetRun, slotId: SlotId): SlotSheetModel =>
  must(slotSheetModel(run, {}, slotId), `${run.shipId} ${slotId}`);

const plainCell = (row: SlotSheetRow): SlotSheetCell => must(row.cells[0], `plain ${String(row.face)}`);

const shown = (cell: SlotProjection): Partial<SlotProjection> => ({
  kind: cell.kind,
  base: cell.base,
  value: cell.value,
  bonus: cell.bonus,
  amount: cell.amount,
  evasion: cell.evasion,
  sensor: cell.sensor,
  overflowHull: cell.overflowHull,
  jammed: cell.jammed,
  hits: cell.hits,
  fragments: cell.fragments,
});

const columnHolding = (model: SlotSheetModel, school: School): number => {
  const holders = model.columns.flatMap((column, index) =>
    column.schools.includes(school) ? [index] : [],
  );
  expect(holders, `${model.slotId} ${school} sits in exactly one column`).toHaveLength(1);
  return must(holders[0], school);
};

const expectEverySchoolTrue = (run: SlotSheetRun, slotId: SlotId): void => {
  const model = sheet(run, slotId);
  const board = probeBoard(run, {});
  for (const school of SCHOOL_ORDER) {
    const index = columnHolding(model, school);
    for (const row of model.table) {
      const projection = projectSlot(
        withProbeDie(board, model.cap, school, row.face),
        PROBE_DIE_UID,
        slotId,
      );
      const cell = row.cells[index] ?? null;
      const where = `${run.shipId} ${slotId} ${school} ${String(row.face)}`;
      if (projection === null) {
        expect(cell, where).toBeNull();
      } else {
        expect(shown(must(cell, where)), where).toEqual(shown(projection));
      }
    }
  }
};

const kindsOf = (model: SlotSheetModel): string[] =>
  model.columns.map((column) => `${column.kind}:${column.schools.join(",")}`);

const bonusFor = (school: School | null, mk: MkLevel): number => {
  const aff = school === null ? undefined : AFFINITY[school];
  return aff?.kind === "valueBonus" ? (aff.values[mk - 1] ?? 0) : 0;
};

const multFor = (school: School | null): number => {
  const aff = school === null ? undefined : AFFINITY[school];
  return aff?.kind === "chargeMult" ? aff.mult : 1;
};

const expectClosedForm = (
  model: SlotSheetModel,
  cell: SlotSheetCell,
  face: number,
  chargeCap: number,
): void => {
  const where = `${model.shipId} ${model.slotId} ${cell.school} ${String(face)}`;
  const school = cell.school === PLAIN_SCHOOL ? null : cell.school;
  const value = face + bonusFor(school, model.mk);
  const slotId = model.slotId;
  if (slotId === "weaponA" || slotId === "weaponB") {
    expect(cell.kind, where).toBe("damage");
    expect(cell.amount, where).toBe(value);
  } else if (slotId === "spinal") {
    const jamOn = must(SHIP_BY_ID.get(model.shipId)?.slots.spinal?.jamOn, where);
    expect(cell.jammed, where).toBe(value <= jamOn);
    expect(cell.amount, where).toBe(value <= jamOn ? 0 : value);
  } else if (slotId === "shields" || slotId === "shieldsB") {
    expect(cell.kind, where).toBe("shield");
    expect(cell.amount, where).toBe(value);
  } else if (slotId === "engines" || slotId === "enginesB") {
    expect(cell.evasion, where).toEqual(
      evasionFor(value, 0, evasionTuningFor(model.shipId)),
    );
  } else if (slotId === "sensors") {
    expect(cell.sensor, where).toEqual({ vulnerable: vulnerableFor(value), pierce: 0 });
  } else if (slotId === "reactor") {
    const stored = Math.floor(face * multFor(school));
    expect(cell.amount, where).toBe(stored);
    expect(cell.overflowHull, where).toBe(stored > chargeCap ? OVERFLOW_HULL_COST : 0);
  } else {
    expect(cell.kind, where).toBe("repair");
    expect(cell.amount, where).toBe(Math.ceil(face / REPAIR_DIVISOR));
  }
};

describe("the slot sheet's value table", () => {
  it("equals the closed forms for a bare loadout on every ship, slot and Mk", () => {
    for (const ship of PLAYABLE_SHIPS) {
      for (const mk of [1, 3] as const) {
        const mkLevels = Object.fromEntries(slotsOf(ship.id).map((slotId) => [slotId, mk]));
        const run = runFor(ship.id, { mkLevels });
        const chargeCap = probeBoard(run, {}).chargeCap;
        for (const slotId of slotsOf(ship.id)) {
          const model = sheet(run, slotId);
          expect(model.mk).toBe(mk);
          expect(model.table.map((row) => row.face)).toEqual(
            Array.from({ length: model.cap }, (_, index) => index + 1),
          );
          expect(model.columns.map((column) => column.kind)).toEqual(
            slotId === "repairBay" ? ["plain"] : ["plain", "affinity"],
          );
          for (const row of model.table) {
            expect(row.cells).toHaveLength(model.columns.length);
            for (const cell of row.cells) {
              expectClosedForm(model, must(cell, "cell"), row.face, chargeCap);
            }
          }
        }
      }
    }
  });

  it("equals projectSlot on the same probe board for an equipped loadout", () => {
    for (const ship of PLAYABLE_SHIPS) {
      const run = runFor(ship.id, { ...EQUIPPED, mkLevels: { weaponA: 2, sensors: 2 } });
      const board = probeBoard(run, {});
      for (const slotId of slotsOf(ship.id)) {
        const model = sheet(run, slotId);
        for (const row of model.table) {
          for (const cell of row.cells) {
            if (cell === null) continue;
            const projection = projectSlot(
              withProbeDie(board, model.cap, cell.school, row.face),
              PROBE_DIE_UID,
              slotId,
            );
            expect(cell).toEqual({ ...must(projection, slotId), school: cell.school });
          }
        }
      }
    }
  });

  it("carries the equipped numbers into the rows it shows", () => {
    for (const ship of PLAYABLE_SHIPS) {
      const run = runFor(ship.id, EQUIPPED);
      const mods = sourceMods(run);
      for (const slotId of slotsOf(ship.id)) {
        const model = sheet(run, slotId);
        for (const row of model.table) {
          const cell = plainCell(row);
          if (slotId === "sensors") {
            expect(cell.sensor?.vulnerable).toBe(vulnerableFor(cell.value, mods.markBonusDelta));
          }
          if (slotId === "engines" || slotId === "enginesB") {
            expect(cell.evasion).toEqual(
              evasionFor(cell.value, mods.evasionDelta, evasionTuningFor(ship.id)),
            );
          }
        }
      }
    }
    const wanderer = sheet(runFor("wanderer", EQUIPPED), "weaponA");
    expect(wanderer.table.some((row) => plainCell(row).amount > row.face)).toBe(true);
  });

  it("states the conditions it pins", () => {
    const model = sheet(runFor("wanderer"), "weaponA");
    expect(model.conditions).toEqual(PROBE_CONDITIONS);
    expect(model.conditions.turn).toBe(2);
    const board = probeBoard(runFor("wanderer", { ...EQUIPPED, hull: 3 }), {});
    expect(board.turn).toBe(PROBE_CONDITIONS.turn);
    expect(board.hull).toBe(board.hullMax);
    expect(board.charge).toBe(0);
    expect(board.shield).toBe(0);
    expect(board.enemies).toHaveLength(1);
    expect(board.enemies[0]?.hp).toBe(board.enemies[0]?.hpMax);
    expect(board.dice.every((die) => die.state === "bag")).toBe(true);
    expect(board.officers).toEqual(EQUIPPED.officers);
    expect(board.echo).toBe(EQUIPPED.echo);
  });
});

describe("the slot sheet's header cap", () => {
  const SHRUNK: Partial<SlotSheetRun> = {
    chartPicks: ["blue-key1"],
    mutators: ["radioSilence"],
    cargo: [cargo("unstableCore"), cargo("overwoundCoils")],
  };

  it("is the fight's cap under a chart, mutator and cargo shrink", () => {
    for (const ship of PLAYABLE_SHIPS) {
      const run = runFor(ship.id, { ...SHRUNK, mkLevels: { reactor: 2 } });
      for (const slotId of slotsOf(ship.id)) {
        const model = sheet(run, slotId);
        expect(model.cap, `${ship.id} ${slotId}`).toBe(runSlotCap(run, slotId));
        expect(model.table).toHaveLength(model.cap);
        expect(model.shrunk).toBe(model.cap < model.baseCap);
      }
    }
    expect(sheet(runFor("wanderer", SHRUNK), "engines").cap).toBe(4);
    expect(sheet(runFor("wanderer", SHRUNK), "sensors").cap).toBe(4);
    expect(sheet(runFor("wanderer", SHRUNK), "weaponA").cap).toBe(6);
    expect(sheet(runFor("wanderer", SHRUNK), "weaponA").baseCap).toBe(8);
  });

  describe("against a started battle", () => {
    beforeEach(() => {
      abandonRun();
    });

    it("matches every slot cap the battle store opens with", () => {
      startRun(11);
      const { position, map, seed } = useRunStore.getState();
      useRunStore.setState({
        ...SHRUNK,
        shipId: "corsair",
        hullMax: shipHullMax("corsair"),
        hull: shipHullMax("corsair"),
        mkLevels: { engines: 3, reactor: 2 },
        position,
        map,
        seed,
      });
      startEventBattle({ enemyIds: ["raider"] });
      const run = useRunStore.getState();
      const slots = useBattleStore.getState().slots;
      for (const slotId of slotsOf("corsair")) {
        expect(sheet(run, slotId).cap, slotId).toBe(slots[slotId]?.cap);
      }
      abandonRun();
    });
  });

  it("marks a slot the contract switches off and draws no table for it", () => {
    const model = sheet(runFor("wanderer", { contractId: "blindJump" }), "sensors");
    expect(model.disabled).toBe(true);
    expect(model.table).toEqual([]);
    expect(sheet(runFor("wanderer", { contractId: "blindJump" }), "weaponA").disabled).toBe(false);
  });

  it("has no sheet for a slot the hull does not carry", () => {
    expect(slotSheetModel(runFor("wanderer"), {}, "spinal")).toBeNull();
  });
});

describe("the rest of the slot sheet", () => {
  it("prices the next Mk after the shipyard discount and stops at Mk3", () => {
    const run = runFor("wanderer", { shipyardDiscount: 15, modules: ["autoloader"] });
    const weapon = sheet(run, "weaponA");
    expect(weapon.nextMk?.mk).toBe(2);
    expect(weapon.nextMk?.cost).toBe(discountedMkCost(2, 15));
    expect(weapon.nextMk?.cap).toBe(10);
    expect(weapon.nextMk?.affinity?.amount).toBe(bonusFor("red", 2));
    const second = sheet({ ...run, mkLevels: { weaponA: 2 } }, "weaponA");
    expect(second.nextMk?.modes).toContain("scatter");
    expect(sheet({ ...run, mkLevels: { weaponA: 3 } }, "weaponA").nextMk).toBeNull();
  });

  it("stops Sensors at Mk2 from A13 on, as the shipyard does", () => {
    const run = runFor("wanderer", { ascension: 13, mkLevels: { sensors: 2 } });
    expect(sheet(run, "sensors").nextMk).toBeNull();
    expect(sheet({ ...run, ascension: 12 }, "sensors").nextMk?.mk).toBe(3);
  });

  it("names the slotMk-gated content the next Mk switches on", () => {
    const run = runFor("wanderer", { modules: ["executioner", "hardpointClamp"] });
    const unlocks = (mk: MkLevel): string[] =>
      sheet({ ...run, mkLevels: { weaponA: mk } }, "weaponA").nextMk?.unlocks.map(
        (entry) => entry.id,
      ) ?? [];
    expect(unlocks(1)).toEqual(["executioner"]);
    expect(unlocks(2)).toEqual(["executioner"]);
    expect(sheet(run, "weaponB").nextMk?.unlocks).toEqual([]);
  });

  it("shows a slotMk-gated effect in the table once the Mk is there", () => {
    const run = runFor("wanderer", { modules: ["executioner"] });
    const top = (mk: MkLevel): number => {
      const model = sheet({ ...run, mkLevels: { weaponA: mk } }, "weaponA");
      return plainCell(must(model.table.at(-1), "top row")).amount;
    };
    expect(top(1)).toBe(8);
    expect(top(2)).toBe(Math.floor(10 * CRIT_MULT));
  });

  it("lists every fire mode with its source and never arms one", () => {
    const model = sheet(runFor("wanderer", { modules: ["autoloader"] }), "weaponA");
    expect(model.modes.map((mode) => mode.id)).toEqual([
      "direct",
      "scatter",
      "doublet",
      "shaped",
      "incendiary",
      "linked",
      "shunt",
    ]);
    const byId = new Map(model.modes.map((mode) => [mode.id, mode]));
    expect(byId.get("direct")).toMatchObject({ source: "base", available: true });
    expect(byId.get("scatter")).toMatchObject({ source: "mk", mk: 3, available: false });
    expect(byId.get("doublet")).toMatchObject({
      source: "module",
      moduleId: "autoloader",
      available: true,
    });
    for (const mode of model.modes) {
      if (mode.source === "module") {
        expect(MODULE_FIRE_MODE[mode.moduleId ?? ""]).toBe(mode.id);
      }
    }
    expect(sheet(runFor("wanderer"), "shields").modes).toEqual([]);
  });

  it("counts the hand by tier against the cap and the over-cap rules", () => {
    const deck = deckOf(["red-d6", "red-d6", "magma", "lancehead"]);
    const wanderer = sheet(runFor("wanderer", { deck }), "weaponA").fit;
    expect(wanderer.rows).toEqual([
      { tier: 6, route: "cap", count: 2 },
      { tier: 10, route: "none", count: 1 },
      { tier: 20, route: "none", count: 1 },
    ]);
    const ram = sheet(runFor("ram", { deck }), "weaponA").fit;
    expect(ram.overCap).not.toBeNull();
    expect(ram.rows.filter((row) => row.tier > 8).every((row) => row.route === "overCap")).toBe(true);
  });

  it("states the placement rules that can refuse a die here", () => {
    const blocks = (shipId: ShipId, slotId: SlotId): string[] =>
      sheet(runFor(shipId), slotId).placement.map((rule) => rule.block);
    expect(blocks("wanderer", "weaponA")).toContain("tierCap");
    expect(blocks("ram", "weaponA")).not.toContain("tierCap");
    expect(blocks("wanderer", "weaponA")).not.toContain("notAllowed");
    for (const rule of sheet(runFor("wanderer"), "reactor").placement) {
      expect(rule.key).toBe(`battle:block.${rule.block}`);
    }
  });

  it("notes the ship passive only where it touches the slot", () => {
    expect(sheet(runFor("ark"), "shields").passiveNote?.passive).toBe("bulwark");
    expect(sheet(runFor("ark"), "reactor").passiveNote).toBeNull();
    expect(sheet(runFor("corsair"), "enginesB").passiveNote?.passive).toBe("afterburner");
    expect(sheet(runFor("ram"), "spinal").passiveNote?.passive).toBe("overload");
    expect(sheet(runFor("wanderer"), "weaponA").passiveNote).toBeNull();
  });

  it("classifies what touches the slot and what the chart still offers", () => {
    const run = runFor("wanderer", EQUIPPED);
    const sensors = sheet(run, "sensors");
    const ids = sensors.sources.map((entry) => `${entry.kind}:${entry.id}`);
    expect(ids).toEqual(expect.arrayContaining(["perk:targeter", "module:targetingMesh", "officer:defector", "chart:red-s2"]));
    expect(ids).not.toContain("perk:afterburner");
    const weapon = sheet(run, "weaponA");
    expect(weapon.sources.find((entry) => entry.id === "autoloader")?.reasons).toContainEqual({
      kind: "fireMode",
      mode: "doublet",
    });
    expect(weapon.sources.map((entry) => entry.id)).toEqual(expect.arrayContaining(["kindling", "hammerhead"]));
    expect(sheet(run, "weaponB").sources.map((entry) => entry.id)).not.toContain("hammerhead");
    expect(sensors.chartAdvice.map((advice) => advice.id)).not.toContain("red-s2");
    expect(sensors.chartAdvice.length).toBeGreaterThan(0);
    expect(sheet(runFor("wanderer"), "sensors").chartAdvice.map((advice) => advice.id)).toContain("red-s2");
  });

  it("gives the facts their variables", () => {
    const model = sheet(runFor("corsair", EQUIPPED), "reactor");
    const charge = model.facts.find((fact) => fact.id === "charge");
    expect(charge?.vars.n).toBeTypeOf("number");
    const store = model.facts.find((fact) => fact.id === "reactorStore");
    expect(store?.vars.cap).toBe(probeBoard(runFor("corsair", EQUIPPED), {}).chargeCap);
    expect(model.what).toBe("battle:system.reactor.what");
  });
});

describe("the sheet never promises what the fight will not do", () => {
  it("routes an oversize die only through a grant that holds unconditionally", () => {
    const big = deckOf(["bombard", "lancehead"]);
    const conditional = sheet(
      runFor("wanderer", { deck: big, perks: ["overrideKeys"] }),
      "weaponA",
    );
    expect(conditional.fit.grants.find((grant) => grant.sourceId === "overrideKeys")?.conditional).toBe(true);
    for (const row of conditional.fit.rows) {
      if (row.tier > conditional.cap) expect(row.route).not.toBe("grant");
    }
    const plain = sheet(
      runFor("wanderer", { deck: big, modules: ["nonEuclidRack"] }),
      "weaponA",
    );
    expect(plain.fit.grants.find((grant) => grant.sourceId === "nonEuclidRack")?.conditional).toBe(false);
    const over = plain.fit.rows.filter((row) => row.tier > plain.cap);
    expect(over.length).toBeGreaterThan(0);
    for (const row of over) expect(row.route).toBe("grant");
  });

  it("says nothing about fitting, placing or improving a slot the contract switches off", () => {
    const model = sheet(runFor("wanderer", { ...EQUIPPED, contractId: "blindJump" }), "sensors");
    expect(model.disabled).toBe(true);
    expect(model.table).toEqual([]);
    expect(model.columns).toEqual([]);
    expect(model.fit.rows).toEqual([]);
    expect(model.fit.grants).toEqual([]);
    expect(model.placement).toEqual([]);
    expect(model.modes).toEqual([]);
    expect(model.nextMk).toBeNull();
    expect(model.chartAdvice).toEqual([]);
  });

  it("quotes the mark cap the build actually reaches", () => {
    const run = runFor("wanderer", EQUIPPED);
    const bonus = sourceMods(probeBoard(run, {})).markBonusDelta;
    expect(bonus).toBeGreaterThan(0);
    const targeting = sheet(run, "sensors").facts.find((fact) => fact.id === "targeting");
    expect(targeting?.vars.cap).toBe(VULNERABLE_CAP + bonus);
    expect(targeting?.vars.cap).toBe(vulnerableFor(99, bonus));
  });

  it("names the flat evasion shift when the build carries one", () => {
    const bare = runFor("wanderer");
    const bareFlat = sourceMods(probeBoard(bare, {})).evasionDelta + evasionTuningFor("wanderer").delta;
    const bareFacts = sheet(bare, "engines").facts.map((fact) => fact.id);
    expect(bareFacts.includes("manoeuvreFlat")).toBe(bareFlat !== 0);
    const built = runFor("wanderer", { chartPicks: ["green-s2"] });
    const flat = sourceMods(probeBoard(built, {})).evasionDelta + evasionTuningFor("wanderer").delta;
    expect(flat).not.toBe(0);
    const fact = sheet(built, "engines").facts.find((entry) => entry.id === "manoeuvreFlat");
    expect(fact?.vars.n).toBe(flat);
  });
});

describe("the value table's school columns", () => {
  const GREY_S6: Partial<SlotSheetRun> = {
    chartPicks: ["grey-s6"],
    deck: deckOf(["grey-d4", "grey-d4", "grey-d4", "red-d6"]),
  };
  const RIME_GUARD: Partial<SlotSheetRun> = {
    perks: ["rimeGuard"],
    deck: deckOf(["blue-d6", "blue-d6", "red-d6"]),
  };
  const LONG_ODDS: Partial<SlotSheetRun> = {
    perks: ["longOdds"],
    deck: deckOf(["black-d6", "red-d6"]),
  };
  const SCHOOL_BOUND: readonly Partial<SlotSheetRun>[] = [
    {},
    EQUIPPED,
    GREY_S6,
    RIME_GUARD,
    LONG_ODDS,
    { chartPicks: ["prismatic-s1"], deck: deckOf(["red-d6", "glimmer"]) },
    { perks: ["frostBrake"], deck: deckOf(["blue-d6", "green-d4"]) },
  ];

  it("shows every school the number its own die would get", () => {
    for (const ship of PLAYABLE_SHIPS) {
      for (const over of SCHOOL_BOUND) {
        const run = runFor(ship.id, over);
        for (const slotId of slotsOf(ship.id)) expectEverySchoolTrue(run, slotId);
      }
    }
  });

  it("keeps the plain and affinity pair when nothing reads the die's school", () => {
    for (const ship of PLAYABLE_SHIPS) {
      const run = runFor(ship.id, { deck: deckOf(["red-d6", "red-d6", "blue-d6", "grey-d4", "green-d4"]) });
      for (const slotId of slotsOf(ship.id)) {
        const model = sheet(run, slotId);
        const affinity = model.columns.find((column) => column.kind === "affinity");
        expect(model.columns).toHaveLength(affinity === undefined ? 1 : 2);
        expect(model.columns[columnHolding(model, "prismatic")]).toBe(affinity ?? model.columns[0]);
      }
    }
  });

  it("splits a school a build rewards away from the plain column", () => {
    const grey = sheet(runFor("wanderer", GREY_S6), "weaponA");
    const greyAt = columnHolding(grey, "grey");
    expect(greyAt).not.toBe(0);
    for (const row of grey.table) {
      expect(row.cells[greyAt]?.amount).toBe(plainCell(row).amount + 2);
    }
    const mk2 = sheet(runFor("wanderer", { ...GREY_S6, mkLevels: { weaponA: 2 } }), "weaponA");
    expect(kindsOf(mk2)).toContain("school:grey");
    const longOdds = sheet(runFor("wanderer", LONG_ODDS), "weaponA");
    const faceOne = must(longOdds.table[0], "face 1");
    expect(faceOne.cells[columnHolding(longOdds, "black")]?.amount).toBe(plainCell(faceOne).amount + 3);
  });

  it("never lets the plain column claim a school the build treats differently", () => {
    const model = sheet(runFor("wanderer", RIME_GUARD), "weaponA");
    const faceOne = must(model.table[0], "face 1");
    expect(plainCell(faceOne).amount).toBe(2);
    expect(model.columns[0]?.schools).not.toContain("blue");
    expect(faceOne.cells[columnHolding(model, "blue")]?.amount).toBe(1);
  });

  it("puts the columns of schools in the hand first", () => {
    const over: Partial<SlotSheetRun> = {
      chartPicks: ["grey-s6", "prismatic-s1"],
      mkLevels: { weaponA: 2 },
    };
    const prismaticHand = sheet(runFor("wanderer", { ...over, deck: deckOf(["glimmer"]) }), "weaponA");
    expect(kindsOf(prismaticHand).slice(2)).toEqual(["school:prismatic", "school:grey"]);
    const redHand = sheet(runFor("wanderer", { ...over, deck: deckOf(["red-d6"]) }), "weaponA");
    expect(kindsOf(redHand).slice(2)).toEqual(["school:grey", "school:prismatic"]);
  });
});
