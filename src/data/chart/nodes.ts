import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { ContentTag } from "@/data/tags";
import type { EffectDef } from "@/game/effects/types";
import type { SlotId } from "@/types/battle";
import type { LocKey, School } from "@/types/content";
import type { ChartNodeDef, ChartNodeKind } from "@/data/chart/types";

const CENTER = 500;
const DEG = Math.PI / 180;

const place = (
  angle: number,
  radius: number,
  lateral: number,
): { x: number; y: number } => ({
  x: Math.round(CENTER + radius * Math.cos(angle) + lateral * -Math.sin(angle)),
  y: Math.round(CENTER + radius * Math.sin(angle) + lateral * Math.cos(angle)),
});

interface Content {
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
  tags?: readonly ContentTag[];
  fx?: LocKey;
  hubBudget?: boolean;
  budgetDelta?: number;
  slotTierDelta?: Partial<Record<SlotId, number>>;
}

interface NodeSpec extends Content {
  role: ChartNodeKind;
  key?: string;
}

const mod = (m: Partial<PerkMods>, tags?: readonly ContentTag[]): Content => ({
  mods: m,
  ...(tags === undefined ? {} : { tags }),
});
const eff = (
  effects: readonly EffectDef[],
  fx: LocKey,
  tags?: readonly ContentTag[],
): Content => ({
  effects,
  fx,
  ...(tags === undefined ? {} : { tags }),
});

const weaponsMaxFace: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const redFirstTurn: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "school", is: "red" }, { c: "turnLte", n: 1 }],
  do: [{ a: "modDieValue", n: 1 }],
};
const weaponsBurn: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
  do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
};
const weaponsLowHull: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 50 }],
  do: [{ a: "modDieValue", n: 1 }],
};
const redFinisher: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "enemyHpPctLt", n: 30 }],
  do: [{ a: "modDieValue", n: 2 }],
};
const redSwarmFire: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "enemyCountAtLeast", n: 2 }],
  do: [{ a: "modDieValue", n: 1 }],
};
const redBurnBite: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "enemyHasStatus", s: "burn" }],
  do: [{ a: "dmg", n: 2, target: "target" }],
};
const redRepeatCrit: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "equalsLast" }],
  do: [{ a: "crit" }],
};
const redSalvoCount: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "weapons" }],
  do: [{ a: "counter", scope: "battle", key: "salvo", delta: 1 }],
};
const redSalvoPayoff: EffectDef = {
  on: "beforeResolveSlot",
  if: [
    { c: "slot", is: "weapons" },
    { c: "counterAtLeast", scope: "battle", key: "salvo", n: 3 },
  ],
  do: [{ a: "modDieValue", n: 1 }],
};
const redOpener: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "firstOfTurn" }],
  do: [{ a: "modDieValue", n: 2 }],
};
const redRiskCharge: EffectDef = {
  on: "turnEnd",
  if: [{ c: "hullPctLt", n: 40 }],
  do: [{ a: "charge", n: 1 }],
};
const redPowderRoom: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "enemyHasStatus", s: "burn" }],
  do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
};
const redHairTrigger: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "firstOfTurn" }],
  do: [{ a: "crit" }],
};
const redCoreBreach: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "enemyHpPctLt", n: 25 }],
  do: [{ a: "modDieValue", n: 3 }],
};

const shieldsHigh: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "shields" }, { c: "valueGte", n: 6 }],
  do: [{ a: "shield", n: 1 }],
};
const shieldsFlat: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "shields" }],
  do: [{ a: "shield", n: 1 }],
};
const tideWard: EffectDef = {
  on: "nodeEnter",
  if: [{ c: "tideAtLeast", n: 2 }],
  do: [{ a: "heal", n: 1 }],
};
const sensorsBonus: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "sensors" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const blueOvershield: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "shields" }, { c: "shieldAtLeast", n: 6 }],
  do: [{ a: "shield", n: 2 }],
};
const blueStillness: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "shields" }, { c: "school", is: "blue" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const blueDeepGuard: EffectDef = {
  on: "enemyTurnEnd",
  if: [{ c: "shieldAtLeast", n: 4 }],
  do: [{ a: "heal", n: 1 }],
};
const blueJamOnLow: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "sensors" }, { c: "valueLt", n: 4 }],
  do: [{ a: "setDieValue", n: 5 }],
};
const blueWatch: EffectDef = {
  on: "rolled",
  if: [{ c: "school", is: "blue" }, { c: "isMinFace" }],
  do: [{ a: "rerollDie" }],
};
const blueBreakwater: EffectDef = {
  on: "battleStart",
  do: [{ a: "shield", n: 3 }],
};
const blueSpillway: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "shields" }, { c: "valueGte", n: 8 }],
  do: [{ a: "shield", n: 3 }],
};
const blueLongLens: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "sensors" }],
  do: [{ a: "modDieValue", n: 2 }],
};

