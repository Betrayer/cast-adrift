import type { EventDef } from "@/types/events";

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
      {
        id: "answer",
        label: "content:events.keeperEcho.opt.answer",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.keeperEcho.out.answerPass",
            effects: [
              { k: "axis", n: 1 },
              { k: "tide", n: -1 },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
        ],
        onFail: [
          {
            text: "content:events.keeperEcho.out.answerFail",
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
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
      {
        id: "flyPoint",
        label: "content:events.yusufLane.opt.flyPoint",
        check: { dice: 2, pick: "sum", target: 10 },
        onPass: [
          {
            text: "content:events.yusufLane.out.flyPointPass",
            effects: [
              { k: "scrap", n: 40 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
            consequence: "content:consequence.fleetShared",
          },
        ],
        onFail: [
          {
            text: "content:events.yusufLane.out.flyPointFail",
            effects: [
              { k: "hull", n: -8 },
              { k: "scrap", n: 25 },
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
      {
        id: "burnPast",
        label: "content:events.preacherGrudge.opt.burnPast",
        outcomes: [
          {
            text: "content:events.preacherGrudge.out.burnPast",
            weight: 2,
            effects: [
              { k: "tide", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.refusedChoir",
          },
          {
            text: "content:events.preacherGrudge.out.burnPastEscort",
            weight: 1,
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.refusedChoir",
            follow: { enemyIds: ["choirAcolyte", "choirAcolyte"], scrap: 40 },
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
      {
        id: "lendHands",
        label: "content:events.brokenBeaconWake.opt.lendHands",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.brokenBeaconWake.out.lendPass",
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: 1 },
              { k: "flag", key: "beaconRebuilt" },
            ],
            consequence: "content:consequence.beaconBroken",
          },
        ],
        onFail: [
          {
            text: "content:events.brokenBeaconWake.out.lendFail",
            effects: [
              { k: "hull", n: -6 },
              { k: "axis", n: 1 },
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
              { k: "officer", id: "breaker" },
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
      {
        id: "stepThrough",
        label: "content:events.riftMirror.opt.stepThrough",
        requires: { req: "flag", key: "mirrorBound" },
        outcomes: [
          {
            text: "content:events.riftMirror.out.stepThrough",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.mirrorBound",
          },
          {
            text: "content:events.riftMirror.out.stepThroughToll",
            weight: 1,
            effects: [
              { k: "hullMax", n: -4 },
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.mirrorBound",
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
      {
        id: "haul",
        label: "content:events.scavRefit.opt.haul",
        requires: { req: "cargo", id: "choirContraband" },
        outcomes: [
          {
            text: "content:events.scavRefit.out.haul",
            effects: [{ k: "cargo", id: "choirContraband" }],
            consequence: "content:consequence.cargoTaken",
          },
        ],
      },
    ],
  },
  {
    id: "maraLedger",
    weight: 20,
    speaker: "mara",
    requires: { sector: [2, 3, 4, 5], flags: { all: ["maraFriend"] } },
    text: "content:events.maraLedger.text",
    options: [
      {
        id: "takeCredit",
        label: "content:events.maraLedger.opt.takeCredit",
        outcomes: [
          {
            text: "content:events.maraLedger.out.takeCredit",
            effects: [
              { k: "scrap", n: 60 },
              { k: "flag", key: "maraDebt" },
            ],
            consequence: "content:consequence.maraFriend",
          },
        ],
      },
      {
        id: "takeTip",
        label: "content:events.maraLedger.opt.takeTip",
        outcomes: [
          {
            text: "content:events.maraLedger.out.takeTip",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.maraFriend",
          },
        ],
      },
    ],
  },
  {
    id: "maraCollector",
    weight: 20,
    speaker: "mara",
    requires: { sector: [3, 4, 5], flags: { all: ["maraGrudge"] } },
    text: "content:events.maraCollector.text",
    options: [
      {
        id: "callFavour",
        label: "content:events.maraCollector.opt.callFavour",
        requires: { req: "flag", key: "favorHeld" },
        outcomes: [
          {
            text: "content:events.maraCollector.out.callFavour",
            effects: [
              { k: "flag", key: "maraDebt" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
            ],
            consequence: "content:consequence.favorHeld",
          },
        ],
      },
      {
        id: "settleDebt",
        label: "content:events.maraCollector.opt.settleDebt",
        requires: { req: "scrap", n: 45 },
        outcomes: [
          {
            text: "content:events.maraCollector.out.settleDebt",
            effects: [
              { k: "scrap", n: -45 },
              { k: "flag", key: "maraFriend" },
            ],
            consequence: "content:consequence.maraGrudge",
          },
        ],
      },
      {
        id: "outrun",
        label: "content:events.maraCollector.opt.outrun",
        outcomes: [
          {
            text: "content:events.maraCollector.out.outrun",
            effects: [{ k: "battleMod", mod: "enemyPlus", n: 1, battles: 3 }],
            consequence: "content:consequence.maraGrudge",
          },
        ],
      },
    ],
  },
  {
    id: "hymnResidue",
    weight: 16,
    requires: { sector: [4, 5], flags: { all: ["hymnJoined"] } },
    text: "content:events.hymnResidue.text",
    options: [
      {
        id: "playCopy",
        label: "content:events.hymnResidue.opt.playCopy",
        requires: { req: "flag", key: "hymnCopied" },
        outcomes: [
          {
            text: "content:events.hymnResidue.out.playCopy",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "choirBetrayed" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.choirBetrayed",
          },
        ],
      },
      {
        id: "keepHumming",
        label: "content:events.hymnResidue.opt.keepHumming",
        outcomes: [
          {
            text: "content:events.hymnResidue.out.keepHumming",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 6, battles: 4 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.hymnJoined",
          },
        ],
      },
      {
        id: "scourIt",
        label: "content:events.hymnResidue.opt.scourIt",
        outcomes: [
          {
            text: "content:events.hymnResidue.out.scourIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -4 },
            ],
            consequence: "content:consequence.hymnJoined",
          },
        ],
      },
    ],
  },
  {
    id: "jammedChoir",
    weight: 16,
    requires: { sector: [4, 5], flags: { all: ["hymnJammed"] } },
    text: "content:events.jammedChoir.text",
    options: [
      {
        id: "pressAdvantage",
        label: "content:events.jammedChoir.opt.pressAdvantage",
        outcomes: [
          {
            text: "content:events.jammedChoir.out.pressAdvantage",
            effects: [{ k: "scrap", n: 45 }],
            consequence: "content:consequence.hymnJammed",
            follow: { enemyIds: ["choirCantor"], scrap: 55, loot: { rarity: "rare" } },
          },
        ],
      },
      {
        id: "slipAway",
        label: "content:events.jammedChoir.opt.slipAway",
        outcomes: [
          {
            text: "content:events.jammedChoir.out.slipAway",
            effects: [
              { k: "tide", n: -1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.hymnJammed",
          },
        ],
      },
    ],
  },
  {
    id: "clanFerry",
    weight: 16,
    speaker: "yusuf",
    requires: { sector: [4, 5], flags: { all: ["clanPaid"] } },
    text: "content:events.clanFerry.text",
    options: [
      {
        id: "rideAlong",
        label: "content:events.clanFerry.opt.rideAlong",
        outcomes: [
          {
            text: "content:events.clanFerry.out.rideAlong",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "hull", n: 6 },
            ],
            consequence: "content:consequence.clanPaid",
          },
        ],
      },
      {
        id: "buyLane",
        label: "content:events.clanFerry.opt.buyLane",
        outcomes: [
          {
            text: "content:events.clanFerry.out.buyLane",
            effects: [
              { k: "nodeMod", mod: "shipyardDiscount", n: 40 },
              { k: "scrap", n: 20 },
            ],
            consequence: "content:consequence.clanPaid",
          },
        ],
      },
      {
        id: "carryMail",
        label: "content:events.clanFerry.opt.carryMail",
        outcomes: [
          {
            text: "content:events.clanFerry.out.carryMail",
            weight: 3,
            effects: [
              { k: "scrap", n: 45 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.clanPaid",
          },
          {
            text: "content:events.clanFerry.out.carryMailTicking",
            weight: 1,
            effects: [
              { k: "scrap", n: 20 },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.clanPaid",
          },
        ],
      },
    ],
  },
  {
    id: "darkRelay",
    weight: 16,
    speaker: "beaconKeeper",
    requires: { sector: [3, 4, 5], flags: { all: ["keeperSlighted"] } },
    text: "content:events.darkRelay.text",
    options: [
      {
        id: "confess",
        label: "content:events.darkRelay.opt.confess",
        outcomes: [
          {
            text: "content:events.darkRelay.out.confess",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "keeperTrust" },
              { k: "hull", n: -4 },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
        ],
      },
      {
        id: "jamHim",
        label: "content:events.darkRelay.opt.jamHim",
        outcomes: [
          {
            text: "content:events.darkRelay.out.jamHim",
            effects: [
              { k: "axis", n: -2 },
              { k: "scrap", n: 45 },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
        ],
      },
    ],
  },
  {
    id: "emptySuit",
    weight: 22,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.emptySuit.text",
    options: [
      {
        id: "matchChart",
        label: "content:events.emptySuit.opt.matchChart",
        requires: { req: "flag", key: "quietCharted" },
        outcomes: [
          {
            text: "content:events.emptySuit.out.matchChart",
            effects: [
              { k: "scrap", n: 30 },
              { k: "flag", key: "turnWritten" },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
            consequence: "content:consequence.turnWritten",
          },
        ],
      },
      {
        id: "readLog",
        label: "content:events.emptySuit.opt.readLog",
        outcomes: [
          {
            text: "content:events.emptySuit.out.readLog",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "axis", n: 1 },
            ],
            codex: "driftGraves",
          },
        ],
      },
      {
        id: "stripSuit",
        label: "content:events.emptySuit.opt.stripSuit",
        outcomes: [
          {
            text: "content:events.emptySuit.out.stripSuit",
            effects: [
              { k: "scrap", n: 35 },
              { k: "axis", n: -1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "coldEngine",
    weight: 22,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.coldEngine.text",
    options: [
      {
        id: "warmIt",
        label: "content:events.coldEngine.opt.warmIt",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.coldEngine.out.warmIt",
            consequence: "content:consequence.coldEngineWorked",
            effects: [
              { k: "scrap", n: -20 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
      {
        id: "gutIt",
        label: "content:events.coldEngine.opt.gutIt",
        outcomes: [
          {
            text: "content:events.coldEngine.out.gutIt",
            consequence: "content:consequence.coldEngineWorked",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "hull", n: -3 },
            ],
          },
        ],
      },
      {
        id: "coax",
        label: "content:events.coldEngine.opt.coax",
        check: { dice: 2, pick: "lowest", target: 4, tierAtMost: 6 },
        onPass: [
          {
            text: "content:events.coldEngine.out.coaxPass",
            consequence: "content:consequence.coldEngineWorked",
            effects: [{ k: "battleMod", mod: "startCharge", n: 5, battles: 2 }],
          },
        ],
        onFail: [
          {
            text: "content:events.coldEngine.out.coaxFail",
            consequence: "content:consequence.coldEngineWorked",
            effects: [
              { k: "hull", n: -6 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "probabilityRain",
    weight: 20,
    requires: { sector: [3, 4, 5] },
    text: "content:events.probabilityRain.text",
    options: [
      {
        id: "standInIt",
        label: "content:events.probabilityRain.opt.standInIt",
        outcomes: [
          {
            text: "content:events.probabilityRain.out.standGood",
            consequence: "content:consequence.rainMet",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 },
            ],
            weight: 2,
          },
          {
            text: "content:events.probabilityRain.out.standBad",
            consequence: "content:consequence.rainMet",
            effects: [
              { k: "hull", n: -7 },
              { k: "axis", n: -1 },
            ],
            weight: 1,
          },
        ],
      },
      {
        id: "shelter",
        label: "content:events.probabilityRain.opt.shelter",
        outcomes: [
          {
            text: "content:events.probabilityRain.out.shelter",
            consequence: "content:consequence.rainMet",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "salvageCourt",
    weight: 20,
    requires: { sector: [2, 3, 4] },
    text: "content:events.salvageCourt.text",
    options: [
      {
        id: "arbitrate",
        label: "content:events.salvageCourt.opt.arbitrate",
        outcomes: [
          {
            text: "content:events.salvageCourt.out.arbitrate",
            effects: [
              { k: "axis", n: 2 },
              { k: "scrap", n: 25 },
              { k: "flag", key: "courtFair" },
            ],
          },
        ],
      },
      {
        id: "takeBoth",
        label: "content:events.salvageCourt.opt.takeBoth",
        outcomes: [
          {
            text: "content:events.salvageCourt.out.takeBoth",
            effects: [
              { k: "scrap", n: 65 },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "buyClaims",
        label: "content:events.salvageCourt.opt.buyClaims",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.salvageCourt.out.buyClaims",
            weight: 2,
            effects: [
              { k: "scrap", n: -40 },
              { k: "loot", rarity: "rare" },
            ],
          },
          {
            text: "content:events.salvageCourt.out.buyClaimsRig",
            weight: 1,
            effects: [
              { k: "scrap", n: -40 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "derelictLibrary",
    weight: 18,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.derelictLibrary.text",
    codex: "driftGraves",
    options: [
      {
        id: "readSome",
        label: "content:events.derelictLibrary.opt.readSome",
        outcomes: [
          {
            text: "content:events.derelictLibrary.out.readSome",
            weight: 3,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            codex: "driftGraves",
            consequence: "content:consequence.libraryRead",
          },
          {
            text: "content:events.derelictLibrary.out.readSomeGold",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.libraryRead",
          },
        ],
      },
      {
        id: "takeItAll",
        label: "content:events.derelictLibrary.opt.takeItAll",
        outcomes: [
          {
            text: "content:events.derelictLibrary.out.takeItAll",
            effects: [
              { k: "scrap", n: 55 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.librarySold",
          },
        ],
      },
      {
        id: "indexIt",
        label: "content:events.derelictLibrary.opt.indexIt",
        outcomes: [
          {
            text: "content:events.derelictLibrary.out.indexIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            consequence: "content:consequence.libraryRead",
          },
        ],
      },
    ],
  },
  {
    id: "theOtherSalvager",
    weight: 18,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.theOtherSalvager.text",
    options: [
      {
        id: "splitIt",
        label: "content:events.theOtherSalvager.opt.splitIt",
        outcomes: [
          {
            text: "content:events.theOtherSalvager.out.splitIt",
            weight: 3,
            effects: [
              { k: "scrap", n: 40 },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.salvagerSplit",
          },
          {
            text: "content:events.theOtherSalvager.out.splitItBetter",
            weight: 2,
            effects: [
              { k: "scrap", n: 25 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.salvagerSplit",
          },
        ],
      },
      {
        id: "raceThem",
        label: "content:events.theOtherSalvager.opt.raceThem",
        outcomes: [
          {
            text: "content:events.theOtherSalvager.out.raceThem",
            weight: 2,
            effects: [
              { k: "scrap", n: 70 },
            ],
            consequence: "content:consequence.salvagerBeaten",
          },
          {
            text: "content:events.theOtherSalvager.out.raceThemLose",
            weight: 2,
            effects: [
              { k: "scrap", n: 15 },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.salvagerBeaten",
          },
        ],
      },
      {
        id: "giveWay",
        label: "content:events.theOtherSalvager.opt.giveWay",
        outcomes: [
          {
            text: "content:events.theOtherSalvager.out.giveWay",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 1 }
            ],
            consequence: "content:consequence.salvagerYielded",
          },
        ],
      },
      {
        id: "haul",
        label: "content:events.theOtherSalvager.opt.haul",
        requires: { req: "cargo", id: "liveHold" },
        outcomes: [
          {
            text: "content:events.theOtherSalvager.out.haul",
            effects: [{ k: "cargo", id: "liveHold" }],
            consequence: "content:consequence.cargoTaken",
          },
        ],
      },
    ],
  },
  {
    id: "frozenBroadcast",
    weight: 17,
    requires: { sector: [3, 4, 5] },
    text: "content:events.frozenBroadcast.text",
    options: [
      {
        id: "answerIt",
        label: "content:events.frozenBroadcast.opt.answerIt",
        outcomes: [
          {
            text: "content:events.frozenBroadcast.out.answerIt",
            weight: 3,
            effects: [
              { k: "axis", n: 1 },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.distressAnswered",
          },
          {
            text: "content:events.frozenBroadcast.out.answerItLive",
            weight: 1,
            effects: [
              { k: "hullMax", n: 6 },
              { k: "axis", n: 2 }
            ],
            consequence: "content:consequence.distressAnswered",
          },
        ],
      },
      {
        id: "triangulate",
        label: "content:events.frozenBroadcast.opt.triangulate",
        outcomes: [
          {
            text: "content:events.frozenBroadcast.out.triangulate",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.distressTraced",
          },
        ],
      },
      {
        id: "killLoop",
        label: "content:events.frozenBroadcast.opt.killLoop",
        outcomes: [
          {
            text: "content:events.frozenBroadcast.out.killLoop",
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.distressCut",
          },
        ],
      },
    ],
  },
  {
    id: "debtorsHull",
    weight: 16,
    requires: { sector: [2, 3, 4], flags: {any: ["maraDebt", "clanPaid", "tugsPaid"]} },
    text: "content:events.debtorsHull.text",
    options: [
      {
        id: "clearOne",
        label: "content:events.debtorsHull.opt.clearOne",
        outcomes: [
          {
            text: "content:events.debtorsHull.out.clearOne",
            effects: [
              { k: "scrap", n: -35 },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 }
            ],
            consequence: "content:consequence.lienCleared",
          },
        ],
      },
      {
        id: "buyTheHull",
        label: "content:events.debtorsHull.opt.buyTheHull",
        requires: { req: "scrap", n: 60 },
        outcomes: [
          {
            text: "content:events.debtorsHull.out.buyTheHull",
            effects: [
              { k: "scrap", n: -60 },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.hullBought",
          },
        ],
      },
      {
        id: "buyTheDebt",
        label: "content:events.debtorsHull.opt.buyTheDebt",
        outcomes: [
          {
            text: "content:events.debtorsHull.out.buyTheDebt",
            effects: [
              { k: "scrap", n: -25 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 3 }
            ],
            consequence: "content:consequence.debtHeld",
          },
        ],
      },
    ],
  },
  {
    id: "noSignalDrift",
    weight: 16,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.noSignalDrift.text",
    options: [
      {
        id: "feelThrough",
        label: "content:events.noSignalDrift.opt.feelThrough",
        check: { dice: 2, pick: "sum", target: 9, school: "grey" },
        onPass: [
          {
            text: "content:events.noSignalDrift.out.feelPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.deadZoneCrossed",
          },
        ],
        onFail: [
          {
            text: "content:events.noSignalDrift.out.feelFail",
            effects: [
              { k: "hull", n: -8 },
            ],
            consequence: "content:consequence.deadZoneCrossed",
          },
        ],
      },
      {
        id: "goAround",
        label: "content:events.noSignalDrift.opt.goAround",
        outcomes: [
          {
            text: "content:events.noSignalDrift.out.goAround",
            effects: [
              { k: "tide", n: 1 },
              { k: "hull", n: 6 },
            ],
            consequence: "content:consequence.deadZoneAvoided",
          },
        ],
      },
      {
        id: "mapIt",
        label: "content:events.noSignalDrift.opt.mapIt",
        outcomes: [
          {
            text: "content:events.noSignalDrift.out.mapIt",
            effects: [
              { k: "scrap", n: 40 },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            consequence: "content:consequence.deadZoneMapped",
          },
        ],
      },
    ],
  },
  {
    id: "crewPetition",
    weight: 16,
    requires: { sector: [2, 3, 4, 5], flags: {any: ["crewSaved", "schoolHelped", "defectorSaved", "courierFreed"]} },
    text: "content:events.crewPetition.text",
    options: [
      {
        id: "readIt",
        label: "content:events.crewPetition.opt.readIt",
        outcomes: [
          {
            text: "content:events.crewPetition.out.readIt",
            effects: [
              { k: "hullMax", n: 6 },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.petitionRead",
          },
        ],
      },
      {
        id: "takeThem",
        label: "content:events.crewPetition.opt.takeThem",
        outcomes: [
          {
            text: "content:events.crewPetition.out.takeThem",
            effects: [
              { k: "hullMax", n: 12 },
              { k: "hull", n: -6 },
              { k: "officer", id: "welder" },
            ],
            consequence: "content:consequence.petitionAccepted",
          },
        ],
      },
      {
        id: "sendThemOn",
        label: "content:events.crewPetition.opt.sendThemOn",
        outcomes: [
          {
            text: "content:events.crewPetition.out.sendThemOn",
            effects: [
              { k: "scrap", n: -30 },
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 2 }
            ],
            consequence: "content:consequence.petitionRefused",
          },
        ],
      },
    ],
  },
  {
    id: "beaconWake",
    weight: 16,
    speaker: "beaconKeeper",
    requires: { sector: [3, 4, 5], flags: {any: ["beacon2", "beacon3", "beacon4"]} },
    text: "content:events.beaconWake.text",
    options: [
      {
        id: "letItSing",
        label: "content:events.beaconWake.opt.letItSing",
        outcomes: [
          {
            text: "content:events.beaconWake.out.letItSing",
            effects: [
              { k: "flag", key: "keeperTrust" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.beaconSinging",
          },
        ],
      },
      {
        id: "scrubName",
        label: "content:events.beaconWake.opt.scrubName",
        outcomes: [
          {
            text: "content:events.beaconWake.out.scrubName",
            effects: [
              { k: "scrap", n: 30 }
            ],
            consequence: "content:consequence.beaconScrubbed",
          },
        ],
      },
      {
        id: "boostIt",
        label: "content:events.beaconWake.opt.boostIt",
        outcomes: [
          {
            text: "content:events.beaconWake.out.boostIt",
            effects: [
              { k: "scrap", n: -30 },
              { k: "flag", key: "keeperTrust" },
              { k: "nodeMod", mod: "revealRows", n: 3 }
            ],
            consequence: "content:consequence.beaconBoosted",
          },
        ],
      },
    ],
  },
  {
    id: "interferenceBloom",
    weight: 15,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.interferenceBloom.text",
    options: [
      {
        id: "rideSmall",
        label: "content:events.interferenceBloom.opt.rideSmall",
        check: { dice: 3, pick: "lowest", target: 4, tierAtMost: 6 },
        onPass: [
          {
            text: "content:events.interferenceBloom.out.rideSmallPass",
            effects: [
              { k: "tide", n: -1 },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.bloomRidden",
          },
        ],
        onFail: [
          {
            text: "content:events.interferenceBloom.out.rideSmallFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "hull", n: -7 },
            ],
            consequence: "content:consequence.bloomRidden",
          },
        ],
      },
      {
        id: "waitItOut",
        label: "content:events.interferenceBloom.opt.waitItOut",
        outcomes: [
          {
            text: "content:events.interferenceBloom.out.waitItOut",
            effects: [
              { k: "hull", n: 10 },
              { k: "scrap", n: -20 },
            ],
            consequence: "content:consequence.bloomWaited",
          },
        ],
      },
      {
        id: "pushThrough",
        label: "content:events.interferenceBloom.opt.pushThrough",
        outcomes: [
          {
            text: "content:events.interferenceBloom.out.pushThrough",
            weight: 2,
            effects: [
              { k: "scrap", n: 55 },
            ],
            consequence: "content:consequence.bloomForced",
          },
          {
            text: "content:events.interferenceBloom.out.pushThroughBad",
            weight: 2,
            effects: [
              { k: "hull", n: -12 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.bloomForced",
          },
        ],
      },
    ],
  },
  {
    id: "lastLetter",
    weight: 15,
    requires: { sector: [3, 4, 5] },
    text: "content:events.lastLetter.text",
    options: [
      {
        id: "readLetter",
        label: "content:events.lastLetter.opt.readLetter",
        outcomes: [
          {
            text: "content:events.lastLetter.out.readLetter",
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 3 }
            ],
            consequence: "content:consequence.letterRead",
          },
        ],
      },
      {
        id: "relaunchIt",
        label: "content:events.lastLetter.opt.relaunchIt",
        outcomes: [
          {
            text: "content:events.lastLetter.out.relaunchIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 1 }
            ],
            consequence: "content:consequence.letterSent",
          },
        ],
      },
      {
        id: "keepCapsule",
        label: "content:events.lastLetter.opt.keepCapsule",
        outcomes: [
          {
            text: "content:events.lastLetter.out.keepCapsule",
            effects: [
              { k: "scrap", n: 50 },
            ],
            consequence: "content:consequence.letterKept",
          },
        ],
      },
    ],
  },
  {
    id: "scavengerWake",
    weight: 15,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.scavengerWake.text",
    options: [
      {
        id: "nameThem",
        label: "content:events.scavengerWake.opt.nameThem",
        outcomes: [
          {
            text: "content:events.scavengerWake.out.nameThem",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 4 }
            ],
            consequence: "content:consequence.wakeNamed",
          },
        ],
      },
      {
        id: "joinWake",
        label: "content:events.scavengerWake.opt.joinWake",
        outcomes: [
          {
            text: "content:events.scavengerWake.out.joinWake",
            weight: 3,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "tide", n: 1 }
            ],
            consequence: "content:consequence.wakeJoined",
          },
          {
            text: "content:events.scavengerWake.out.joinWakeGift",
            weight: 2,
            effects: [
              { k: "scrap", n: 45 },
              { k: "tide", n: 1 }
            ],
            consequence: "content:consequence.wakeJoined",
          },
        ],
      },
      {
        id: "takeTheHull",
        label: "content:events.scavengerWake.opt.takeTheHull",
        outcomes: [
          {
            text: "content:events.scavengerWake.out.takeTheHull",
            effects: [
              { k: "scrap", n: -40 },
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 }
            ],
            consequence: "content:consequence.wakeBought",
          },
        ],
      },
    ],
  },
  {
    id: "coreCutter",
    weight: 16,
    requires: { sector: [2, 3] },
    text: "content:events.coreCutter.text",
    dialogue: [
      { who: "narration", line: "content:events.coreCutter.dia.l1" },
      { who: "echo", line: "content:events.coreCutter.dia.l2" },
    ],
    options: [
      {
        id: "recut",
        label: "content:events.coreCutter.opt.recut",
        requires: { req: "scrap", n: 15 },
        outcomes: [
          {
            text: "content:events.coreCutter.out.recut",
            weight: 3,
            effects: [
              { k: "scrap", n: -15 },
              { k: "swapLowestDie" },
              { k: "flag", key: "cutterTrusted" },
            ],
            consequence: "content:consequence.cutterTrusted",
          },
          {
            text: "content:events.coreCutter.out.recutSplit",
            weight: 1,
            effects: [
              { k: "scrap", n: -15 },
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "cutterTrusted" },
            ],
            consequence: "content:consequence.cutterTrusted",
          },
        ],
      },
      {
        id: "holdWheel",
        label: "content:events.coreCutter.opt.holdWheel",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.coreCutter.out.holdPass",
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "axis", n: 1 },
              { k: "flag", key: "cutterTrusted" },
            ],
            consequence: "content:consequence.cutterTrusted",
          },
        ],
        onFail: [
          {
            text: "content:events.coreCutter.out.holdFail",
            effects: [
              { k: "hull", n: -4 },
              { k: "scrap", n: -15 },
            ],
          },
        ],
      },
      {
        id: "pocketStones",
        label: "content:events.coreCutter.opt.pocketStones",
        outcomes: [
          {
            text: "content:events.coreCutter.out.pocket",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 },
              { k: "flag", key: "cutterRobbed" },
            ],
            consequence: "content:consequence.cutterRobbed",
          },
          {
            text: "content:events.coreCutter.out.pocketCaught",
            weight: 1,
            effects: [
              { k: "hull", n: -6 },
              { k: "scrap", n: 20 },
              { k: "axis", n: -1 },
              { k: "flag", key: "cutterRobbed" },
            ],
            consequence: "content:consequence.cutterRobbed",
          },
        ],
      },
      {
        id: "sellRough",
        label: "content:events.coreCutter.opt.sellRough",
        outcomes: [
          {
            text: "content:events.coreCutter.out.sell",
            weight: 1,
            effects: [{ k: "scrap", n: 35 }],
          },
          {
            text: "content:events.coreCutter.out.sellTip",
            weight: 1,
            effects: [
              { k: "scrap", n: 15 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cutterReturns",
    weight: 16,
    requires: { sector: [4, 5], flags: { any: ["cutterTrusted", "cutterRobbed"] } },
    text: "content:events.cutterReturns.text",
    dialogue: [
      { who: "narration", line: "content:events.cutterReturns.dia.l1" },
      { who: "echo", line: "content:events.cutterReturns.dia.l2" },
    ],
    options: [
      {
        id: "masterwork",
        label: "content:events.cutterReturns.opt.masterwork",
        requires: { req: "flag", key: "cutterTrusted" },
        outcomes: [
          {
            text: "content:events.cutterReturns.out.masterwork",
            weight: 2,
            effects: [{ k: "loot", rarity: "rare" }],
            consequence: "content:consequence.cutterTrusted",
          },
          {
            text: "content:events.cutterReturns.out.masterworkPair",
            weight: 1,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
            consequence: "content:consequence.cutterTrusted",
          },
        ],
      },
      {
        id: "payBack",
        label: "content:events.cutterReturns.opt.payBack",
        requires: [
          { req: "flag", key: "cutterRobbed" },
          { req: "scrap", n: 45 },
        ],
        outcomes: [
          {
            text: "content:events.cutterReturns.out.payBack",
            weight: 3,
            effects: [
              { k: "scrap", n: -45 },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.cutterRobbed",
          },
          {
            text: "content:events.cutterReturns.out.payBackSwap",
            weight: 1,
            effects: [
              { k: "scrap", n: -45 },
              { k: "axis", n: 1 },
              { k: "swapLowestDie" },
            ],
            consequence: "content:consequence.cutterRobbed",
          },
        ],
      },
      {
        id: "appraise",
        label: "content:events.cutterReturns.opt.appraise",
        check: { dice: 2, pick: "highest", target: 7, tierAtLeast: 8 },
        onPass: [
          {
            text: "content:events.cutterReturns.out.appraisePass",
            effects: [{ k: "battleMod", mod: "startCharge", n: 4, battles: 2 }],
            consequence: "content:consequence.cutterRemembers",
          },
        ],
        onFail: [
          {
            text: "content:events.cutterReturns.out.appraiseFail",
            effects: [
              { k: "scrap", n: -15 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.cutterRemembers",
          },
        ],
      },
      {
        id: "raidShop",
        label: "content:events.cutterReturns.opt.raidShop",
        outcomes: [
          {
            text: "content:events.cutterReturns.out.raid",
            weight: 2,
            effects: [{ k: "axis", n: -2 }],
            consequence: "content:consequence.cutterRemembers",
            follow: { enemyIds: ["bailiff"], scrap: 60, loot: { rarity: "rare" } },
          },
          {
            text: "content:events.cutterReturns.out.raidClean",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "loot", rarity: "rare" },
              { k: "scrap", n: 30 },
            ],
            consequence: "content:consequence.cutterRemembers",
          },
        ],
      },
      {
        id: "askRough",
        label: "content:events.cutterReturns.opt.askRough",
        outcomes: [
          {
            text: "content:events.cutterReturns.out.askRough",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "tide", n: 1 },
            ],
          },
          {
            text: "content:events.cutterReturns.out.askRoughDig",
            weight: 1,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "hull", n: -5 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "echoDefrag",
    weight: 14,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.echoDefrag.text",
    dialogue: [
      { who: "echo", line: "content:events.echoDefrag.dia.l1" },
      { who: "narration", line: "content:events.echoDefrag.dia.l2" },
      { who: "echo", line: "content:events.echoDefrag.dia.l3" },
    ],
    options: [
      {
        id: "fullJump",
        label: "content:events.echoDefrag.opt.fullJump",
        outcomes: [
          {
            text: "content:events.echoDefrag.out.fullJump",
            weight: 2,
            effects: [
              { k: "tide", n: 1 },
              { k: "shards", n: 10 },
            ],
            consequence: "content:consequence.echoSorted",
          },
          {
            text: "content:events.echoDefrag.out.fullJumpChart",
            weight: 1,
            effects: [
              { k: "tide", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 4 },
            ],
            consequence: "content:consequence.echoSorted",
          },
        ],
      },
      {
        id: "reactorPower",
        label: "content:events.echoDefrag.opt.reactorPower",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.echoDefrag.out.reactorPass",
            effects: [
              { k: "flag", key: "echoHandshake" },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
            consequence: "content:consequence.echoSorted",
          },
        ],
        onFail: [
          {
            text: "content:events.echoDefrag.out.reactorFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "wipeIt",
        label: "content:events.echoDefrag.opt.wipeIt",
        outcomes: [
          {
            text: "content:events.echoDefrag.out.wipe",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
            consequence: "content:consequence.echoWiped",
          },
          {
            text: "content:events.echoDefrag.out.wipeHull",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "hullMax", n: 3 },
            ],
            consequence: "content:consequence.echoWiped",
          },
        ],
      },
      {
        id: "listenIn",
        label: "content:events.echoDefrag.opt.listenIn",
        outcomes: [
          {
            text: "content:events.echoDefrag.out.listen",
            weight: 2,
            effects: [
              { k: "axis", n: -1 },
              { k: "flag", key: "echoHandshake" },
            ],
            consequence: "content:consequence.echoListened",
          },
          {
            text: "content:events.echoDefrag.out.listenStatic",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "tide", n: -1 },
            ],
            consequence: "content:consequence.echoListened",
          },
        ],
      },
    ],
  },
  {
    id: "keeperNovice",
    weight: 15,
    speaker: "beaconKeeper",
    requires: { sector: [2, 3] },
    text: "content:events.keeperNovice.text",
    dialogue: [
      { who: "beaconKeeper", line: "content:events.keeperNovice.dia.l1" },
      { who: "echo", line: "content:events.keeperNovice.dia.l2" },
    ],
    options: [
      {
        id: "teach",
        label: "content:events.keeperNovice.opt.teach",
        outcomes: [
          {
            text: "content:events.keeperNovice.out.teach",
            weight: 2,
            effects: [
              { k: "flag", key: "noviceTaught" },
              { k: "flag", key: "keeperTrust" },
              { k: "axis", n: 1 },
            ],
            codex: "keeperCreed",
            consequence: "content:consequence.noviceHelped",
          },
          {
            text: "content:events.keeperNovice.out.teachQuiet",
            weight: 1,
            effects: [
              { k: "flag", key: "noviceTaught" },
              { k: "tide", n: -1 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.noviceHelped",
          },
        ],
      },
      {
        id: "fixIt",
        label: "content:events.keeperNovice.opt.fixIt",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.keeperNovice.out.fixPass",
            effects: [
              { k: "flag", key: "noviceTaught" },
              { k: "tide", n: -1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.noviceHelped",
          },
        ],
        onFail: [
          {
            text: "content:events.keeperNovice.out.fixFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "standWatch",
        label: "content:events.keeperNovice.opt.standWatch",
        outcomes: [
          {
            text: "content:events.keeperNovice.out.standWatch",
            weight: 2,
            effects: [
              { k: "flag", key: "noviceRelieved" },
              { k: "tide", n: 1 },
              { k: "hull", n: 6 },
            ],
            consequence: "content:consequence.noviceRelieved",
          },
          {
            text: "content:events.keeperNovice.out.standWatchRaid",
            weight: 1,
            effects: [{ k: "flag", key: "noviceRelieved" }],
            consequence: "content:consequence.noviceRelieved",
            follow: { enemyIds: ["hookTug", "chaffSwarm"], scrap: 30 },
          },
        ],
      },
      {
        id: "stripLamp",
        label: "content:events.keeperNovice.opt.stripLamp",
        outcomes: [
          {
            text: "content:events.keeperNovice.out.strip",
            weight: 1,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.noviceStripped",
          },
          {
            text: "content:events.keeperNovice.out.stripSold",
            weight: 1,
            effects: [
              { k: "scrap", n: 40 },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.noviceStripped",
          },
        ],
      },
    ],
  },
  {
    id: "noviceLamp",
    weight: 15,
    speaker: "beaconKeeper",
    requires: { sector: [4, 5], flags: { any: ["noviceTaught", "noviceRelieved"] } },
    text: "content:events.noviceLamp.text",
    dialogue: [
      { who: "narration", line: "content:events.noviceLamp.dia.l1" },
      { who: "beaconKeeper", line: "content:events.noviceLamp.dia.l2" },
    ],
    options: [
      {
        id: "chart",
        label: "content:events.noviceLamp.opt.chart",
        outcomes: [
          {
            text: "content:events.noviceLamp.out.chart",
            weight: 2,
            effects: [{ k: "nodeMod", mod: "revealRows", n: 4 }],
            consequence: "content:consequence.noviceRemembers",
          },
          {
            text: "content:events.noviceLamp.out.chartQuiet",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "tide", n: -1 },
            ],
            consequence: "content:consequence.noviceRemembers",
          },
        ],
      },
      {
        id: "resupply",
        label: "content:events.noviceLamp.opt.resupply",
        requires: { req: "scrap", n: 35 },
        outcomes: [
          {
            text: "content:events.noviceLamp.out.resupply",
            weight: 3,
            effects: [
              { k: "scrap", n: -35 },
              { k: "axis", n: 2 },
              { k: "flag", key: "keeperTrust" },
            ],
            consequence: "content:consequence.noviceRemembers",
          },
          {
            text: "content:events.noviceLamp.out.resupplyCharts",
            weight: 1,
            effects: [
              { k: "scrap", n: -35 },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.noviceRemembers",
          },
        ],
      },
      {
        id: "witness",
        label: "content:events.noviceLamp.opt.witness",
        requires: { req: "flag", key: "noviceTaught" },
        outcomes: [
          {
            text: "content:events.noviceLamp.out.witness",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.noviceHelped",
          },
          {
            text: "content:events.noviceLamp.out.witnessList",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
            consequence: "content:consequence.noviceHelped",
          },
        ],
      },
      {
        id: "returnWatch",
        label: "content:events.noviceLamp.opt.returnWatch",
        requires: { req: "flag", key: "noviceRelieved" },
        outcomes: [
          {
            text: "content:events.noviceLamp.out.returnWatch",
            weight: 2,
            effects: [
              { k: "hull", n: 8 },
              { k: "tide", n: -1 },
            ],
            consequence: "content:consequence.noviceRelieved",
          },
          {
            text: "content:events.noviceLamp.out.returnWatchCharge",
            weight: 1,
            effects: [{ k: "battleMod", mod: "startCharge", n: 4, battles: 2 }],
            consequence: "content:consequence.noviceRelieved",
          },
        ],
      },
      {
        id: "borrowReactor",
        label: "content:events.noviceLamp.opt.borrowReactor",
        check: { dice: 2, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.noviceLamp.out.borrowPass",
            effects: [{ k: "battleMod", mod: "startCharge", n: 5, battles: 2 }],
          },
        ],
        onFail: [
          {
            text: "content:events.noviceLamp.out.borrowFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "axis", n: -1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "wardenBulletin",
    weight: 16,
    speaker: "warden",
    requires: { sector: [2, 3], flags: { all: ["alerted"] } },
    text: "content:events.wardenBulletin.text",
    dialogue: [
      { who: "warden", line: "content:events.wardenBulletin.dia.l1" },
      { who: "echo", line: "content:events.wardenBulletin.dia.l2" },
    ],
    options: [
      {
        id: "payFine",
        label: "content:events.wardenBulletin.opt.payFine",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.wardenBulletin.out.payFine",
            weight: 3,
            effects: [
              { k: "scrap", n: -40 },
              { k: "axis", n: 1 },
              { k: "flag", key: "transitPapers" },
            ],
            consequence: "content:consequence.alerted",
          },
          {
            text: "content:events.wardenBulletin.out.payFineChit",
            weight: 1,
            effects: [
              { k: "scrap", n: -40 },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
            ],
            consequence: "content:consequence.alerted",
          },
        ],
      },
      {
        id: "forge",
        label: "content:events.wardenBulletin.opt.forge",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.wardenBulletin.out.forgePass",
            effects: [
              { k: "flag", key: "papersForged" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.alerted",
          },
        ],
        onFail: [
          {
            text: "content:events.wardenBulletin.out.forgeFail",
            effects: [
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.alerted",
          },
        ],
      },
      {
        id: "shootBuoys",
        label: "content:events.wardenBulletin.opt.shootBuoys",
        outcomes: [
          {
            text: "content:events.wardenBulletin.out.shoot",
            weight: 2,
            effects: [
              { k: "scrap", n: 40 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.alerted",
          },
          {
            text: "content:events.wardenBulletin.out.shootWarden",
            weight: 1,
            effects: [{ k: "axis", n: -1 }],
            consequence: "content:consequence.alerted",
            follow: { enemyIds: ["shieldWarden", "salvageWarden"], scrap: 40 },
          },
        ],
      },
      {
        id: "appeal",
        label: "content:events.wardenBulletin.opt.appeal",
        check: { dice: 3, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.wardenBulletin.out.appealPass",
            effects: [
              { k: "flag", key: "transitPapers" },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.alerted",
          },
        ],
        onFail: [
          {
            text: "content:events.wardenBulletin.out.appealFail",
            effects: [
              { k: "scrap", n: -25 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.alerted",
          },
        ],
      },
    ],
  },
  {
    id: "boardReply",
    weight: 15,
    requires: { sector: [2, 3], flags: { all: ["boardPosted"] } },
    text: "content:events.boardReply.text",
    dialogue: [
      { who: "echo", line: "content:events.boardReply.dia.l1" },
      { who: "narration", line: "content:events.boardReply.dia.l2" },
    ],
    options: [
      {
        id: "goAlone",
        label: "content:events.boardReply.opt.goAlone",
        outcomes: [
          {
            text: "content:events.boardReply.out.goAlone",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.rimBoardPosted",
          },
          {
            text: "content:events.boardReply.out.goAloneTrap",
            weight: 1,
            effects: [],
            consequence: "content:consequence.rimBoardPosted",
            follow: { enemyIds: ["hookTug", "ripperTug"], scrap: 45 },
          },
        ],
      },
      {
        id: "probeFirst",
        label: "content:events.boardReply.opt.probeFirst",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.boardReply.out.probePass",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.rimBoardPosted",
          },
        ],
        onFail: [
          {
            text: "content:events.boardReply.out.probeFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.rimBoardPosted",
          },
        ],
      },
      {
        id: "sellLead",
        label: "content:events.boardReply.opt.sellLead",
        outcomes: [
          {
            text: "content:events.boardReply.out.sell",
            weight: 1,
            effects: [{ k: "scrap", n: 45 }],
            consequence: "content:consequence.rimBoardPosted",
          },
          {
            text: "content:events.boardReply.out.sellHunted",
            weight: 1,
            effects: [
              { k: "scrap", n: 25 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.rimBoardPosted",
          },
        ],
      },
      {
        id: "writeBack",
        label: "content:events.boardReply.opt.writeBack",
        outcomes: [
          {
            text: "content:events.boardReply.out.writeBack",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: 8 },
            ],
            consequence: "content:consequence.rimBoardPosted",
          },
          {
            text: "content:events.boardReply.out.writeBackPitch",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
            ],
            consequence: "content:consequence.rimBoardPosted",
          },
        ],
      },
    ],
  },
  {
    id: "hymnPost",
    weight: 16,
    speaker: "choirPreacher",
    requires: { sector: [3, 4, 5] },
    text: "content:events.hymnPost.text",
    dialogue: [
      { who: "choirPreacher", line: "content:events.hymnPost.dia.l1" },
      { who: "echo", line: "content:events.hymnPost.dia.l2" },
    ],
    options: [
      {
        id: "readLetters",
        label: "content:events.hymnPost.opt.readLetters",
        outcomes: [
          {
            text: "content:events.hymnPost.out.read",
            weight: 2,
            effects: [
              { k: "axis", n: -1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            codex: "choirDoctrine",
            consequence: "content:consequence.choirMailRead",
          },
          {
            text: "content:events.hymnPost.out.readHymn",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "flag", key: "hymnCopied" },
            ],
            consequence: "content:consequence.choirMailRead",
          },
        ],
      },
      {
        id: "writeOne",
        label: "content:events.hymnPost.opt.writeOne",
        outcomes: [
          {
            text: "content:events.hymnPost.out.write",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
            consequence: "content:consequence.choirMailSent",
          },
          {
            text: "content:events.hymnPost.out.writeAnswered",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.choirMailSent",
          },
        ],
      },
      {
        id: "shootDrones",
        label: "content:events.hymnPost.opt.shootDrones",
        outcomes: [
          {
            text: "content:events.hymnPost.out.shoot",
            weight: 3,
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.choirMailBurned",
          },
          {
            text: "content:events.hymnPost.out.shootEscort",
            weight: 1,
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.choirMailBurned",
            follow: { enemyIds: ["choirAcolyte", "censerDrone"], scrap: 35 },
          },
        ],
      },
      {
        id: "turnBack",
        label: "content:events.hymnPost.opt.turnBack",
        check: { dice: 2, pick: "sum", target: 10 },
        onPass: [
          {
            text: "content:events.hymnPost.out.turnPass",
            effects: [
              { k: "axis", n: 2 },
              { k: "tide", n: -1 },
            ],
            consequence: "content:consequence.choirMailReturned",
          },
        ],
        onFail: [
          {
            text: "content:events.hymnPost.out.turnFail",
            effects: [
              { k: "hull", n: -6 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.choirMailReturned",
          },
        ],
      },
    ],
  },
  {
    id: "claimsAdjuster",
    weight: 14,
    requires: { sector: [2, 3, 4, 5] },
    text: "content:events.claimsAdjuster.text",
    dialogue: [
      { who: "narration", line: "content:events.claimsAdjuster.dia.l1" },
      { who: "echo", line: "content:events.claimsAdjuster.dia.l2" },
    ],
    options: [
      {
        id: "honestClaim",
        label: "content:events.claimsAdjuster.opt.honestClaim",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.claimsAdjuster.out.honestPass",
            effects: [
              { k: "hull", n: 8 },
              { k: "scrap", n: 20 },
            ],
            consequence: "content:consequence.claimFiled",
          },
        ],
        onFail: [
          {
            text: "content:events.claimsAdjuster.out.honestFail",
            effects: [
              { k: "scrap", n: 10 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.claimFiled",
          },
        ],
      },
      {
        id: "padClaim",
        label: "content:events.claimsAdjuster.opt.padClaim",
        outcomes: [
          {
            text: "content:events.claimsAdjuster.out.pad",
            weight: 2,
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.claimPadded",
          },
          {
            text: "content:events.claimsAdjuster.out.padAudit",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "axis", n: -1 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.claimPadded",
          },
          {
            text: "content:events.claimsAdjuster.out.padFraud",
            weight: 1,
            effects: [{ k: "axis", n: -1 }],
            consequence: "content:consequence.claimPadded",
            follow: { enemyIds: ["breachDrone", "breachDrone"], scrap: 20 },
          },
        ],
      },
      {
        id: "closeFile",
        label: "content:events.claimsAdjuster.opt.closeFile",
        outcomes: [
          {
            text: "content:events.claimsAdjuster.out.closeFile",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.fleetFileClosed",
          },
          {
            text: "content:events.claimsAdjuster.out.closeFileAsset",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 3 },
            ],
            consequence: "content:consequence.fleetFileClosed",
          },
        ],
      },
      {
        id: "buyCore",
        label: "content:events.claimsAdjuster.opt.buyCore",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.claimsAdjuster.out.buyCore",
            weight: 3,
            effects: [
              { k: "scrap", n: -40 },
              { k: "loot", rarity: "rare" },
            ],
          },
          {
            text: "content:events.claimsAdjuster.out.buyCoreCradle",
            weight: 1,
            effects: [
              { k: "scrap", n: -40 },
              { k: "loot", rarity: "uncommon" },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "farRimHauler",
    weight: 16,
    speaker: "yusuf",
    requires: { sector: [2, 3, 4] },
    text: "content:events.farRimHauler.text",
    dialogue: [
      { who: "yusuf", line: "content:events.farRimHauler.dia.l1" },
      { who: "echo", line: "content:events.farRimHauler.dia.l2" },
    ],
    options: [
      {
        id: "towHer",
        label: "content:events.farRimHauler.opt.towHer",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.farRimHauler.out.towPass",
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
            ],
            consequence: "content:consequence.haulerTowed",
          },
        ],
        onFail: [
          {
            text: "content:events.farRimHauler.out.towFail",
            effects: [
              { k: "hull", n: -7 },
              { k: "flag", key: "yusufFriend" },
            ],
            consequence: "content:consequence.haulerTowed",
          },
        ],
      },
      {
        id: "buyLog",
        label: "content:events.farRimHauler.opt.buyLog",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.farRimHauler.out.buyLog",
            weight: 2,
            effects: [
              { k: "scrap", n: -30 },
              { k: "nodeMod", mod: "revealRows", n: 4 },
            ],
          },
          {
            text: "content:events.farRimHauler.out.buyLogTrace",
            weight: 1,
            effects: [
              { k: "scrap", n: -30 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "syncClocks",
        label: "content:events.farRimHauler.opt.syncClocks",
        requires: { req: "flag", key: "echoHandshake" },
        outcomes: [
          {
            text: "content:events.farRimHauler.out.sync",
            weight: 2,
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "tide", n: -1 },
              { k: "hull", n: 5 },
            ],
            consequence: "content:consequence.haulerWoken",
          },
          {
            text: "content:events.farRimHauler.out.syncCargo",
            weight: 1,
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "axis", n: 1 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.haulerWoken",
          },
        ],
      },
      {
        id: "stripHer",
        label: "content:events.farRimHauler.opt.stripHer",
        outcomes: [
          {
            text: "content:events.farRimHauler.out.strip",
            weight: 2,
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -2 },
              { k: "flag", key: "yusufGrudge" },
            ],
            consequence: "content:consequence.haulerStripped",
          },
          {
            text: "content:events.farRimHauler.out.stripDefence",
            weight: 1,
            effects: [
              { k: "scrap", n: 35 },
              { k: "axis", n: -2 },
              { k: "hull", n: -4 },
              { k: "flag", key: "yusufGrudge" },
            ],
            consequence: "content:consequence.haulerStripped",
          },
        ],
      },
    ],
  },
];
