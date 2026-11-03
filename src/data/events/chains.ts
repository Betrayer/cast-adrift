import type { EventDef } from "@/types/events";

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
            consequence: "content:consequence.manifestSold",
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
            consequence: "content:consequence.manifestSold",
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
  {
    id: "huntressReposted",
    weight: 22,
    speaker: "bountyHuntress",
    requires: { sector: [3, 4], flags: { all: ["hunterPaid"] } },
    text: "content:events.huntressReposted.text",
    dialogue: [
      { who: "bountyHuntress", line: "content:events.huntressReposted.dia.l1" },
      { who: "echo", line: "content:events.huntressReposted.dia.l2" },
      { who: "bountyHuntress", line: "content:events.huntressReposted.dia.l3" },
    ],
    options: [
      {
        id: "hireHer",
        label: "content:events.huntressReposted.opt.hireHer",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.huntressReposted.out.hireHer",
            weight: 3,
            effects: [
              { k: "scrap", n: -40 },
              { k: "flag", key: "hunterAllied" },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 },
            ],
            consequence: "content:consequence.hunterContractPulled",
          },
          {
            text: "content:events.huntressReposted.out.hireHerRoute",
            weight: 1,
            effects: [
              { k: "scrap", n: -40 },
              { k: "flag", key: "hunterAllied" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.hunterContractPulled",
          },
        ],
      },
      {
        id: "meetHim",
        label: "content:events.huntressReposted.opt.meetHim",
        outcomes: [
          {
            text: "content:events.huntressReposted.out.meetHim",
            weight: 2,
            effects: [
              { k: "flag", key: "hunterAllied" },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 1 },
            ],
            consequence: "content:consequence.hunterSecondHunter",
            follow: { enemyIds: ["bailiff"], scrap: 60, loot: { rarity: "rare" } },
          },
          {
            text: "content:events.huntressReposted.out.meetHimLate",
            weight: 1,
            effects: [
              { k: "flag", key: "hunterAllied" },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.hunterSecondHunter",
            follow: { enemyIds: ["bailiff"], scrap: 60, loot: { rarity: "rare" } },
          },
        ],
      },
      {
        id: "sellHer",
        label: "content:events.huntressReposted.opt.sellHer",
        outcomes: [
          {
            text: "content:events.huntressReposted.out.sellHer",
            weight: 2,
            effects: [
              { k: "scrap", n: 70 },
              { k: "axis", n: -2 },
              { k: "flag", key: "hunterBetrayed" },
            ],
            consequence: "content:consequence.hunterBetrayed",
          },
          {
            text: "content:events.huntressReposted.out.sellHerCheated",
            weight: 1,
            effects: [
              { k: "scrap", n: 35 },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
              { k: "flag", key: "hunterBetrayed" },
            ],
            consequence: "content:consequence.hunterBetrayed",
          },
        ],
      },
    ],
  },
  {
    id: "velaLathe",
    weight: 20,
    speaker: "coreCutter",
    requires: { sector: [1, 2] },
    text: "content:events.velaLathe.text",
    dialogue: [
      { who: "echo", line: "content:events.velaLathe.dia.l1" },
      { who: "coreCutter", line: "content:events.velaLathe.dia.l2" },
      { who: "echo", line: "content:events.velaLathe.dia.l3" },
    ],
    options: [
      {
        id: "tow",
        label: "content:events.velaLathe.opt.tow",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.velaLathe.out.towPass",
            effects: [
              { k: "flag", key: "velaTowed" },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.velaTowed",
          },
        ],
        onFail: [
          {
            text: "content:events.velaLathe.out.towFail",
            effects: [
              { k: "flag", key: "velaTowed" },
              { k: "hull", n: -5 },
            ],
            consequence: "content:consequence.velaTowed",
          },
        ],
      },
      {
        id: "billHer",
        label: "content:events.velaLathe.opt.billHer",
        outcomes: [
          {
            text: "content:events.velaLathe.out.billHer",
            weight: 2,
            effects: [
              { k: "scrap", n: 35 },
              { k: "flag", key: "velaBilled" },
            ],
            consequence: "content:consequence.velaBilled",
          },
          {
            text: "content:events.velaLathe.out.billHerRust",
            weight: 1,
            effects: [
              { k: "scrap", n: 15 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "flag", key: "velaBilled" },
            ],
            consequence: "content:consequence.velaBilled",
          },
        ],
      },
      {
        id: "strip",
        label: "content:events.velaLathe.opt.strip",
        outcomes: [
          {
            text: "content:events.velaLathe.out.strip",
            weight: 2,
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: -1 },
              { k: "flag", key: "velaRobbed" },
            ],
            consequence: "content:consequence.velaRobbed",
          },
          {
            text: "content:events.velaLathe.out.stripChuck",
            weight: 1,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "hull", n: -5 },
              { k: "axis", n: -1 },
              { k: "flag", key: "velaRobbed" },
            ],
            consequence: "content:consequence.velaRobbed",
          },
        ],
      },
    ],
  },
  {
    id: "velaCommission",
    weight: 22,
    speaker: "coreCutter",
    requires: {
      sector: [2, 3],
      flags: { any: ["velaTowed", "velaBilled"] },
    },
    text: "content:events.velaCommission.text",
    dialogue: [
      { who: "coreCutter", line: "content:events.velaCommission.dia.l1" },
      { who: "echo", line: "content:events.velaCommission.dia.l2" },
      { who: "coreCutter", line: "content:events.velaCommission.dia.l3" },
    ],
    options: [
      {
        id: "commission",
        label: "content:events.velaCommission.opt.commission",
        requires: { req: "scrap", n: 45 },
        outcomes: [
          {
            text: "content:events.velaCommission.out.commission",
            weight: 3,
            effects: [
              { k: "scrap", n: -45 },
              { k: "flag", key: "velaCommissioned" },
            ],
            consequence: "content:consequence.velaCommissioned",
          },
          {
            text: "content:events.velaCommission.out.commissionOffcut",
            weight: 1,
            effects: [
              { k: "scrap", n: -45 },
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "velaCommissioned" },
            ],
            consequence: "content:consequence.velaCommissioned",
          },
        ],
      },
      {
        id: "steadyCore",
        label: "content:events.velaCommission.opt.steadyCore",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.velaCommission.out.steadyPass",
            effects: [
              { k: "flag", key: "velaCommissioned" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.velaCommissioned",
          },
        ],
        onFail: [
          {
            text: "content:events.velaCommission.out.steadyFail",
            effects: [
              { k: "flag", key: "velaCommissioned" },
              { k: "hull", n: -7 },
            ],
            consequence: "content:consequence.velaCommissioned",
          },
        ],
      },
      {
        id: "quickCut",
        label: "content:events.velaCommission.opt.quickCut",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.velaCommission.out.quickCut",
            weight: 2,
            effects: [
              { k: "scrap", n: -30 },
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "velaQuickCut" },
            ],
            consequence: "content:consequence.velaQuickCut",
          },
          {
            text: "content:events.velaCommission.out.quickCutFine",
            weight: 1,
            effects: [
              { k: "scrap", n: -30 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "velaQuickCut" },
            ],
            consequence: "content:consequence.velaQuickCut",
          },
        ],
      },
      {
        id: "callTheTow",
        label: "content:events.velaCommission.opt.callTheTow",
        requires: [
          { req: "flag", key: "velaTowed" },
          { req: "scrap", n: 20 },
        ],
        outcomes: [
          {
            text: "content:events.velaCommission.out.callTheTow",
            weight: 3,
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "velaCommissioned" },
            ],
            consequence: "content:consequence.velaCommissioned",
          },
          {
            text: "content:events.velaCommission.out.callTheTowHalf",
            weight: 1,
            effects: [
              { k: "scrap", n: -20 },
              { k: "flag", key: "velaCommissioned" },
            ],
            consequence: "content:consequence.velaCommissioned",
          },
        ],
      },
    ],
  },
  {
    id: "velaSanctuary",
    weight: 22,
    speaker: "coreCutter",
    requires: {
      sector: [3, 4],
      flags: { any: ["velaCommissioned", "velaQuickCut"] },
    },
    text: "content:events.velaSanctuary.text",
    dialogue: [
      { who: "narration", line: "content:events.velaSanctuary.dia.l1" },
      { who: "echo", line: "content:events.velaSanctuary.dia.l2" },
      { who: "coreCutter", line: "content:events.velaSanctuary.dia.l3" },
    ],
    options: [
      {
        id: "standWithHer",
        label: "content:events.velaSanctuary.opt.standWithHer",
        outcomes: [
          {
            text: "content:events.velaSanctuary.out.standWithHer",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "velaSheltered" },
            ],
            consequence: "content:consequence.velaSheltered",
            follow: { enemyIds: ["choirAcolyte", "choirAcolyte"], scrap: 45 },
          },
          {
            text: "content:events.velaSanctuary.out.standWithHerCantor",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "velaSheltered" },
            ],
            consequence: "content:consequence.velaSheltered",
            follow: {
              enemyIds: ["choirCantor"],
              scrap: 70,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "smuggleHer",
        label: "content:events.velaSanctuary.opt.smuggleHer",
        check: { dice: 3, pick: "sum", target: 13 },
        onPass: [
          {
            text: "content:events.velaSanctuary.out.smugglePass",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
              { k: "flag", key: "velaSheltered" },
            ],
            consequence: "content:consequence.velaSmuggled",
          },
        ],
        onFail: [
          {
            text: "content:events.velaSanctuary.out.smuggleFail",
            effects: [
              { k: "hull", n: -8 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
              { k: "flag", key: "velaSheltered" },
            ],
            consequence: "content:consequence.velaSmuggled",
          },
        ],
      },
      {
        id: "sellHer",
        label: "content:events.velaSanctuary.opt.sellHer",
        outcomes: [
          {
            text: "content:events.velaSanctuary.out.sellHer",
            weight: 2,
            effects: [
              { k: "scrap", n: 75 },
              { k: "axis", n: -2 },
              { k: "flag", key: "velaSold" },
            ],
            consequence: "content:consequence.velaSold",
          },
          {
            text: "content:events.velaSanctuary.out.sellHerCore",
            weight: 1,
            effects: [
              { k: "scrap", n: 20 },
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 },
              { k: "flag", key: "velaSold" },
            ],
            consequence: "content:consequence.velaSold",
          },
        ],
      },
    ],
  },
  {
    id: "velaMasterwork",
    weight: 24,
    speaker: "coreCutter",
    requires: { sector: [4, 5], flags: { all: ["velaSheltered"] } },
    text: "content:events.velaMasterwork.text",
    dialogue: [
      { who: "echo", line: "content:events.velaMasterwork.dia.l1" },
      { who: "coreCutter", line: "content:events.velaMasterwork.dia.l2" },
      { who: "coreCutter", line: "content:events.velaMasterwork.dia.l3" },
    ],
    options: [
      {
        id: "claimCommission",
        label: "content:events.velaMasterwork.opt.claimCommission",
        requires: { req: "flag", key: "velaCommissioned" },
        outcomes: [
          {
            text: "content:events.velaMasterwork.out.claimCommission",
            weight: 3,
            effects: [
              { k: "loot", rarity: "legendary" },
              { k: "flag", key: "velaCut" },
            ],
            consequence: "content:consequence.velaMasterwork",
          },
          {
            text: "content:events.velaMasterwork.out.claimCommissionSplit",
            weight: 1,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "scrap", n: 50 },
              { k: "flag", key: "velaCut" },
            ],
            consequence: "content:consequence.velaMasterwork",
          },
        ],
      },
      {
        id: "takeShard",
        label: "content:events.velaMasterwork.opt.takeShard",
        outcomes: [
          {
            text: "content:events.velaMasterwork.out.takeShard",
            weight: 2,
            effects: [
              { k: "shards", n: 12 },
              { k: "axis", n: -2 },
              { k: "flag", key: "velaCut" },
            ],
            consequence: "content:consequence.velaShard",
          },
          {
            text: "content:events.velaMasterwork.out.takeShardHull",
            weight: 1,
            effects: [
              { k: "hullMax", n: 8 },
              { k: "axis", n: -2 },
              { k: "flag", key: "velaCut" },
            ],
            consequence: "content:consequence.velaShard",
          },
        ],
      },
      {
        id: "leaveIt",
        label: "content:events.velaMasterwork.opt.leaveIt",
        outcomes: [
          {
            text: "content:events.velaMasterwork.out.leaveIt",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "axis", n: 2 },
              { k: "flag", key: "velaCut" },
            ],
            consequence: "content:consequence.velaKept",
          },
          {
            text: "content:events.velaMasterwork.out.leaveItWord",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "shipyardDiscount", n: 40 },
              { k: "axis", n: 2 },
              { k: "flag", key: "velaCut" },
            ],
            consequence: "content:consequence.velaKept",
          },
        ],
      },
    ],
  },
  {
    id: "velaReckoning",
    weight: 22,
    speaker: "coreCutter",
    requires: {
      sector: [4, 5],
      flags: { any: ["velaSold", "velaRobbed"] },
    },
    text: "content:events.velaReckoning.text",
    dialogue: [
      { who: "echo", line: "content:events.velaReckoning.dia.l1" },
      { who: "coreCutter", line: "content:events.velaReckoning.dia.l2" },
      { who: "narration", line: "content:events.velaReckoning.dia.l3" },
    ],
    options: [
      {
        id: "buyHerOut",
        label: "content:events.velaReckoning.opt.buyHerOut",
        requires: { req: "scrap", n: 70 },
        outcomes: [
          {
            text: "content:events.velaReckoning.out.buyHerOut",
            weight: 2,
            effects: [
              { k: "scrap", n: -70 },
              { k: "axis", n: 2 },
              { k: "flag", key: "velaReckoned" },
            ],
            consequence: "content:consequence.velaBoughtOut",
          },
          {
            text: "content:events.velaReckoning.out.buyHerOutCore",
            weight: 1,
            effects: [
              { k: "scrap", n: -70 },
              { k: "axis", n: 2 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "velaReckoned" },
            ],
            consequence: "content:consequence.velaBoughtOut",
          },
        ],
      },
      {
        id: "boardIt",
        label: "content:events.velaReckoning.opt.boardIt",
        outcomes: [
          {
            text: "content:events.velaReckoning.out.boardIt",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "velaReckoned" },
            ],
            consequence: "content:consequence.velaBoarded",
            follow: { enemyIds: ["reliquary", "choirAcolyte"], scrap: 50 },
          },
          {
            text: "content:events.velaReckoning.out.boardItCantor",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "velaReckoned" },
            ],
            consequence: "content:consequence.velaBoarded",
            follow: {
              enemyIds: ["reliquary", "hymnCantor"],
              scrap: 60,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "takeHerWork",
        label: "content:events.velaReckoning.opt.takeHerWork",
        outcomes: [
          {
            text: "content:events.velaReckoning.out.takeHerWork",
            weight: 2,
            effects: [
              { k: "loot", rarity: "legendary" },
              { k: "hullMax", n: -5 },
              { k: "axis", n: -3 },
              { k: "flag", key: "velaReckoned" },
            ],
            consequence: "content:consequence.velaAbandoned",
          },
          {
            text: "content:events.velaReckoning.out.takeHerWorkLesser",
            weight: 1,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "tide", n: 1 },
              { k: "axis", n: -2 },
              { k: "flag", key: "velaReckoned" },
            ],
            consequence: "content:consequence.velaAbandoned",
          },
        ],
      },
    ],
  },
  {
    id: "inesHail",
    weight: 22,
    speaker: "ines",
    requires: { sector: [2, 3] },
    text: "content:events.inesHail.text",
    dialogue: [
      { who: "ines", line: "content:events.inesHail.dia.l1" },
      { who: "echo", line: "content:events.inesHail.dia.l2" },
      { who: "ines", line: "content:events.inesHail.dia.l3" },
    ],
    options: [
      {
        id: "tellTruth",
        label: "content:events.inesHail.opt.tellTruth",
        outcomes: [
          {
            text: "content:events.inesHail.out.truth",
            weight: 2,
            effects: [
              { k: "flag", key: "inesTruth" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.inesTruth",
          },
          {
            text: "content:events.inesHail.out.truthHard",
            weight: 1,
            effects: [
              { k: "flag", key: "inesTruth" },
              { k: "scrap", n: 30 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.inesTruth",
          },
        ],
      },
      {
        id: "tellLie",
        label: "content:events.inesHail.opt.tellLie",
        outcomes: [
          {
            text: "content:events.inesHail.out.lie",
            weight: 2,
            effects: [
              { k: "flag", key: "inesLied" },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
            consequence: "content:consequence.inesLied",
          },
          {
            text: "content:events.inesHail.out.lieHeard",
            weight: 1,
            effects: [
              { k: "flag", key: "inesLied" },
              { k: "battleMod", mod: "startCharge", n: 2, battles: 2 },
            ],
            consequence: "content:consequence.inesLied",
          },
        ],
      },
      {
        id: "sellHail",
        label: "content:events.inesHail.opt.sellHail",
        outcomes: [
          {
            text: "content:events.inesHail.out.sold",
            weight: 2,
            effects: [
              { k: "flag", key: "inesHailSold" },
              { k: "scrap", n: 55 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.inesHailSold",
          },
          {
            text: "content:events.inesHail.out.soldCheap",
            weight: 1,
            effects: [
              { k: "flag", key: "inesHailSold" },
              { k: "scrap", n: 25 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.inesHailSold",
          },
        ],
      },
    ],
  },
  {
    id: "inesMarker",
    weight: 22,
    speaker: "ines",
    requires: {
      sector: [3, 4],
      flags: { any: ["inesTruth", "inesLied", "inesHailSold"] },
    },
    text: "content:events.inesMarker.text",
    dialogue: [
      { who: "ines", line: "content:events.inesMarker.dia.l1" },
      { who: "echo", line: "content:events.inesMarker.dia.l2" },
      { who: "ines", line: "content:events.inesMarker.dia.l3" },
    ],
    options: [
      {
        id: "holdTone",
        label: "content:events.inesMarker.opt.holdTone",
        outcomes: [
          {
            text: "content:events.inesMarker.out.holdTone",
            weight: 2,
            effects: [
              { k: "flag", key: "inesMarked" },
              { k: "hull", n: -6 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.inesMarked",
          },
          {
            text: "content:events.inesMarker.out.holdToneHard",
            weight: 1,
            effects: [
              { k: "flag", key: "inesMarked" },
              { k: "hull", n: -9 },
              { k: "tide", n: 1 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.inesMarked",
          },
        ],
      },
      {
        id: "talkHerIn",
        label: "content:events.inesMarker.opt.talkHerIn",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.inesMarker.out.talkPass",
            effects: [
              { k: "flag", key: "inesMarked" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.inesMarked",
          },
        ],
        onFail: [
          {
            text: "content:events.inesMarker.out.talkFail",
            effects: [
              { k: "flag", key: "inesMarked" },
              { k: "hull", n: -4 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.inesMarked",
          },
        ],
      },
      {
        id: "sellVector",
        label: "content:events.inesMarker.opt.sellVector",
        outcomes: [
          {
            text: "content:events.inesMarker.out.sold",
            weight: 2,
            effects: [
              { k: "flag", key: "inesBaited" },
              { k: "scrap", n: 65 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.inesBaited",
          },
          {
            text: "content:events.inesMarker.out.soldSour",
            weight: 1,
            effects: [
              { k: "flag", key: "inesBaited" },
              { k: "scrap", n: 30 },
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.inesBaited",
          },
        ],
      },
    ],
  },
  {
    id: "inesTow",
    weight: 22,
    speaker: "ines",
    requires: {
      sector: [4, 5],
      flags: { any: ["inesMarked", "inesBaited"] },
    },
    text: "content:events.inesTow.text",
    dialogue: [
      { who: "narration", line: "content:events.inesTow.dia.l1" },
      { who: "ines", line: "content:events.inesTow.dia.l2" },
      { who: "echo", line: "content:events.inesTow.dia.l3" },
    ],
    options: [
      {
        id: "towHer",
        label: "content:events.inesTow.opt.towHer",
        check: { dice: 3, pick: "sum", target: 14 },
        onPass: [
          {
            text: "content:events.inesTow.out.towPass",
            effects: [
              { k: "flag", key: "inesPulled" },
              { k: "hull", n: -4 },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.inesPulled",
          },
        ],
        onFail: [
          {
            text: "content:events.inesTow.out.towFail",
            effects: [
              { k: "flag", key: "inesFell" },
              { k: "hull", n: -10 },
            ],
            consequence: "content:consequence.inesFell",
          },
        ],
      },
      {
        id: "letHerFall",
        label: "content:events.inesTow.opt.letHerFall",
        outcomes: [
          {
            text: "content:events.inesTow.out.fall",
            weight: 2,
            effects: [
              { k: "flag", key: "inesFell" },
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.inesFell",
          },
          {
            text: "content:events.inesTow.out.fallRare",
            weight: 1,
            effects: [
              { k: "flag", key: "inesFell" },
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.inesFell",
          },
        ],
      },
      {
        id: "stripScout",
        label: "content:events.inesTow.opt.stripScout",
        outcomes: [
          {
            text: "content:events.inesTow.out.strip",
            weight: 2,
            effects: [
              { k: "flag", key: "inesStripped" },
              { k: "loot", rarity: "rare" },
              { k: "scrap", n: 45 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.inesStripped",
          },
          {
            text: "content:events.inesTow.out.stripShot",
            weight: 1,
            effects: [
              { k: "flag", key: "inesStripped" },
              { k: "loot", rarity: "rare" },
              { k: "hull", n: -10 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.inesStripped",
          },
        ],
      },
      {
        id: "shieldHer",
        label: "content:events.inesTow.opt.shieldHer",
        requires: { req: "flag", key: "inesBaited" },
        outcomes: [
          {
            text: "content:events.inesTow.out.shield",
            weight: 2,
            effects: [
              { k: "flag", key: "inesPulled" },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.inesShielded",
            follow: { enemyIds: ["zealotRam", "choirAcolyte"], scrap: 40 },
          },
          {
            text: "content:events.inesTow.out.shieldFold",
            weight: 1,
            effects: [
              { k: "flag", key: "inesPulled" },
              { k: "axis", n: 1 },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.inesShielded",
          },
        ],
      },
    ],
  },
  {
    id: "inesLanding",
    weight: 20,
    speaker: "ines",
    requires: {
      sector: [5, 6],
      flags: { any: ["inesPulled", "inesFell"] },
    },
    text: "content:events.inesLanding.text",
    dialogue: [
      { who: "ines", line: "content:events.inesLanding.dia.l1" },
      { who: "echo", line: "content:events.inesLanding.dia.l2" },
      { who: "ines", line: "content:events.inesLanding.dia.l3" },
      { who: "echo", line: "content:events.inesLanding.dia.l4" },
    ],
    options: [
      {
        id: "flyAhead",
        label: "content:events.inesLanding.opt.flyAhead",
        outcomes: [
          {
            text: "content:events.inesLanding.out.ahead",
            weight: 2,
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "nodeMod", mod: "sectorReveal", n: 1 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.inesLanded",
          },
          {
            text: "content:events.inesLanding.out.aheadFar",
            weight: 1,
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "nodeMod", mod: "sectorReveal", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.inesLanded",
          },
        ],
      },
      {
        id: "flyWing",
        label: "content:events.inesLanding.opt.flyWing",
        outcomes: [
          {
            text: "content:events.inesLanding.out.wing",
            weight: 2,
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 3 },
            ],
            consequence: "content:consequence.inesLanded",
          },
          {
            text: "content:events.inesLanding.out.wingPatch",
            weight: 1,
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "battleMod", mod: "startCharge", n: 2, battles: 2 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
            consequence: "content:consequence.inesLanded",
          },
        ],
      },
      {
        id: "readSurvey",
        label: "content:events.inesLanding.opt.readSurvey",
        check: { dice: 2, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.inesLanding.out.surveyPass",
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "shards", n: 10 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.inesSurvey",
          },
        ],
        onFail: [
          {
            text: "content:events.inesLanding.out.surveyFail",
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.inesLanded",
          },
        ],
      },
      {
        id: "confess",
        label: "content:events.inesLanding.opt.confess",
        requires: { req: "flag", key: "inesLied" },
        outcomes: [
          {
            text: "content:events.inesLanding.out.confess",
            weight: 2,
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "hullMax", n: 6 },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.inesForgave",
          },
          {
            text: "content:events.inesLanding.out.confessCold",
            weight: 1,
            effects: [
              { k: "flag", key: "inesLanded" },
              { k: "hullMax", n: 4 },
            ],
            consequence: "content:consequence.inesForgave",
          },
        ],
      },
    ],
  },
  {
    id: "inesReckoning",
    weight: 20,
    speaker: "ines",
    requires: { sector: [5, 6], flags: { all: ["inesStripped"] } },
    text: "content:events.inesReckoning.text",
    dialogue: [
      { who: "ines", line: "content:events.inesReckoning.dia.l1" },
      { who: "echo", line: "content:events.inesReckoning.dia.l2" },
      { who: "ines", line: "content:events.inesReckoning.dia.l3" },
    ],
    options: [
      {
        id: "payHer",
        label: "content:events.inesReckoning.opt.payHer",
        requires: { req: "scrap", n: 60 },
        outcomes: [
          {
            text: "content:events.inesReckoning.out.paid",
            weight: 2,
            effects: [
              { k: "flag", key: "inesReckoned" },
              { k: "scrap", n: -60 },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.inesPaid",
          },
          {
            text: "content:events.inesReckoning.out.paidWarm",
            weight: 1,
            effects: [
              { k: "flag", key: "inesReckoned" },
              { k: "scrap", n: -60 },
              { k: "axis", n: 2 },
              { k: "hull", n: 8 },
            ],
            consequence: "content:consequence.inesPaid",
          },
        ],
      },
      {
        id: "fightHer",
        label: "content:events.inesReckoning.opt.fightHer",
        outcomes: [
          {
            text: "content:events.inesReckoning.out.fight",
            weight: 2,
            effects: [
              { k: "flag", key: "inesReckoned" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.inesFought",
            follow: {
              enemyIds: ["retrocausalMote", "probabilityKnot"],
              scrap: 60,
              loot: { rarity: "rare" },
            },
          },
          {
            text: "content:events.inesReckoning.out.shot",
            weight: 1,
            effects: [
              { k: "flag", key: "inesReckoned" },
              { k: "hull", n: -12 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.inesFought",
          },
        ],
      },
      {
        id: "outrunHer",
        label: "content:events.inesReckoning.opt.outrunHer",
        check: { dice: 2, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.inesReckoning.out.outrunPass",
            effects: [
              { k: "flag", key: "inesReckoned" },
              { k: "scrap", n: 35 },
            ],
            consequence: "content:consequence.inesOutran",
          },
        ],
        onFail: [
          {
            text: "content:events.inesReckoning.out.outrunFail",
            effects: [
              { k: "flag", key: "inesReckoned" },
              { k: "hull", n: -12 },
            ],
            consequence: "content:consequence.inesFought",
          },
        ],
      },
    ],
  },
];