const enginesBonus: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "engines" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const maxFaceHeal: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "school", is: "green" }, { c: "isMaxFace" }],
  do: [{ a: "heal", n: 1 }],
};
const repeatValueCharge: EffectDef = {
  on: "rolled",
  if: [{ c: "equalsLast" }],
  do: [{ a: "charge", n: 1 }],
};
const greenGrowOnEngines: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "engines" }, { c: "isMaxFace" }],
  do: [{ a: "grow", n: 1, cap: 2 }],
};
const greenTendril: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "school", is: "green" }, { c: "valueGte", n: 6 }],
  do: [{ a: "grow", n: 1, cap: 3 }],
};
const greenMend: EffectDef = {
  on: "turnEnd",
  if: [{ c: "not", of: { c: "hullPctLt", n: 30 } }],
  do: [{ a: "heal", n: 1 }],
};
const greenRootHold: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "engines" }, { c: "hullPctLt", n: 50 }],
  do: [{ a: "modDieValue", n: 2 }],
};
const greenSpore: EffectDef = {
  on: "battleEnd",
  if: [{ c: "battleOutcome", is: "victory" }],
  do: [{ a: "heal", n: 2 }],
};
const greenQuietBerth: EffectDef = {
  on: "nodeEnter",
  if: [{ c: "nodeIs", is: "shipyard" }],
  do: [{ a: "heal", n: 2 }],
};
const greenSapline: EffectDef = {
  on: "turnEnd",
  if: [{ c: "shieldAtLeast", n: 4 }],
  do: [{ a: "heal", n: 2 }],
};
const greenLoam: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "engines" }, { c: "isMaxFace" }],
  do: [{ a: "grow", n: 1, cap: 3 }],
};

const shopArrival: EffectDef = {
  on: "nodeEnter",
  if: [{ c: "nodeIs", is: "shop" }],
  do: [{ a: "scrap", n: 6 }],
};
const maxFaceScrap: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "isMaxFace" }],
  do: [{ a: "scrap", n: 2 }],
};
const yellowTollBooth: EffectDef = {
  on: "nodeEnter",
  if: [{ c: "nodeIs", is: "event" }],
  do: [{ a: "scrap", n: 8 }],
};
const yellowKickback: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "school", is: "yellow" }],
  do: [{ a: "scrap", n: 2 }],
};
const yellowLuckyOpen: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "firstOfTurn" }, { c: "isMaxFace" }],
  do: [{ a: "scrap", n: 6 }],
};
const yellowGleaner: EffectDef = {
  on: "rolled",
  if: [{ c: "school", is: "yellow" }, { c: "isMinFace" }],
  do: [{ a: "scrap", n: 4 }],
};
const yellowWager: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "any", of: [{ c: "isMaxFace" }, { c: "isMinFace" }] }],
  do: [{ a: "scrap", n: 3 }],
};
const yellowTollhouse: EffectDef = {
  on: "nodeEnter",
  if: [{ c: "nodeIs", is: "shop" }],
  do: [{ a: "scrap", n: 14 }],
};
const yellowMintMark: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "reactor" }],
  do: [{ a: "scrap", n: 4 }],
};

const minFaceScrap: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "isMinFace" }],
  do: [{ a: "scrap", n: 2 }],
};
const reactorBonus: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "reactor" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const minFaceCharge: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "isMinFace" }],
  do: [{ a: "charge", n: 1 }],
};
const detourScout: EffectDef = {
  on: "nodeEnter",
  if: [{ c: "nodeIs", is: "pocket" }],
  do: [{ a: "scrap", n: 12 }],
};
const blackBleedCharge: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "school", is: "black" }, { c: "hullPctLt", n: 60 }],
  do: [{ a: "modDieValue", n: 1 }],
};
const blackOvercap: EffectDef = {
  on: "battleStart",
  do: [{ a: "allowExceedCap", school: "black", hullCost: 2 }],
};
const blackPactTithe: EffectDef = {
  on: "battleStart",
  do: [{ a: "charge", n: 2 }, { a: "hull", n: -2 }],
};
const blackLastLight: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "hullPctLt", n: 25 }],
  do: [{ a: "modDieValue", n: 2 }],
};
const blackReactorCount: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "reactor" }],
  do: [{ a: "counter", scope: "battle", key: "vent", delta: 1 }],
};
const blackReactorPayoff: EffectDef = {
  on: "turnEnd",
  if: [{ c: "counterAtLeast", scope: "battle", key: "vent", n: 2 }],
  do: [{ a: "charge", n: 1 }],
};
const blackSpite: EffectDef = {
  on: "enemyTurnEnd",
  if: [{ c: "hullPctLt", n: 50 }],
  do: [{ a: "charge", n: 1 }],
};
const blackNightWatch: EffectDef = {
  on: "rolled",
  if: [{ c: "school", is: "black" }, { c: "isMaxFace" }],
  do: [{ a: "charge", n: 1 }],
};
const blackAshBed: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "isMinFace" }],
  do: [{ a: "charge", n: 2 }],
};
const blackDeadMansSwitch: EffectDef = {
  on: "turnEnd",
  if: [{ c: "hullPctLt", n: 25 }],
  do: [{ a: "charge", n: 3 }],
};
const blackSlagHeap: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "reactor" }, { c: "chargeAtLeast", n: 4 }],
  do: [{ a: "modDieValue", n: 3 }],
};

