import type { EventDef } from "@/types/events";

// Cross-sector pool added in Phase 10. Six are callbacks (maraFriend,
// maraGrudge, hymnJoined, hymnJammed, clanPaid, keeperSlighted).
export const PHASE10_COMMON_EVENTS: readonly EventDef[] = [
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
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 },
            ],
            weight: 2,
          },
          {
            text: "content:events.probabilityRain.out.standBad",
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
];
