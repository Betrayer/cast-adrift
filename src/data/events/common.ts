import type { EventDef } from "@/types/events";

// Cross-sector pool for S2–S5. Four of these are beacon callbacks (DESIGN §3
// wants the player to *see* causality): the Keeper's network remembers a sold
// beacon, Yusuf's lane remembers a shared black box, the Preacher remembers a
// public refusal, and a broken beacon leaves a wake.
export const COMMON_EVENTS: readonly EventDef[] = [
  {
    id: "keeperEcho",
    weight: 14,
    speaker: "beaconKeeper",
    requires: { sector: [2, 3, 4, 5], flags: { all: ["keeperSlighted"] } },
    text: "content:events.keeperEcho.text",
    options: [
      {
        id: "pay",
        label: "content:events.keeperEcho.opt.pay",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.keeperEcho.out.pay",
            effects: [
              { k: "scrap", n: -40 },
              { k: "axis", n: 1 },
              { k: "flag", key: "keeperRepaid" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
        ],
      },
      {
        id: "shrug",
        label: "content:events.keeperEcho.opt.shrug",
        outcomes: [
          {
            text: "content:events.keeperEcho.out.shrug",
            effects: [
              { k: "axis", n: -1 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
        ],
      },
    ],
  },
  {
    id: "yusufLane",
    weight: 14,
    speaker: "yusuf",
    requires: { sector: [3, 4, 5], flags: { all: ["fleetTruthShared"] } },
    text: "content:events.yusufLane.text",
    options: [
      {
        id: "escort",
        label: "content:events.yusufLane.opt.escort",
        outcomes: [
          {
            text: "content:events.yusufLane.out.escort",
            effects: [
              { k: "hull", n: 8 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 40 },
              { k: "flag", key: "yusufFriend" },
            ],
            consequence: "content:consequence.fleetShared",
          },
        ],
      },
      {
        id: "trade",
        label: "content:events.yusufLane.opt.trade",
        outcomes: [
          {
            text: "content:events.yusufLane.out.trade",
            effects: [
              { k: "scrap", n: 55 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.fleetShared",
          },
        ],
      },
    ],
  },
  {
    id: "preacherGrudge",
    weight: 14,
    speaker: "choirPreacher",
    requires: { sector: [4, 5], flags: { all: ["refusedChoir"] } },
    text: "content:events.preacherGrudge.text",
    options: [
      {
        id: "repeat",
        label: "content:events.preacherGrudge.opt.repeat",
        outcomes: [
          {
            text: "content:events.preacherGrudge.out.repeat",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 3 },
              { k: "flag", key: "choirEnemy" },
            ],
            consequence: "content:consequence.refusedChoir",
          },
        ],
      },
      {
        id: "hear",
        label: "content:events.preacherGrudge.opt.hear",
        outcomes: [
          {
            text: "content:events.preacherGrudge.out.hear",
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
            consequence: "content:consequence.refusedChoir",
          },
        ],
      },
    ],
  },
  {
    id: "brokenBeaconWake",
    weight: 12,
    speaker: "beaconKeeper",
    requires: { sector: [3, 4, 5], flags: { all: ["beaconBroken"] } },
    text: "content:events.brokenBeaconWake.text",
    options: [
      {
        id: "rebuild",
        label: "content:events.brokenBeaconWake.opt.rebuild",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.brokenBeaconWake.out.rebuild",
            effects: [
              { k: "scrap", n: -30 },
              { k: "tide", n: -1 },
              { k: "axis", n: 2 },
              { k: "flag", key: "beaconRebuilt" },
            ],
            consequence: "content:consequence.beaconBroken",
          },
        ],
      },
      {
        id: "scavenge",
        label: "content:events.brokenBeaconWake.opt.scavenge",
        outcomes: [
          {
            text: "content:events.brokenBeaconWake.out.scavenge",
            effects: [
              { k: "scrap", n: 40 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.beaconBroken",
          },
        ],
      },
    ],
  },
  {
    id: "driftSalvageCrew",
    weight: 20,
    speaker: "yusuf",
    requires: { sector: [2, 3] },
    text: "content:events.driftSalvageCrew.text",
    options: [
      {
        id: "rescue",
        label: "content:events.driftSalvageCrew.opt.rescue",
        outcomes: [
          {
            text: "content:events.driftSalvageCrew.out.rescue",
            effects: [
              { k: "hull", n: -4 },
              { k: "axis", n: 2 },
              { k: "flag", key: "crewSaved" },
              { k: "flag", key: "yusufFriend" },
            ],
          },
        ],
      },
      {
        id: "tow",
        label: "content:events.driftSalvageCrew.opt.tow",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.driftSalvageCrew.out.towPass",
            effects: [
              { k: "scrap", n: 50 },
              { k: "flag", key: "crewSaved" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.driftSalvageCrew.out.towFail",
            effects: [
              { k: "hull", n: -6 },
              { k: "flag", key: "yusufGrudge" },
            ],
          },
        ],
      },
      {
        id: "strip",
        label: "content:events.driftSalvageCrew.opt.strip",
        outcomes: [
          {
            text: "content:events.driftSalvageCrew.out.strip",
            effects: [
              { k: "scrap", n: 70 },
              { k: "axis", n: -2 },
              { k: "flag", key: "yusufGrudge" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "riftMirror",
    weight: 20,
    requires: { sector: [3, 4] },
    text: "content:events.riftMirror.text",
    codex: "riddleWard",
    options: [
      {
        id: "match",
        label: "content:events.riftMirror.opt.match",
        check: { dice: 2, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.riftMirror.out.matchPass",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.riftMirror.out.matchFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "break",
        label: "content:events.riftMirror.opt.break",
        outcomes: [
          {
            text: "content:events.riftMirror.out.break",
            effects: [
              { k: "scrap", n: 35 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "coreStatic",
    weight: 20,
    requires: { sector: [4, 5] },
    text: "content:events.coreStatic.text",
    options: [
      {
        id: "tune",
        label: "content:events.coreStatic.opt.tune",
        requires: { req: "mk", slot: "sensors", mk: 2 },
        outcomes: [
          {
            text: "content:events.coreStatic.out.tune",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: -1 },
              { k: "flag", key: "coreListened" },
            ],
          },
        ],
      },
      {
        id: "shield",
        label: "content:events.coreStatic.opt.shield",
        outcomes: [
          {
            text: "content:events.coreStatic.out.shield",
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
      {
        id: "ride",
        label: "content:events.coreStatic.opt.ride",
        outcomes: [
          {
            text: "content:events.coreStatic.out.ride",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 5, battles: 3 },
              { k: "hull", n: -4 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "scavRefit",
    weight: 22,
    speaker: "mara",
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.scavRefit.text",
    options: [
      {
        id: "buy",
        label: "content:events.scavRefit.opt.buy",
        requires: { req: "scrap", n: 35 },
        outcomes: [
          {
            text: "content:events.scavRefit.out.buy",
            effects: [
              { k: "scrap", n: -35 },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "flag", key: "maraFriend" },
            ],
          },
        ],
      },
      {
        id: "swap",
        label: "content:events.scavRefit.opt.swap",
        outcomes: [
          {
            text: "content:events.scavRefit.out.swap",
            effects: [{ k: "swapLowestDie" }],
          },
        ],
      },
      {
        id: "pass",
        label: "content:events.scavRefit.opt.pass",
        outcomes: [
          {
            text: "content:events.scavRefit.out.pass",
            effects: [{ k: "scrap", n: 18 }],
          },
        ],
      },
    ],
  },
];