const greyScan: EffectDef = {
  on: "rollStart",
  do: [{ a: "grant", what: "nudge", n: 1 }],
};
const greyEvenKeel: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "school", is: "grey" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const greyCounterweight: EffectDef = {
  on: "rolled",
  if: [{ c: "isMinFace" }, { c: "not", of: { c: "school", is: "grey" } }],
  do: [{ a: "modDieValue", n: 1 }],
};
const greyToolbelt: EffectDef = {
  on: "battleStart",
  do: [{ a: "grant", what: "rerollUses", n: 1 }],
};
const greySpare: EffectDef = {
  on: "battleStart",
  do: [{ a: "grant", what: "reserve", n: 1 }],
};
const greyMirror: EffectDef = {
  on: "rolled",
  if: [{ c: "school", is: "grey" }, { c: "equalsLast" }],
  do: [{ a: "grant", what: "rerollSize", n: 1 }],
};
const greyLedgerKeep: EffectDef = {
  on: "shopEnter",
  do: [{ a: "scrap", n: 10 }],
};
const greyPatternBook: EffectDef = {
  on: "rolled",
  if: [{ c: "equalsLast" }],
  do: [{ a: "grant", what: "rerollUses", n: 1 }],
};
const greyTallyCount: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "sensors" }],
  do: [{ a: "counter", scope: "battle", key: "read", delta: 1 }],
};
const greyTallyPayoff: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "counterAtLeast", scope: "battle", key: "read", n: 2 }],
  do: [{ a: "modDieValue", n: 2 }],
};

const firstTurnAll: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "turnLte", n: 1 }],
  do: [{ a: "modDieValue", n: 1 }],
};

const HUB_SMALLS: readonly Content[] = [
  mod({ scrapMultPct: 3 }, ["scrap"]),
  mod({ shopDiscountPct: 3 }, ["scrap"]),
  mod({ hullMaxDelta: 1 }, ["survival"]),
  mod({ battleStartScrap: 1 }, ["scrap"]),
  mod({ chargeCapDelta: 1, reserveDelta: 1 }, ["charge", "dice"]),
  mod({ xpMultPct: 3 }, ["precision"]),
  mod({ scrapPerKill: 1, xpMultPct: 2 }, ["scrap"]),
  mod({ battleEndHeal: 1, hullMaxPct: 2 }, ["repairBay", "survival"]),
  mod({ rerollSizeDelta: 1, reserveDelta: 1 }, ["reroll", "dice"]),
  mod({ markBonusDelta: 1, jamPowerDelta: 1 }, ["precision", "control"]),
  mod({ growthCapDelta: 1, chargeCapDelta: 1 }, ["growth", "charge"]),
  mod({ freeShopRerolls: 1, battleStartScrap: 1 }, ["scrap", "reroll"]),
];

