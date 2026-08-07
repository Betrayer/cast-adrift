import type { EventDef } from "@/types/events";

// The scenes that carry the four NPC threads (R7 Task 5). Every one of them is a
// declared chain step, so its weight is boosted while it is the live step and the
// map stamps a marker on any node that can host it.
export const CHAIN_EVENTS: readonly EventDef[] = [
  {
    id: "maraSupplyRun",
    weight: 20,
    speaker: "mara",
    requires: { sector: [3, 4], flags: { any: ["maraDebt", "maraFriend"] } },
    text: "content:events.maraSupplyRun.text",
    options: [
      {
        id: "escort",
        label: "content:events.maraSupplyRun.opt.escort",
        outcomes: [
          {
            text: "content:events.maraSupplyRun.out.escort",
            effects: [{ k: "flag", key: "favorHeld" }],
            consequence: "content:consequence.maraSupplyRun",
            follow: {
              enemyIds: ["hookTug", "ripperTug"],
              scrap: 35,
              setFlags: [["maraFriend", true]],
            },
          },
        ],
      },
      {
        id: "skim",
        label: "content:events.maraSupplyRun.opt.skim",
        outcomes: [
          {
            text: "content:events.maraSupplyRun.out.skim",
            weight: 2,
            effects: [
              { k: "scrap", n: 70 },
              { k: "flag", key: "maraGrudge" },
              { k: "flag", key: "favorRefused" },
            ],
            consequence: "content:consequence.maraSkim",
          },
          {
            text: "content:events.maraSupplyRun.out.skimCaught",
            weight: 1,
            effects: [
              { k: "scrap", n: 25 },
              { k: "flag", key: "maraGrudge" },
              { k: "flag", key: "favorRefused" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.maraSkim",
          },
        ],
      },
      {
        id: "decline",
        label: "content:events.maraSupplyRun.opt.decline",
        outcomes: [
          {
            text: "content:events.maraSupplyRun.out.decline",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "favorRefused" },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
            consequence: "content:consequence.favorRefused",
          },
        ],
      },
    ],
  },
  {
    id: "maraVault",
    weight: 22,
    speaker: "mara",
    requires: {
      sector: [5],
      flags: { any: ["favorHeld", "maraDebt"], not: ["maraGrudge"] },
    },
    text: "content:events.maraVault.text",
    options: [
      {
        id: "openIt",
        label: "content:events.maraVault.opt.openIt",
        outcomes: [
          {
            text: "content:events.maraVault.out.openIt",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 45 },
              { k: "flag", key: "maraVaultOpened" },
            ],
            consequence: "content:consequence.maraVault",
          },
        ],
      },
      {
        id: "takeCash",
        label: "content:events.maraVault.opt.takeCash",
        outcomes: [
          {
            text: "content:events.maraVault.out.takeCash",
            effects: [
              { k: "scrap", n: 130 },
              { k: "flag", key: "maraVaultOpened" },
            ],
            consequence: "content:consequence.maraVault",
          },
        ],
      },
      {
        id: "leaveItHers",
        label: "content:events.maraVault.opt.leaveItHers",
        outcomes: [
          {
            text: "content:events.maraVault.out.leaveItHers",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 8 },
              { k: "flag", key: "maraVaultOpened" },
              { k: "flag", key: "maraFriend" },
            ],
            consequence: "content:consequence.maraVaultLeft",
          },
        ],
      },
    ],
  },
  {
    id: "maraUsurer",
    weight: 22,
    speaker: "mara",
    requires: { sector: [5], flags: { all: ["maraGrudge"] } },
    text: "content:events.maraUsurer.text",
    options: [
      {
        id: "payInFull",
        label: "content:events.maraUsurer.opt.payInFull",
        requires: { req: "scrap", n: 90 },
        outcomes: [
          {
            text: "content:events.maraUsurer.out.payInFull",
            effects: [
              { k: "scrap", n: -90 },
              { k: "flag", key: "maraFriend" },
              { k: "flag", key: "maraUsurerSettled" },
            ],
            consequence: "content:consequence.maraUsurerPaid",
          },
        ],
      },
      {
        id: "fightIt",
        label: "content:events.maraUsurer.opt.fightIt",
        outcomes: [
          {
            text: "content:events.maraUsurer.out.fightIt",
            effects: [{ k: "flag", key: "maraUsurerSettled" }],
            consequence: "content:consequence.maraUsurerFought",
            follow: {
              enemyIds: ["usurer"],
              scrap: 110,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "runTheLane",
        label: "content:events.maraUsurer.opt.runTheLane",
        check: { dice: 3, pick: "sum", target: 14 },
        onPass: [
          {
            text: "content:events.maraUsurer.out.runPass",
            effects: [
              { k: "flag", key: "maraUsurerSettled" },
              { k: "scrap", n: 40 },
            ],
            consequence: "content:consequence.maraUsurerRun",
          },
        ],
        onFail: [
          {
            text: "content:events.maraUsurer.out.runFail",
            effects: [
              { k: "flag", key: "maraUsurerSettled" },
              { k: "hull", n: -12 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.maraUsurerRun",
          },
        ],
      },
    ],
  },
  {
    id: "yusufConvoyDefense",
    weight: 22,
    speaker: "yusuf",
    requires: {
      sector: [3],
      flags: {
        any: ["fleetTruthShared", "fleetTruthKept", "fleetTruthLost", "yusufFriend"],
      },
    },
    text: "content:events.yusufConvoyDefense.text",
    options: [
      {
        id: "holdTheLine",
        label: "content:events.yusufConvoyDefense.opt.holdTheLine",
        outcomes: [
          {
            text: "content:events.yusufConvoyDefense.out.holdTheLine",
            effects: [
              { k: "flag", key: "fleetAnswered" },
              { k: "flag", key: "yusufFriend" },
            ],
            consequence: "content:consequence.fleetAnswered",
            follow: {
              enemyIds: ["riftling", "riftling", "foldWorm"],
              scrap: 45,
              loot: { rarity: "uncommon" },
            },
          },
        ],
      },
      {
        id: "tellThem",
        label: "content:events.yusufConvoyDefense.opt.tellThem",
        requires: { req: "flag", key: "fleetTruthKept" },
        outcomes: [
          {
            text: "content:events.yusufConvoyDefense.out.tellThem",
            effects: [
              { k: "flag", key: "fleetTruthShared" },
              { k: "flag", key: "fleetAnswered" },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.fleetTruthShared",
          },
        ],
      },
      {
        id: "sellManifest",
        label: "content:events.yusufConvoyDefense.opt.sellManifest",
        outcomes: [
          {
            text: "content:events.yusufConvoyDefense.out.sellManifest",
            weight: 3,
            effects: [
              { k: "scrap", n: 95 },
              { k: "flag", key: "yusufGrudge" },
              { k: "flag", key: "fleetTruthLost" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
          {
            text: "content:events.yusufConvoyDefense.out.sellCaught",
            weight: 2,
            effects: [
              { k: "scrap", n: 45 },
              { k: "flag", key: "yusufGrudge" },
              { k: "flag", key: "fleetTruthLost" },
              { k: "hull", n: -10 },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
        ],
      },
    ],
  },
  {
    id: "yusufRefugeeLane",
    weight: 22,
    speaker: "yusuf",
    requires: {
      sector: [4, 5],
      flags: { any: ["fleetAnswered", "fleetTruthShared", "fleetTruthKept"] },
    },
    text: "content:events.yusufRefugeeLane.text",
    options: [
      {
        id: "openLane",
        label: "content:events.yusufRefugeeLane.opt.openLane",
        outcomes: [
          {
            text: "content:events.yusufRefugeeLane.out.openLane",
            effects: [
              { k: "flag", key: "fleetLaneOpen" },
              { k: "flag", key: "silentReady" },
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.fleetLaneOpen",
          },
        ],
      },
      {
        id: "chargeToll",
        label: "content:events.yusufRefugeeLane.opt.chargeToll",
        outcomes: [
          {
            text: "content:events.yusufRefugeeLane.out.chargeToll",
            effects: [
              { k: "scrap", n: 85 },
              { k: "flag", key: "fleetLaneClosed" },
              { k: "flag", key: "yusufGrudge" },
            ],
            consequence: "content:consequence.fleetLaneClosed",
          },
        ],
      },
      {
        id: "sealIt",
        label: "content:events.yusufRefugeeLane.opt.sealIt",
        outcomes: [
          {
            text: "content:events.yusufRefugeeLane.out.sealIt",
            effects: [
              { k: "flag", key: "fleetLaneClosed" },
              { k: "flag", key: "fleetTruthLost" },
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.fleetLaneSealed",
          },
        ],
      },
    ],
  },
  {
    id: "choirDeepPact",
    weight: 22,
    speaker: "choirPreacher",
    requires: { sector: [4, 5], flags: { all: ["pactSealed"] } },
    text: "content:events.choirDeepPact.text",
    codex: "choirDoctrine",
    options: [
      {
        id: "goDeeper",
        label: "content:events.choirDeepPact.opt.goDeeper",
        outcomes: [
          {
            text: "content:events.choirDeepPact.out.goDeeper",
            effects: [
              { k: "flag", key: "bargainReady" },
              { k: "hullMax", n: -8 },
              { k: "loot", rarity: "legendary" },
              { k: "axis", n: -3 },
            ],
            consequence: "content:consequence.bargainReady",
          },
        ],
      },
      {
        id: "holdHere",
        label: "content:events.choirDeepPact.opt.holdHere",
        outcomes: [
          {
            text: "content:events.choirDeepPact.out.holdHere",
            effects: [
              { k: "flag", key: "bargainReady" },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 },
            ],
            consequence: "content:consequence.pactHeld",
          },
        ],
      },
      {
        id: "breakIt",
        label: "content:events.choirDeepPact.opt.breakIt",
        outcomes: [
          {
            text: "content:events.choirDeepPact.out.breakIt",
            effects: [
              { k: "flag", key: "pactBroken" },
              { k: "flag", key: "choirEnemy" },
              { k: "axis", n: 3 },
            ],
            consequence: "content:consequence.pactBroken",
            follow: {
              enemyIds: ["choirCantor"],
              scrap: 70,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "preacherFinale",
    weight: 24,
    speaker: "choirPreacher",
    requires: {
      sector: [5],
      flags: { any: ["pactSealed", "choirEnemy", "refusedChoir", "choirBetrayed"] },
    },
    text: "content:events.preacherFinale.text",
    options: [
      {
        id: "singWithHim",
        label: "content:events.preacherFinale.opt.singWithHim",
        outcomes: [
          {
            text: "content:events.preacherFinale.out.singWithHim",
            effects: [
              { k: "flag", key: "preacherAnswered" },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 3 },
            ],
            consequence: "content:consequence.preacherSang",
          },
        ],
      },
      {
        id: "answerPlainly",
        label: "content:events.preacherFinale.opt.answerPlainly",
        outcomes: [
          {
            text: "content:events.preacherFinale.out.answerPlainly",
            effects: [
              { k: "flag", key: "preacherAnswered" },
              { k: "axis", n: 2 },
              { k: "hullMax", n: 6 },
            ],
            consequence: "content:consequence.preacherAnswered",
          },
        ],
      },
      {
        id: "cutHimOff",
        label: "content:events.preacherFinale.opt.cutHimOff",
        outcomes: [
          {
            text: "content:events.preacherFinale.out.cutHimOff",
            effects: [
              { k: "flag", key: "preacherAnswered" },
              { k: "flag", key: "choirEnemy" },
              { k: "scrap", n: 60 },
            ],
            consequence: "content:consequence.preacherCut",
            follow: { enemyIds: ["choirAcolyte", "choirAcolyte"], scrap: 40 },
          },
        ],
      },
    ],
  },
  {
    id: "keeperThread",
    weight: 22,
    speaker: "beaconKeeper",
    requires: {
      sector: [2, 3, 4],
      flags: { any: ["beacon1", "beacon2", "beacon3"] },
    },
    text: "content:events.keeperThread.text",
    codex: "keeperCreed",
    options: [
      {
        id: "repayHim",
        label: "content:events.keeperThread.opt.repayHim",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.keeperThread.out.repayHim",
            effects: [
              { k: "scrap", n: -40 },
              { k: "flag", key: "keeperRepaid" },
              { k: "flag", key: "keeperTrust" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.keeperRepaid",
          },
        ],
      },
      {
        id: "askMore",
        label: "content:events.keeperThread.opt.askMore",
        outcomes: [
          {
            text: "content:events.keeperThread.out.askMore",
            weight: 2,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "keeperSlighted" },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
          {
            text: "content:events.keeperThread.out.askMoreCold",
            weight: 1,
            effects: [
              { k: "scrap", n: 55 },
              { k: "flag", key: "keeperSlighted" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
        ],
      },
      {
        id: "handTheLog",
        label: "content:events.keeperThread.opt.handTheLog",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.keeperThread.out.logPass",
            effects: [
              { k: "flag", key: "keeperRepaid" },
              { k: "flag", key: "beaconRebuilt" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            codex: "oldBeacon",
            consequence: "content:consequence.keeperLog",
          },
        ],
        onFail: [
          {
            text: "content:events.keeperThread.out.logFail",
            effects: [
              { k: "flag", key: "keeperSlighted" },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.keeperLogLost",
          },
        ],
      },
    ],
  },
];
