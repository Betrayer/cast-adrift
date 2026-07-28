import type { EventDef } from "@/types/events";

// Sector 3 — The Rift. Twelve scenes; five are callbacks
// (clanPaid, clanSlighted, relayFixed, choirCurious, hunterBeaten).
export const SECTOR3_EVENTS: readonly EventDef[] = [
  {
    id: "foldedHour",
    weight: 22,
    requires: { sector: [3] },
    text: "content:events.foldedHour.text",
    options: [
      {
        id: "waitOut",
        label: "content:events.foldedHour.opt.waitOut",
        outcomes: [
          {
            text: "content:events.foldedHour.out.waitOut",
            effects: [
              { k: "hull", n: 8 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "pushThrough",
        label: "content:events.foldedHour.opt.pushThrough",
        check: { dice: 2, pick: "sum", target: 10 },
        onPass: [
          {
            text: "content:events.foldedHour.out.pushPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.foldedHour.out.pushFail",
            effects: [
              { k: "hull", n: -9 },
              { k: "axis", n: -1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "mirrorSelf",
    weight: 20,
    requires: { sector: [3] },
    text: "content:events.mirrorSelf.text",
    options: [
      {
        id: "speak",
        label: "content:events.mirrorSelf.opt.speak",
        outcomes: [
          {
            text: "content:events.mirrorSelf.out.speak",
            effects: [
              { k: "axis", n: -3 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "mirrorSpoke" },
            ],
          },
        ],
      },
      {
        id: "shoot",
        label: "content:events.mirrorSelf.opt.shoot",
        outcomes: [
          {
            text: "content:events.mirrorSelf.out.shoot",
            effects: [
              { k: "axis", n: 3 },
              { k: "hull", n: -5 },
              { k: "flag", key: "mirrorBroken" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "clanEscort",
    weight: 18,
    speaker: "yusuf",
    requires: { sector: [3], flags: { all: ["clanPaid"] } },
    text: "content:events.clanEscort.text",
    options: [
      {
        id: "acceptEscort",
        label: "content:events.clanEscort.opt.acceptEscort",
        outcomes: [
          {
            text: "content:events.clanEscort.out.acceptEscort",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 },
              { k: "hull", n: 5 },
            ],
            consequence: "content:consequence.clanPaid",
          },
        ],
      },
      {
        id: "takeMap",
        label: "content:events.clanEscort.opt.takeMap",
        outcomes: [
          {
            text: "content:events.clanEscort.out.takeMap",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "scrap", n: 25 },
            ],
            consequence: "content:consequence.clanPaid",
          },
        ],
      },
    ],
  },
  {
    id: "clanReprisal",
    weight: 18,
    requires: { sector: [3], flags: { all: ["clanSlighted"] } },
    text: "content:events.clanReprisal.text",
    options: [
      {
        id: "standGround",
        label: "content:events.clanReprisal.opt.standGround",
        outcomes: [
          {
            text: "content:events.clanReprisal.out.standGround",
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.clanSlighted",
            follow: {
              enemyIds: ["clanBreaker"],
              scrap: 55,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "payLate",
        label: "content:events.clanReprisal.opt.payLate",
        requires: { req: "scrap", n: 55 },
        outcomes: [
          {
            text: "content:events.clanReprisal.out.payLate",
            effects: [
              { k: "scrap", n: -55 },
              { k: "flag", key: "clanPaid" },
            ],
            consequence: "content:consequence.clanSlighted",
          },
        ],
      },
    ],
  },
  {
    id: "riftHarvest",
    weight: 20,
    requires: { sector: [3] },
    text: "content:events.riftHarvest.text",
    options: [
      {
        id: "cutShards",
        label: "content:events.riftHarvest.opt.cutShards",
        outcomes: [
          {
            text: "content:events.riftHarvest.out.cutShards",
            effects: [
              { k: "loot", die: "prismChip" },
              { k: "hull", n: -4 },
            ],
          },
        ],
      },
      {
        id: "mapVein",
        label: "content:events.riftHarvest.opt.mapVein",
        outcomes: [
          {
            text: "content:events.riftHarvest.out.mapVein",
            effects: [
              { k: "scrap", n: 40 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "relayEcho",
    weight: 16,
    speaker: "beaconKeeper",
    requires: { sector: [3, 4], flags: { all: ["relayFixed"] } },
    text: "content:events.relayEcho.text",
    options: [
      {
        id: "answerIt",
        label: "content:events.relayEcho.opt.answerIt",
        outcomes: [
          {
            text: "content:events.relayEcho.out.answerIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "keeperTrust" },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
            consequence: "content:consequence.relayFixed",
            codex: "keeperCreed",
          },
        ],
      },
      {
        id: "sellIt",
        label: "content:events.relayEcho.opt.sellIt",
        outcomes: [
          {
            text: "content:events.relayEcho.out.sellIt",
            effects: [
              { k: "scrap", n: 65 },
              { k: "axis", n: -2 },
              { k: "flag", key: "keeperSlighted" },
            ],
            consequence: "content:consequence.relayFixed",
          },
        ],
      },
    ],
  },
  {
    id: "choirProbe",
    weight: 18,
    speaker: "choirPreacher",
    requires: { sector: [3], flags: { all: ["choirCurious"] } },
    text: "content:events.choirProbe.text",
    options: [
      {
        id: "kneel",
        label: "content:events.choirProbe.opt.kneel",
        outcomes: [
          {
            text: "content:events.choirProbe.out.kneel",
            effects: [
              { k: "axis", n: -3 },
              { k: "flag", key: "pactOpened" },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.choirCurious",
            codex: "choirDoctrine",
          },
        ],
      },
      {
        id: "walkAway",
        label: "content:events.choirProbe.opt.walkAway",
        outcomes: [
          {
            text: "content:events.choirProbe.out.walkAway",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "refusedChoir" },
              { k: "hullMax", n: 4 },
            ],
            consequence: "content:consequence.choirCurious",
          },
        ],
      },
    ],
  },
  {
    id: "hunterRespect",
    weight: 14,
    speaker: "bountyHuntress",
    requires: { sector: [3, 4], flags: { all: ["hunterBeaten"] } },
    text: "content:events.hunterRespect.text",
    options: [
      {
        id: "hireHer",
        label: "content:events.hunterRespect.opt.hireHer",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.hunterRespect.out.hireHer",
            effects: [
              { k: "scrap", n: -40 },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 5 },
              { k: "flag", key: "hunterAllied" },
            ],
            consequence: "content:consequence.hunterBeaten",
          },
        ],
      },
      {
        id: "warnHer",
        label: "content:events.hunterRespect.opt.warnHer",
        outcomes: [
          {
            text: "content:events.hunterRespect.out.warnHer",
            effects: [
              { k: "axis", n: 1 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.hunterBeaten",
          },
        ],
      },
    ],
  },
  {
    id: "anomalyLedger",
    weight: 20,
    requires: { sector: [3] },
    text: "content:events.anomalyLedger.text",
    codex: "riddleWard",
    options: [
      {
        id: "solveIt",
        label: "content:events.anomalyLedger.opt.solveIt",
        check: { dice: 3, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.anomalyLedger.out.solvePass",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "ledgerSolved" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.anomalyLedger.out.solveFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "scrap", n: 20 },
            ],
          },
        ],
      },
      {
        id: "burnLedger",
        label: "content:events.anomalyLedger.opt.burnLedger",
        outcomes: [
          {
            text: "content:events.anomalyLedger.out.burnLedger",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "twinWreck",
    weight: 20,
    requires: { sector: [3] },
    text: "content:events.twinWreck.text",
    options: [
      {
        id: "leftHull",
        label: "content:events.twinWreck.opt.leftHull",
        outcomes: [
          {
            text: "content:events.twinWreck.out.leftHull",
            effects: [{ k: "loot", rarity: "uncommon" }],
            weight: 3,
          },
          {
            text: "content:events.twinWreck.out.leftEmpty",
            effects: [{ k: "hull", n: -4 }],
            weight: 1,
          },
        ],
      },
      {
        id: "rightHull",
        label: "content:events.twinWreck.opt.rightHull",
        outcomes: [
          {
            text: "content:events.twinWreck.out.rightHull",
            effects: [{ k: "scrap", n: 50 }],
            weight: 3,
          },
          {
            text: "content:events.twinWreck.out.rightTrap",
            effects: [{ k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 }],
            weight: 1,
          },
        ],
      },
    ],
  },
  {
    id: "warpedShipyard",
    weight: 18,
    requires: { sector: [3] },
    text: "content:events.warpedShipyard.text",
    options: [
      {
        id: "refit",
        label: "content:events.warpedShipyard.opt.refit",
        requires: { req: "scrap", n: 35 },
        outcomes: [
          {
            text: "content:events.warpedShipyard.out.refit",
            effects: [
              { k: "scrap", n: -35 },
              { k: "hullMax", n: 6 },
            ],
          },
        ],
      },
      {
        id: "swapPart",
        label: "content:events.warpedShipyard.opt.swapPart",
        outcomes: [
          {
            text: "content:events.warpedShipyard.out.swapPart",
            effects: [{ k: "swapLowestDie" }],
          },
        ],
      },
    ],
  },
  {
    id: "quietStar",
    weight: 18,
    requires: { sector: [3, 4] },
    text: "content:events.quietStar.text",
    options: [
      {
        id: "chartIt",
        label: "content:events.quietStar.opt.chartIt",
        requires: { req: "mk", slot: "sensors", mk: 2 },
        outcomes: [
          {
            text: "content:events.quietStar.out.chartIt",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "flag", key: "quietCharted" },
            ],
          },
        ],
      },
      {
        id: "restThere",
        label: "content:events.quietStar.opt.restThere",
        outcomes: [
          {
            text: "content:events.quietStar.out.restThere",
            effects: [
              { k: "hull", n: 10 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
];