const SMALL_POOLS: Record<School, readonly Content[]> = {
  red: [
    eff([weaponsMaxFace], "meta:chartFx.fx.weaponsMaxFace", ["weapons", "spike"]),
    eff([redFirstTurn], "meta:chartFx.fx.redFirstTurn", ["red"]),
    mod({ markBonusDelta: 1 }, ["precision"]),
    eff([weaponsBurn], "meta:chartFx.fx.weaponsBurn", ["burn"]),
    eff([weaponsLowHull], "meta:chartFx.fx.weaponsLowHull", ["risk"]),
    mod({ scrapPerKill: 1 }, ["scrap"]),
    eff([redFinisher], "meta:chartFx.fx.redFinisher", ["weapons", "spike"]),
    eff([redSwarmFire], "meta:chartFx.fx.redSwarmFire", ["swarm"]),
    eff([redBurnBite], "meta:chartFx.fx.redBurnBite", ["burn"]),
    eff([redRepeatCrit], "meta:chartFx.fx.redRepeatCrit", ["crit"]),
    eff(
      [redSalvoCount, redSalvoPayoff],
      "meta:chartFx.fx.redSalvoTally",
      ["weapons", "precision"],
    ),
    mod({ hullMaxDelta: 1, markBonusDelta: 1 }, ["survival", "precision"]),
    eff([redOpener], "meta:chartFx.fx.redOpener", ["weapons", "precision"]),
    eff([redRiskCharge], "meta:chartFx.fx.redRiskCharge", ["risk", "charge"]),
    mod({ scrapPerKill: 2, xpMultPct: 3 }, ["scrap"]),
  ],
  blue: [
    eff([shieldsHigh], "meta:chartFx.fx.shieldsHigh", ["shields", "shieldwall"]),
    mod({ jamPowerDelta: 1 }, ["control"]),
    eff([shieldsFlat], "meta:chartFx.fx.shieldsFlat", ["shields"]),
    eff([tideWard], "meta:chartFx.fx.tideWard", ["survival"]),
    mod({ blueReserveDelta: 1 }, ["blue"]),
    eff([sensorsBonus], "meta:chartFx.fx.sensorsBonus", ["sensors"]),
    eff([blueOvershield], "meta:chartFx.fx.blueOvershield", [
      "shieldwall",
      "overcap",
    ]),
    eff([blueStillness], "meta:chartFx.fx.blueStillness", ["shields", "control"]),
    eff([blueDeepGuard], "meta:chartFx.fx.blueDeepGuard", ["survival"]),
    eff([blueJamOnLow], "meta:chartFx.fx.blueJamOnLow", ["control", "dice"]),
    mod({ hullMaxDelta: 2 }, ["survival"]),
    mod({ jamPowerDelta: 1, blueReserveDelta: 1 }, ["control", "blue"]),
    eff([blueWatch], "meta:chartFx.fx.blueWatch", ["sensors", "precision"]),
    eff([blueBreakwater], "meta:chartFx.fx.blueBreakwater", ["shieldwall"]),
    mod({ hullMaxDelta: 1, battleEndHeal: 1 }, ["survival"]),
  ],
  green: [
    mod({ battleEndHeal: 1 }, ["repairBay"]),
    mod({ growthCapDelta: 1 }, ["growth"]),
    mod({ evasionDelta: 2 }, ["engines"]),
    eff([enginesBonus], "meta:chartFx.fx.enginesBonus", ["engines"]),
    eff([maxFaceHeal], "meta:chartFx.fx.greenHeal", ["green", "repairBay"]),
    eff([repeatValueCharge], "meta:chartFx.fx.repeatCharge", ["charge", "dice"]),
    eff([greenGrowOnEngines], "meta:chartFx.fx.greenGrowOnEngines", [
      "growth",
      "engines",
    ]),
    eff([greenTendril], "meta:chartFx.fx.greenTendril", ["growth"]),
    eff([greenMend], "meta:chartFx.fx.greenMend", ["repairBay", "survival"]),
    eff([greenRootHold], "meta:chartFx.fx.greenRootHold", [
      "survival",
      "engines",
    ]),
    mod({ growthCapDelta: 1, battleEndHeal: 1 }, ["growth", "repairBay"]),
    eff([greenSpore], "meta:chartFx.fx.greenSpore", ["green", "growth"]),
    mod({ evasionDelta: 2, hullMaxDelta: 1 }, ["engines", "survival"]),
    eff([greenQuietBerth], "meta:chartFx.fx.greenQuietBerth", ["repairBay"]),
    mod({ battleEndHeal: 1, scrapPerKill: 1 }, ["repairBay", "scrap"]),
  ],
  yellow: [
    mod({ scrapMultPct: 5 }, ["scrap", "yellow"]),
    mod({ battleStartScrap: 2 }, ["scrap"]),
    eff([shopArrival], "meta:chartFx.fx.shopArrival", ["scrap"]),
    eff([maxFaceScrap], "meta:chartFx.fx.maxFaceScrap", ["scrap", "spike"]),
    mod({ scrapPerKill: 2 }, ["scrap"]),
    mod({ xpMultPct: 4 }, ["yellow"]),
    eff([yellowTollBooth], "meta:chartFx.fx.yellowTollBooth", ["scrap"]),
    eff([yellowKickback], "meta:chartFx.fx.yellowKickback", ["scrap", "yellow"]),
    eff([yellowLuckyOpen], "meta:chartFx.fx.yellowLuckyOpen", [
      "scrap",
      "precision",
    ]),
    eff([yellowGleaner], "meta:chartFx.fx.yellowGleaner", ["scrap", "dice"]),
    mod({ shopDiscountPct: 5 }, ["scrap"]),
    mod({ freeShopRerolls: 1, shopDiscountPct: 3 }, ["scrap", "reroll"]),
    eff([yellowWager], "meta:chartFx.fx.yellowWager", ["risk", "scrap"]),
    mod({ scrapMultPct: 3, xpMultPct: 3 }, ["scrap", "yellow"]),
    mod({ battleStartScrap: 1, scrapPerKill: 1 }, ["scrap"]),
  ],
  black: [
    eff([minFaceScrap], "meta:chartFx.fx.minFaceScrap", ["scrap", "black"]),
    eff([blackBleedCharge], "meta:chartFx.fx.blackBleedCharge", [
      "risk",
      "charge",
    ]),
    mod({ chargeCapDelta: 1 }, ["charge"]),
    eff([reactorBonus], "meta:chartFx.fx.reactorBonus", ["reactor"]),
    eff([minFaceCharge], "meta:chartFx.fx.minFaceCharge", ["charge", "dice"]),
    eff([detourScout], "meta:chartFx.fx.detourScout", ["scrap", "risk"]),
    eff([blackOvercap], "meta:chartFx.fx.blackOvercap", ["overcap", "black"]),
    eff([blackPactTithe], "meta:chartFx.fx.blackPactTithe", ["risk", "black"]),
    eff([blackLastLight], "meta:chartFx.fx.blackLastLight", [
      "risk",
      "survival",
    ]),
    eff(
      [blackReactorCount, blackReactorPayoff],
      "meta:chartFx.fx.blackReactorTally",
      ["reactor", "charge"],
    ),
    mod({ chargeCapDelta: 1, scrapPerKill: 1 }, ["charge", "scrap"]),
    eff([blackSpite], "meta:chartFx.fx.blackSpite", ["risk", "spike"]),
    mod({ hullMaxDelta: -2, chargeCapDelta: 2 }, ["risk", "charge"]),
    eff([blackNightWatch], "meta:chartFx.fx.blackNightWatch", [
      "black",
      "charge",
    ]),
    mod({ chargeCapDelta: 1, setCompleteCharge: 1 }, ["charge", "dice"]),
  ],
  grey: [
    mod({ rerollSizeDelta: 1 }, ["reroll"]),
    mod({ nudgeCostDelta: -1 }, ["dice"]),
    mod({ reserveDelta: 1 }, ["dice"]),
    mod({ extraRerolls: 1 }, ["reroll"]),
    eff([greyScan], "meta:chartFx.fx.greyScan", ["sensors", "precision"]),
    mod({ freeShopRerolls: 1 }, ["reroll", "scrap"]),
    eff([greyEvenKeel], "meta:chartFx.fx.greyEvenKeel", ["dice", "precision"]),
    eff([greyCounterweight], "meta:chartFx.fx.greyCounterweight", [
      "dice",
      "control",
    ]),
    eff([greyToolbelt], "meta:chartFx.fx.greyToolbelt", ["reroll", "dice"]),
    eff([greySpare], "meta:chartFx.fx.greySpare", ["dice"]),
    mod({ rerollSizeDelta: 1, nudgeCostDelta: -1 }, ["reroll", "dice"]),
    mod({ reserveDelta: 1, blueReserveDelta: 1 }, ["dice", "blue"]),
    eff([greyMirror], "meta:chartFx.fx.greyMirror", ["dice", "control"]),
    mod({ moduleSlotDelta: 1, hullMaxDelta: -1 }, ["risk"]),
    eff([greyLedgerKeep], "meta:chartFx.fx.greyLedgerKeep", ["scrap", "reroll"]),
  ],
  prismatic: [
    mod({ hullMaxDelta: 1, scrapMultPct: 3 }, ["prismatic"]),
  ],
};

