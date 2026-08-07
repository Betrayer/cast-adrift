import type { EventDef } from "@/types/events";

// Cross-sector pool for S2–S5: the scenes that are not tied to one sector's
// idea. Many are beacon and cast callbacks (DESIGN §3 wants the player to *see*
// causality) — the Keeper's network remembers a sold beacon, Yusuf's lane
// remembers a shared black box, the Preacher remembers a public refusal, Mara
// remembers the ledger, and a broken beacon leaves a wake.
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
];
