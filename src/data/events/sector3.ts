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
        id: "stepThrough",
        label: "content:events.mirrorSelf.opt.stepThrough",
        requires: { req: "axis", max: -4 },
        outcomes: [
          {
            text: "content:events.mirrorSelf.out.stepThrough",
            effects: [
              { k: "hullMax", n: -3 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "mirrorBound" },
            ],
            consequence: "content:consequence.mirrorBound",
          },
        ],
      },
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
            consequence: "content:consequence.veinWorked",
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
            consequence: "content:consequence.veinWorked",
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
        id: "auditIt",
        label: "content:events.anomalyLedger.opt.auditIt",
        requires: { req: "axis", min: 3 },
        outcomes: [
          {
            text: "content:events.anomalyLedger.out.auditIt",
            effects: [
              { k: "scrap", n: 35 },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "flag", key: "ledgerSolved" },
            ],
            consequence: "content:consequence.ledgerSolved",
          },
        ],
      },
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
            consequence: "content:consequence.twinWreckOpened",
            effects: [{ k: "loot", rarity: "uncommon" }],
            weight: 3,
          },
          {
            text: "content:events.twinWreck.out.leftEmpty",
            consequence: "content:consequence.twinWreckOpened",
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
            consequence: "content:consequence.twinWreckOpened",
            effects: [{ k: "scrap", n: 50 }],
            weight: 3,
          },
          {
            text: "content:events.twinWreck.out.rightTrap",
            consequence: "content:consequence.twinWreckOpened",
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
            consequence: "content:consequence.warpedYardUsed",
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
            consequence: "content:consequence.warpedYardUsed",
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
  {
    id: "driftReputation",
    weight: 18,
    requires: { sector: [3], flags: {any: ["yardStopped", "tugsPaid", "schoolHelped"]} },
    text: "content:events.driftReputation.text",
    options: [
      {
        id: "takeEscort",
        label: "content:events.driftReputation.opt.takeEscort",
        outcomes: [
          {
            text: "content:events.driftReputation.out.takeEscort",
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "flag", key: "driftFriends" }
            ],
            consequence: "content:consequence.driftFriends",
          },
        ],
      },
      {
        id: "askCargo",
        label: "content:events.driftReputation.opt.askCargo",
        outcomes: [
          {
            text: "content:events.driftReputation.out.askCargo",
            weight: 2,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "driftFriends" }
            ],
            consequence: "content:consequence.driftFriends",
          },
          {
            text: "content:events.driftReputation.out.askCargoEmpty",
            weight: 1,
            effects: [
              { k: "scrap", n: 35 },
              { k: "flag", key: "driftFriends" }
            ],
            consequence: "content:consequence.driftFriends",
          },
        ],
      },
      {
        id: "sendThemHome",
        label: "content:events.driftReputation.opt.sendThemHome",
        outcomes: [
          {
            text: "content:events.driftReputation.out.sendThemHome",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.driftFriends",
          },
        ],
      },
    ],
  },
  {
    id: "driftWake",
    weight: 18,
    requires: { sector: [3], flags: {any: ["schoolRobbed", "tugsCrossed", "quarantineBroken", "courtRigged"]} },
    text: "content:events.driftWake.text",
    options: [
      {
        id: "jamIt",
        label: "content:events.driftWake.opt.jamIt",
        outcomes: [
          {
            text: "content:events.driftWake.out.jamIt",
            effects: [
              { k: "flag", key: "wakeJammed" },
              { k: "tide", n: 1 },
              { k: "scrap", n: 30 }
            ],
            consequence: "content:consequence.wakeJammed",
          },
        ],
      },
      {
        id: "answerIt",
        label: "content:events.driftWake.opt.answerIt",
        outcomes: [
          {
            text: "content:events.driftWake.out.answerIt",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "wakeAnswered" },
              { k: "hullMax", n: 4 }
            ],
            consequence: "content:consequence.wakeAnswered",
          },
        ],
      },
      {
        id: "findSender",
        label: "content:events.driftWake.opt.findSender",
        check: { dice: 2, pick: "sum", target: 10 },
        onPass: [
          {
            text: "content:events.driftWake.out.findPass",
            effects: [
              { k: "flag", key: "wakeJammed" },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.wakeJammed",
          },
        ],
        onFail: [
          {
            text: "content:events.driftWake.out.findFail",
            effects: [
              { k: "hull", n: -8 },
              { k: "flag", key: "wakeAnswered" }
            ],
            consequence: "content:consequence.wakeAnswered",
          },
        ],
      },
    ],
  },
  {
    id: "quietPassage",
    weight: 16,
    requires: { sector: [3], flags: {any: ["quarantineKept", "bloomBurned", "bloomSource"]} },
    text: "content:events.quietPassage.text",
    options: [
      {
        id: "followTheNote",
        label: "content:events.quietPassage.opt.followTheNote",
        outcomes: [
          {
            text: "content:events.quietPassage.out.followTheNote",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "flag", key: "foldRead" }
            ],
            consequence: "content:consequence.foldRead",
          },
        ],
      },
      {
        id: "cutEngines",
        label: "content:events.quietPassage.opt.cutEngines",
        outcomes: [
          {
            text: "content:events.quietPassage.out.cutEngines",
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: 9 },
              { k: "flag", key: "foldRead" }
            ],
            consequence: "content:consequence.foldRead",
          },
        ],
      },
      {
        id: "soundIt",
        label: "content:events.quietPassage.opt.soundIt",
        check: { dice: 2, pick: "highest", target: 7, school: "blue" },
        onPass: [
          {
            text: "content:events.quietPassage.out.soundPass",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "foldRead" }
            ],
            consequence: "content:consequence.foldRead",
          },
        ],
        onFail: [
          {
            text: "content:events.quietPassage.out.soundFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "hull", n: -6 }
            ],
            consequence: "content:consequence.foldRead",
          },
        ],
      },
    ],
  },
  {
    id: "wardenRelay",
    weight: 16,
    speaker: "warden",
    requires: { sector: [3], flags: {any: ["wardenAnswered", "wardenReleased", "relayTraced", "relayStripped"]} },
    text: "content:events.wardenRelay.text",
    options: [
      {
        id: "acceptPost",
        label: "content:events.wardenRelay.opt.acceptPost",
        outcomes: [
          {
            text: "content:events.wardenRelay.out.acceptPost",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "postAccepted" },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 3 }
            ],
            consequence: "content:consequence.postAccepted",
          },
        ],
      },
      {
        id: "wipeRoster",
        label: "content:events.wardenRelay.opt.wipeRoster",
        outcomes: [
          {
            text: "content:events.wardenRelay.out.wipeRoster",
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "rosterWiped" },
              { k: "scrap", n: 55 }
            ],
            consequence: "content:consequence.rosterWiped",
          },
        ],
      },
      {
        id: "copyRoster",
        label: "content:events.wardenRelay.opt.copyRoster",
        outcomes: [
          {
            text: "content:events.wardenRelay.out.copyRoster",
            effects: [
              { k: "flag", key: "postAccepted" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            codex: "oldBeacon",
            consequence: "content:consequence.postAccepted",
          },
        ],
      },
    ],
  },
  {
    id: "manifestBuyer",
    weight: 16,
    requires: { sector: [3], flags: {any: ["manifestWon", "scriptBacked", "auctionJammed"]} },
    text: "content:events.manifestBuyer.text",
    options: [
      {
        id: "dealAgain",
        label: "content:events.manifestBuyer.opt.dealAgain",
        outcomes: [
          {
            text: "content:events.manifestBuyer.out.dealAgain",
            effects: [
              { k: "scrap", n: 70 },
              { k: "flag", key: "buyerBound" }
            ],
            consequence: "content:consequence.buyerBound",
          },
        ],
      },
      {
        id: "cutHim",
        label: "content:events.manifestBuyer.opt.cutHim",
        outcomes: [
          {
            text: "content:events.manifestBuyer.out.cutHim",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "buyerCut" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.buyerCut",
          },
        ],
      },
      {
        id: "traceHim",
        label: "content:events.manifestBuyer.opt.traceHim",
        check: { dice: 3, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.manifestBuyer.out.tracePass",
            effects: [
              { k: "flag", key: "buyerCut" },
              { k: "loot", rarity: "rare" }
            ],
            consequence: "content:consequence.buyerCut",
          },
        ],
        onFail: [
          {
            text: "content:events.manifestBuyer.out.traceFail",
            effects: [
              { k: "flag", key: "buyerBound" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }
            ],
            consequence: "content:consequence.buyerBound",
          },
        ],
      },
    ],
  },
  {
    id: "haulerReunion",
    weight: 15,
    requires: { sector: [3], flags: {any: ["raceWon", "raceLost", "apprenticeTold", "lighterLoaded", "lighterStripped", "lighterStopped"]} },
    text: "content:events.haulerReunion.text",
    options: [
      {
        id: "firstRun",
        label: "content:events.haulerReunion.opt.firstRun",
        outcomes: [
          {
            text: "content:events.haulerReunion.out.firstRun",
            weight: 3,
            effects: [
              { k: "flag", key: "crossingOpened" },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "scrap", n: 40 }
            ],
            consequence: "content:consequence.crossingOpened",
          },
          {
            text: "content:events.haulerReunion.out.firstRunRough",
            weight: 2,
            effects: [
              { k: "flag", key: "crossingOpened" },
              { k: "hull", n: -6 },
              { k: "scrap", n: 60 }
            ],
            consequence: "content:consequence.crossingOpened",
          },
        ],
      },
      {
        id: "refuseHonour",
        label: "content:events.haulerReunion.opt.refuseHonour",
        outcomes: [
          {
            text: "content:events.haulerReunion.out.refuseHonour",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "crossingOpened" },
              { k: "hullMax", n: 5 }
            ],
            consequence: "content:consequence.crossingOpened",
          },
        ],
      },
      {
        id: "tollIt",
        label: "content:events.haulerReunion.opt.tollIt",
        outcomes: [
          {
            text: "content:events.haulerReunion.out.tollIt",
            effects: [
              { k: "scrap", n: 85 },
              { k: "axis", n: -1 },
              { k: "flag", key: "crossingTolled" }
            ],
            consequence: "content:consequence.crossingTolled",
          },
        ],
      },
    ],
  },
  {
    id: "foldedArchive",
    weight: 15,
    requires: { sector: [3] },
    text: "content:events.foldedArchive.text",
    codex: "riddleWard",
    options: [
      {
        id: "addTenth",
        label: "content:events.foldedArchive.opt.addTenth",
        outcomes: [
          {
            text: "content:events.foldedArchive.out.addTenth",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "archiveCatalogued" },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            consequence: "content:consequence.archiveCatalogued",
          },
        ],
      },
      {
        id: "burnThem",
        label: "content:events.foldedArchive.opt.burnThem",
        outcomes: [
          {
            text: "content:events.foldedArchive.out.burnThem",
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "archiveBurned" },
              { k: "loot", rarity: "rare" }
            ],
            consequence: "content:consequence.archiveBurned",
          },
        ],
      },
      {
        id: "readNinth",
        label: "content:events.foldedArchive.opt.readNinth",
        check: { dice: 2, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.foldedArchive.out.ninthPass",
            effects: [
              { k: "flag", key: "archiveCatalogued" },
              { k: "loot", rarity: "uncommon" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            codex: "riddleWard",
            consequence: "content:consequence.archiveCatalogued",
          },
        ],
        onFail: [
          {
            text: "content:events.foldedArchive.out.ninthFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "flag", key: "archiveBurned" }
            ],
            consequence: "content:consequence.archiveBurned",
          },
        ],
      },
    ],
  },
  {
    id: "twinTransit",
    weight: 15,
    requires: { sector: [3] },
    text: "content:events.twinTransit.text",
    options: [
      {
        id: "answerFirst",
        label: "content:events.twinTransit.opt.answerFirst",
        outcomes: [
          {
            text: "content:events.twinTransit.out.answerFirst",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "twinChosen" }
            ],
            consequence: "content:consequence.twinChosen",
          },
        ],
      },
      {
        id: "answerSecond",
        label: "content:events.twinTransit.opt.answerSecond",
        outcomes: [
          {
            text: "content:events.twinTransit.out.answerSecond",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
              { k: "flag", key: "twinChosen" }
            ],
            consequence: "content:consequence.twinChosen",
          },
        ],
      },
      {
        id: "answerNeither",
        label: "content:events.twinTransit.opt.answerNeither",
        outcomes: [
          {
            text: "content:events.twinTransit.out.answerNeither",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 4 },
              { k: "flag", key: "twinRefused" }
            ],
            consequence: "content:consequence.twinRefused",
          },
        ],
      },
    ],
  },
  {
    id: "riftSurgeon",
    weight: 15,
    requires: { sector: [3] },
    text: "content:events.riftSurgeon.text",
    options: [
      {
        id: "takeIt",
        label: "content:events.riftSurgeon.opt.takeIt",
        outcomes: [
          {
            text: "content:events.riftSurgeon.out.takeIt",
            weight: 3,
            effects: [
              { k: "hullMax", n: 10 },
              { k: "flag", key: "surgeryTaken" }
            ],
            consequence: "content:consequence.surgeryTaken",
          },
          {
            text: "content:events.riftSurgeon.out.takeItOff",
            weight: 2,
            effects: [
              { k: "hullMax", n: 5 },
              { k: "hull", n: -8 },
              { k: "flag", key: "surgeryTaken" }
            ],
            consequence: "content:consequence.surgeryTaken",
          },
        ],
      },
      {
        id: "stripBay",
        label: "content:events.riftSurgeon.opt.stripBay",
        outcomes: [
          {
            text: "content:events.riftSurgeon.out.stripBay",
            effects: [
              { k: "scrap", n: 75 },
              { k: "axis", n: -1 },
              { k: "flag", key: "surgeryStripped" }
            ],
            consequence: "content:consequence.surgeryStripped",
          },
        ],
      },
      {
        id: "bookOther",
        label: "content:events.riftSurgeon.opt.bookOther",
        outcomes: [
          {
            text: "content:events.riftSurgeon.out.bookOther",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "surgeryBooked" },
              { k: "nodeMod", mod: "endHeal", n: 2 }
            ],
            consequence: "content:consequence.surgeryBooked",
          },
        ],
      },
    ],
  },
  {
    id: "causalDebt",
    weight: 14,
    requires: { sector: [3] },
    text: "content:events.causalDebt.text",
    options: [
      {
        id: "takeNow",
        label: "content:events.causalDebt.opt.takeNow",
        outcomes: [
          {
            text: "content:events.causalDebt.out.takeNow",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "causalDebt" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 3 }
            ],
            consequence: "content:consequence.causalDebt",
          },
        ],
      },
      {
        id: "payFirst",
        label: "content:events.causalDebt.opt.payFirst",
        outcomes: [
          {
            text: "content:events.causalDebt.out.payFirst",
            effects: [
              { k: "hull", n: -12 },
              { k: "loot", rarity: "rare" },
              { k: "axis", n: 1 },
              { k: "flag", key: "causalPaid" }
            ],
            consequence: "content:consequence.causalPaid",
          },
        ],
      },
      {
        id: "declineIt",
        label: "content:events.causalDebt.opt.declineIt",
        outcomes: [
          {
            text: "content:events.causalDebt.out.declineIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "causalPaid" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.causalPaid",
          },
        ],
      },
    ],
  },
  {
    id: "unlitChapel",
    weight: 14,
    speaker: "choirPreacher",
    requires: { sector: [3] },
    text: "content:events.unlitChapel.text",
    options: [
      {
        id: "askIt",
        label: "content:events.unlitChapel.opt.askIt",
        outcomes: [
          {
            text: "content:events.unlitChapel.out.askIt",
            effects: [
              { k: "flag", key: "heardChoir" },
              { k: "flag", key: "chapelAsked" },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 }
            ],
            consequence: "content:consequence.chapelAsked",
          },
        ],
      },
      {
        id: "silenceIt",
        label: "content:events.unlitChapel.opt.silenceIt",
        outcomes: [
          {
            text: "content:events.unlitChapel.out.silenceIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "chapelSilenced" },
              { k: "scrap", n: 45 }
            ],
            consequence: "content:consequence.chapelSilenced",
          },
        ],
      },
      {
        id: "copyIt",
        label: "content:events.unlitChapel.opt.copyIt",
        outcomes: [
          {
            text: "content:events.unlitChapel.out.copyIt",
            effects: [
              { k: "flag", key: "hymnCopied" },
              { k: "axis", n: -1 },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.hymnCopied",
          },
        ],
      },
    ],
  },
  {
    id: "riftPilotage",
    weight: 14,
    requires: { sector: [3] },
    text: "content:events.riftPilotage.text",
    options: [
      {
        id: "hirePilot",
        label: "content:events.riftPilotage.opt.hirePilot",
        outcomes: [
          {
            text: "content:events.riftPilotage.out.hirePilot",
            effects: [
              { k: "scrap", n: -35 },
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "flag", key: "pilotHired" }
            ],
            consequence: "content:consequence.pilotHired",
          },
        ],
      },
      {
        id: "readBoard",
        label: "content:events.riftPilotage.opt.readBoard",
        outcomes: [
          {
            text: "content:events.riftPilotage.out.readBoard",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "flag", key: "boardRead" }
            ],
            consequence: "content:consequence.boardRead",
          },
        ],
      },
      {
        id: "takeBoard",
        label: "content:events.riftPilotage.opt.takeBoard",
        outcomes: [
          {
            text: "content:events.riftPilotage.out.takeBoard",
            effects: [
              { k: "scrap", n: 55 },
              { k: "axis", n: -1 },
              { k: "flag", key: "boardTaken" }
            ],
            consequence: "content:consequence.boardTaken",
          },
        ],
      },
    ],
  },
  {
    id: "echoOfTheCut",
    weight: 13,
    requires: { sector: [3] },
    text: "content:events.echoOfTheCut.text",
    codex: "choirSignal",
    options: [
      {
        id: "recordIt",
        label: "content:events.echoOfTheCut.opt.recordIt",
        outcomes: [
          {
            text: "content:events.echoOfTheCut.out.recordIt",
            effects: [
              { k: "flag", key: "cutRecorded" },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            codex: "choirSignal",
            consequence: "content:consequence.cutRecorded",
          },
        ],
      },
      {
        id: "rideIt",
        label: "content:events.echoOfTheCut.opt.rideIt",
        check: { dice: 2, pick: "sum", target: 10, school: "black" },
        onPass: [
          {
            text: "content:events.echoOfTheCut.out.ridePass",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 },
              { k: "flag", key: "cutRidden" }
            ],
            consequence: "content:consequence.cutRidden",
          },
        ],
        onFail: [
          {
            text: "content:events.echoOfTheCut.out.rideFail",
            effects: [
              { k: "hull", n: -10 },
              { k: "flag", key: "cutRecorded" }
            ],
            consequence: "content:consequence.cutRecorded",
          },
        ],
      },
      {
        id: "shutItOut",
        label: "content:events.echoOfTheCut.opt.shutItOut",
        outcomes: [
          {
            text: "content:events.echoOfTheCut.out.shutItOut",
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: 8 },
              { k: "flag", key: "cutRefused" }
            ],
            consequence: "content:consequence.cutRefused",
          },
        ],
      },
    ],
  },
];