const GATE_CONTENT: Record<School, Content> = {
  red: eff([redFirstTurn], "meta:chartFx.fx.redFirstTurn", ["red"]),
  blue: eff([shieldsHigh], "meta:chartFx.fx.shieldsHigh", ["shields"]),
  green: mod({ battleEndHeal: 1 }, ["repairBay"]),
  yellow: mod({ scrapMultPct: 5 }, ["scrap"]),
  black: eff([minFaceScrap], "meta:chartFx.fx.minFaceScrap", ["black"]),
  grey: mod({ rerollSizeDelta: 1 }, ["reroll"]),
  prismatic: mod({ hullMaxDelta: 1 }, ["prismatic"]),
};

interface Named extends Content {
  key: string;
}

const MINORS: Record<School, readonly Named[]> = {
  red: [
    {
      key: "redPowderRoom",
      fx: "meta:chartFx.fx.redPowderRoom",
      effects: [redPowderRoom],
      tags: ["burn"],
    },
    { key: "redRangeCard", mods: { markBonusDelta: 2 }, tags: ["precision"] },
    {
      key: "redHairTrigger",
      fx: "meta:chartFx.fx.redHairTrigger",
      effects: [redHairTrigger],
      tags: ["crit", "weapons"],
    },
    {
      key: "redCoreBreach",
      fx: "meta:chartFx.fx.redCoreBreach",
      effects: [redCoreBreach],
      tags: ["spike"],
    },
  ],
  blue: [
    { key: "blueStormAnchor", mods: { jamPowerDelta: 2 }, tags: ["control"] },
    {
      key: "blueSpillway",
      fx: "meta:chartFx.fx.blueSpillway",
      effects: [blueSpillway],
      tags: ["shieldwall"],
    },
    {
      key: "blueLongLens",
      fx: "meta:chartFx.fx.blueLongLens",
      effects: [blueLongLens],
      tags: ["sensors"],
    },
    {
      key: "blueKeelPlate",
      mods: { hullMaxDelta: 4, blueReserveDelta: 1 },
      tags: ["survival", "blue"],
    },
  ],
  green: [
    {
      key: "greenGraftBench",
      mods: { growthCapDelta: 1, setCompleteCharge: 1 },
      tags: ["growth", "dice"],
    },
    {
      key: "greenSapline",
      fx: "meta:chartFx.fx.greenSapline",
      effects: [greenSapline],
      tags: ["repairBay", "shieldwall"],
    },
    {
      key: "greenLoam",
      fx: "meta:chartFx.fx.greenLoam",
      effects: [greenLoam],
      tags: ["growth", "engines"],
    },
    { key: "greenHollow", mods: { battleEndHeal: 3 }, tags: ["repairBay"] },
  ],
  yellow: [
    {
      key: "yellowTollhouse",
      fx: "meta:chartFx.fx.yellowTollhouse",
      effects: [yellowTollhouse],
      tags: ["scrap"],
    },
    { key: "yellowFinderFee", mods: { scrapPerKill: 3 }, tags: ["scrap"] },
    {
      key: "yellowShortWeight",
      mods: { shopDiscountPct: 8, freeShopRerolls: 1 },
      tags: ["scrap", "reroll"],
    },
    {
      key: "yellowMintMark",
      fx: "meta:chartFx.fx.yellowMintMark",
      effects: [yellowMintMark],
      tags: ["scrap", "reactor"],
    },
  ],
  black: [
    {
      key: "blackAshBed",
      fx: "meta:chartFx.fx.blackAshBed",
      effects: [blackAshBed],
      tags: ["charge", "dice"],
    },
    {
      key: "blackDeadMansSwitch",
      fx: "meta:chartFx.fx.blackDeadMansSwitch",
      effects: [blackDeadMansSwitch],
      tags: ["risk", "charge"],
    },
    {
      key: "blackTithe",
      mods: { chargeCapDelta: 1, hullMaxDelta: -3 },
      tags: ["risk", "charge"],
    },
    {
      key: "blackSlagHeap",
      fx: "meta:chartFx.fx.blackSlagHeap",
      effects: [blackSlagHeap],
      tags: ["reactor", "charge"],
    },
  ],
  grey: [
    { key: "greyShimStack", mods: { nudgeCostDelta: -2 }, tags: ["dice"] },
    {
      key: "greyPatternBook",
      fx: "meta:chartFx.fx.greyPatternBook",
      effects: [greyPatternBook],
      tags: ["reroll", "dice"],
    },
    { key: "greyBallastTrim", mods: { reserveDelta: 2 }, tags: ["dice"] },
    {
      key: "greyTallyStick",
      fx: "meta:chartFx.fx.greyTallyStick",
      effects: [greyTallyCount, greyTallyPayoff],
      tags: ["sensors", "precision"],
    },
  ],
  prismatic: [],
};

const NOTABLES: Record<School, readonly Named[]> = {
  red: [
    {
      key: "redSalvo",
      fx: "meta:chartFx.fx.redSalvo",
      tags: ["weapons", "spike"],
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "weapons" }, { c: "turnLte", n: 1 }],
          do: [{ a: "modDieValue", n: 3 }],
        },
      ],
    },
    { key: "redSpotter", mods: { markBonusDelta: 3 }, tags: ["precision"] },
    {
      key: "redFirestorm",
      fx: "meta:chartFx.fx.redFirestorm",
      tags: ["burn"],
      effects: [
        {
          on: "afterResolveSlot",
          if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
          do: [{ a: "addStatus", s: "burn", n: 3, target: "target" }],
        },
      ],
    },
    {
      key: "redSpine",
      fx: "meta:chartFx.fx.redSpine",
      tags: ["spinal", "spike"],
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "spinal" }],
          do: [{ a: "modDieValue", n: 4 }],
        },
      ],
    },
  ],
  blue: [
    {
      key: "blueGlacier",
      fx: "meta:chartFx.fx.blueGlacier",
      tags: ["shields", "shieldwall"],
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "shields" }],
          do: [{ a: "shield", n: 2 }],
        },
      ],
    },
    { key: "blueBarrier", mods: { hullMaxDelta: 6 }, tags: ["survival"] },
    { key: "blueJammer", mods: { jamPowerDelta: 3 }, tags: ["control"] },
    {
      key: "blueTideBreak",
      mods: { tideEffectDelta: -1 },
      tags: ["survival"],
    },
  ],
  green: [
    {
      key: "greenSymbiosis",
      mods: { battleEndHeal: 2 },
      tags: ["repairBay"],
    },
    {
      key: "greenChloro",
      mods: { growthCapDelta: 1, evasionDelta: 2 },
      tags: ["growth", "engines"],
    },
    {
      key: "greenCanopy",
      fx: "meta:chartFx.fx.greenCanopy",
      tags: ["engines"],
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "engines" }],
          do: [{ a: "modDieValue", n: 3 }],
        },
      ],
    },
    { key: "greenPerennial", mods: { growthCapDelta: 2 }, tags: ["growth"] },
  ],
  yellow: [
    { key: "yellowLode", mods: { scrapMultPct: 15 }, tags: ["scrap"] },
    {
      key: "yellowVein",
      mods: { battleStartScrap: 4, shopDiscountPct: 5 },
      tags: ["scrap"],
    },
    { key: "yellowTally", mods: { xpMultPct: 20 }, tags: ["yellow"] },
    { key: "yellowBounty", mods: { scrapPerKill: 5 }, tags: ["scrap"] },
  ],
  black: [
    {
      key: "blackEdge",
      fx: "meta:chartFx.fx.blackEdge",
      tags: ["risk", "spike"],
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "hullPctLt", n: 20 }],
          do: [{ a: "modDieValue", n: 2 }],
        },
      ],
    },
    { key: "blackReserve", mods: { chargeCapDelta: 2 }, tags: ["charge"] },
    { key: "blackVent", traits: ["overflowShield"], tags: ["overcap"] },
    {
      key: "blackWell",
      fx: "meta:chartFx.fx.blackWell",
      tags: ["reactor", "charge"],
      effects: [
        {
          on: "afterResolveSlot",
          if: [{ c: "slot", is: "reactor" }],
          do: [{ a: "charge", n: 2 }],
        },
      ],
    },
  ],
  grey: [
    { key: "greyCool", mods: { rerollSizeDelta: 2 }, tags: ["reroll"] },
    {
      key: "greyThrift",
      mods: { reserveDelta: 1, nudgeCostDelta: -1 },
      tags: ["dice"],
    },
    { key: "greyToolkit", mods: { extraRerolls: 1 }, tags: ["reroll"] },
    {
      key: "greyLedger",
      mods: { freeShopRerolls: 2, shopDiscountPct: 6 },
      tags: ["scrap", "reroll"],
    },
  ],
  prismatic: [
    {
      key: "prismCore",
      mods: { hullMaxDelta: 2, scrapMultPct: 5 },
      tags: ["prismatic"],
    },
    {
      key: "prismLattice",
      mods: { setCompleteCharge: 2 },
      tags: ["prismatic", "dice"],
    },
    {
      key: "prismFacet",
      fx: "meta:chartFx.fx.firstTurnAll",
      effects: [firstTurnAll],
      tags: ["prismatic"],
    },
    { key: "prismWell", mods: { chargeCapDelta: 3 }, tags: ["charge"] },
  ],
};

const KEYSTONES: Record<School, readonly Named[]> = {
  red: [
    {
      key: "keyStormChaser",
      mods: { tideEffectDelta: 1, scrapMultPct: 30, xpMultPct: 30 },
      tags: ["risk", "scrap"],
    },
  ],
  blue: [
    {
      key: "keyIronDoctrine",
      mods: { hullMaxDelta: 12 },
      slotTierDelta: { engines: -1 },
      tags: ["survival"],
    },
  ],
  green: [
    {
      key: "keyOvergrowth",
      mods: { hullMaxDelta: -5, growthCapDelta: 2, battleEndHeal: 2 },
      tags: ["growth", "repairBay"],
    },
  ],
  yellow: [
    {
      key: "keyColdLogic",
      traits: ["coldLogic"],
      mods: { nudgeCostDelta: -3 },
      tags: ["dice", "precision"],
    },
  ],
  black: [
    { key: "keyObsidian", traits: ["obsidianPact"], tags: ["risk", "black"] },
  ],
  grey: [
    {
      key: "keySingleCast",
      traits: ["singleCast"],
      fx: "meta:chartFx.fx.allDice1",
      effects: [{ on: "beforeResolveSlot", do: [{ a: "modDieValue", n: 1 }] }],
      tags: ["dice"],
    },
  ],
  prismatic: [
    {
      key: "keyFatesFavorite",
      traits: ["fateTwice"],
      mods: { hullMaxPct: -20 },
      tags: ["risk", "prismatic"],
    },
    {
      key: "keyPrismCascade",
      traits: ["prismDouble"],
      budgetDelta: -2,
      tags: ["prismatic"],
    },
  ],
};

const SMALL_COUNT: Record<School, number> = {
  red: 24,
  blue: 24,
  green: 24,
  yellow: 24,
  black: 24,
  grey: 24,
  prismatic: 1,
};

const SCHOOL_ORDER: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];

const namedContent = (n: Named): Content => ({
  effects: n.effects,
  mods: n.mods,
  traits: n.traits,
  tags: n.tags,
  fx: n.fx,
  budgetDelta: n.budgetDelta,
  slotTierDelta: n.slotTierDelta,
});

const SMALL_STRIDE = 7;

const smallAt = (pool: readonly Content[], index: number): Content =>
  pool[((index + 1) * SMALL_STRIDE) % pool.length] ?? {};

const buildBody = (school: School): NodeSpec[] => {
  const pool = SMALL_POOLS[school];
  const count = SMALL_COUNT[school];
  const smalls: NodeSpec[] = Array.from({ length: count }, (_, i) => ({
    role: "small",
    ...smallAt(pool, i),
  }));
  const minors = MINORS[school];
  const notables = NOTABLES[school];

  const body: NodeSpec[] = [];
  const named = [
    ...minors.map((n) => ({ tier: "minor" as ChartNodeKind, def: n })),
    ...notables.map((n) => ({ tier: "notable" as ChartNodeKind, def: n })),
  ];
  const interleaved: { tier: ChartNodeKind; def: Named }[] = [];
  for (let i = 0; i < Math.max(minors.length, notables.length); i += 1) {
    const minor = minors[i];
    const notable = notables[i];
    if (minor !== undefined) interleaved.push({ tier: "minor", def: minor });
    if (notable !== undefined)
      interleaved.push({ tier: "notable", def: notable });
  }
  const order = interleaved.length > 0 ? interleaved : named;
  const step = Math.max(1, Math.floor(count / (order.length + 1)));
  let namedIdx = 0;
  smalls.forEach((s, i) => {
    body.push(s);
    if (namedIdx < order.length && i + 1 === step * (namedIdx + 1)) {
      const entry = order[namedIdx];
      if (entry !== undefined) {
        body.push({
          role: entry.tier,
          key: entry.def.key,
          ...namedContent(entry.def),
        });
      }
      namedIdx += 1;
    }
  });
  while (namedIdx < order.length) {
    const entry = order[namedIdx];
    if (entry !== undefined)
      body.push({
        role: entry.tier,
        key: entry.def.key,
        ...namedContent(entry.def),
      });
    namedIdx += 1;
  }
  return body;
};

const hubAnchor = (angleDeg: number): string => {
  const k = ((Math.round(angleDeg / 22.5) % 16) + 16) % 16;
  return `hub-o${String(k)}`;
};

const chunk3 = <T,>(arr: readonly T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 3) out.push([...arr.slice(i, i + 3)]);
  return out;
};

const LATERALS: Record<number, readonly number[]> = {
  1: [0],
  2: [-32, 32],
  3: [-50, 0, 50],
};

const buildCluster = (school: School, angleDeg: number): ChartNodeDef[] => {
  const angle = angleDeg * DEG;
  const nodes: ChartNodeDef[] = [];
  const gateId = `${school}-gate`;
  nodes.push({
    id: gateId,
    constellation: school,
    kind: "gate",
    entry: true,
    pos: place(angle, 150, 0),
    links: [hubAnchor(angleDeg)],
    ...GATE_CONTENT[school],
    name: `meta:chart.${school}Gate`,
  });

  const body = buildBody(school);
  const levels = chunk3(body);
  let prevIds = [gateId];
  const counters = { small: 0, minor: 0, notable: 0 };
  levels.forEach((level, li) => {
    const rad = 188 + li * 30;
    const lats = LATERALS[level.length] ?? LATERALS[3] ?? [0];
    const ids = level.map((spec, j) => {
      const id =
        spec.role === "notable"
          ? `${school}-not${String((counters.notable += 1))}`
          : spec.role === "minor"
            ? `${school}-min${String((counters.minor += 1))}`
            : `${school}-s${String((counters.small += 1))}`;
      const parent = prevIds[Math.min(j, prevIds.length - 1)] ?? gateId;
      nodes.push({
        id,
        constellation: school,
        kind: spec.role,
        pos: place(angle, rad, lats[j] ?? 0),
        links: [parent],
        effects: spec.effects,
        mods: spec.mods,
        traits: spec.traits,
        tags: spec.tags,
        fx: spec.fx,
        ...(spec.role === "notable" || spec.role === "minor"
          ? { name: `meta:chart.${spec.key ?? id}` }
          : {}),
      });
      return id;
    });
    prevIds = ids;
  });

  const keystones = KEYSTONES[school];
  keystones.forEach((keystone, i) => {
    const rad = 188 + levels.length * 30;
    const parent = prevIds[Math.min(i, prevIds.length - 1)] ?? gateId;
    const content = namedContent(keystone);
    nodes.push({
      id: `${school}-key${String(i + 1)}`,
      constellation: school,
      kind: "keystone",
      pos: place(angle, rad, keystones.length === 1 ? 0 : i === 0 ? -42 : 42),
      links: [parent],
      effects: content.effects,
      mods: content.mods,
      traits: content.traits,
      tags: content.tags,
      fx: content.fx,
      budgetDelta: content.budgetDelta,
      slotTierDelta: content.slotTierDelta,
      name: `meta:chart.${keystone.key}`,
    });
  });
  return nodes;
};

const HUB_NOTABLES: Record<number, { key: string; content: Content }> = {
  2: { key: "hubBarahol", content: mod({ shopDiscountPct: 10 }, ["scrap"]) },
  5: { key: "hubEngineering", content: mod({ moduleSlotDelta: 1 }, ["dice"]) },
  7: {
    key: "hubCharts",
    content: eff([sensorsBonus], "meta:chartFx.fx.sensorsBonus", ["sensors"]),
  },
  12: {
    key: "hubHangar",
    content: { hubBudget: true, budgetDelta: 1, tags: ["dice"] },
  },
};

const buildHub = (): ChartNodeDef[] => {
  const nodes: ChartNodeDef[] = [];
  const inner: string[] = [];
  for (let k = 0; k < 12; k += 1) {
    const id = `hub-i${String(k)}`;
    inner.push(id);
    nodes.push({
      id,
      constellation: "hub",
      kind: "small",
      ...(k === 0 ? { entry: true } : {}),
      pos: place(k * 30 * DEG, 48, 0),
      links: [],
      ...(HUB_SMALLS[(k * 5) % HUB_SMALLS.length] ?? {}),
    });
  }
  for (let k = 0; k < 12; k += 1) {
    const from = nodes[k];
    if (from !== undefined) from.links = [inner[(k + 1) % 12] ?? inner[0] ?? ""];
  }

  let smallIdx = 0;
  for (let k = 0; k < 16; k += 1) {
    const id = `hub-o${String(k)}`;
    const named = HUB_NOTABLES[k];
    const anchor = inner[Math.floor((k * 12) / 16)] ?? inner[0] ?? "";
    if (named !== undefined) {
      nodes.push({
        id,
        constellation: "hub",
        kind: "notable",
        pos: place(k * 22.5 * DEG, 96, 0),
        links: [anchor],
        ...named.content,
        name: `meta:chart.${named.key}`,
      });
    } else {
      nodes.push({
        id,
        constellation: "hub",
        kind: "small",
        pos: place(k * 22.5 * DEG, 96, 0),
        links: [anchor],
        ...(HUB_SMALLS[(smallIdx++ * 5 + 1) % HUB_SMALLS.length] ?? {}),
      });
    }
  }
  return nodes;
};

const buildChart = (): ChartNodeDef[] => {
  const nodes = [...buildHub()];
  SCHOOL_ORDER.forEach((school, i) => {
    const angleDeg = -90 + i * (360 / 7);
    nodes.push(...buildCluster(school, angleDeg));
  });
  return nodes;
};

export const CHART_NODES: readonly ChartNodeDef[] = buildChart();

export const HUB_BUDGET_NODE_ID = "hub-o12";
