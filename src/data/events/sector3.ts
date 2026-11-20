import type { EventDef } from "@/types/events";

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
      {
        id: "loopHour",
        label: "content:events.foldedHour.opt.loopHour",
        check: { dice: 2, pick: "lowest", target: 5 },
        onPass: [
          {
            text: "content:events.foldedHour.out.loopPass",
            effects: [
              { k: "tide", n: -1 },
              { k: "hull", n: 5 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.foldedHour.out.loopFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "hull", n: -6 },
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
      {
        id: "raidWithThem",
        label: "content:events.clanEscort.opt.raidWithThem",
        outcomes: [
          {
            text: "content:events.clanEscort.out.raidWithThem",
            weight: 3,
            effects: [{ k: "axis", n: -1 }],
            consequence: "content:consequence.clanPaid",
            follow: {
              enemyIds: ["foldWorm", "riftling"],
              scrap: 50,
              loot: { rarity: "uncommon" },
            },
          },
          {
            text: "content:events.clanEscort.out.raidWithThemGutted",
            weight: 1,
            effects: [
              { k: "hull", n: -7 },
              { k: "scrap", n: 40 },
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
      {
        id: "runForFold",
        label: "content:events.clanReprisal.opt.runForFold",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.clanReprisal.out.runPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.clanSlighted",
          },
        ],
        onFail: [
          {
            text: "content:events.clanReprisal.out.runFail",
            effects: [{ k: "hull", n: -6 }],
            consequence: "content:consequence.clanSlighted",
            follow: { enemyIds: ["clanBreaker"], scrap: 30 },
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
      {
        id: "haul",
        label: "content:events.riftHarvest.opt.haul",
        requires: { req: "cargo", id: "unstableCore" },
        outcomes: [
          {
            text: "content:events.riftHarvest.out.haul",
            effects: [{ k: "cargo", id: "unstableCore" }],
            consequence: "content:consequence.cargoTaken",
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
              { k: "flag", key: "hunterWarned" },
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
      {
        id: "findDifference",
        label: "content:events.twinWreck.opt.findDifference",
        check: { dice: 3, pick: "sum", target: 13 },
        onPass: [
          {
            text: "content:events.twinWreck.out.differencePass",
            consequence: "content:consequence.twinWreckOpened",
            effects: [{ k: "loot", rarity: "rare" }],
          },
        ],
        onFail: [
          {
            text: "content:events.twinWreck.out.differenceFail",
            consequence: "content:consequence.twinWreckOpened",
            effects: [
              { k: "tide", n: 1 },
              { k: "scrap", n: 20 },
            ],
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
      {
        id: "letItFinish",
        label: "content:events.warpedShipyard.opt.letItFinish",
        outcomes: [
          {
            text: "content:events.warpedShipyard.out.letItFinish",
            consequence: "content:consequence.warpedYardUsed",
            weight: 2,
            effects: [
              { k: "hullMax", n: 8 },
              { k: "hull", n: -8 },
            ],
          },
          {
            text: "content:events.warpedShipyard.out.letItFinishTemplate",
            consequence: "content:consequence.warpedYardUsed",
            weight: 1,
            effects: [
              { k: "hullMax", n: -3 },
              { k: "loot", rarity: "rare" },
            ],
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
      {
        id: "listenToWell",
        label: "content:events.quietStar.opt.listenToWell",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.quietStar.out.listenPass",
            effects: [
              { k: "flag", key: "quietCharted" },
              { k: "loot", rarity: "uncommon" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.quietStar.out.listenFail",
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
        requires: { req: "scrap", n: 35 },
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
  {
    id: "maraTwiceStall",
    weight: 16,
    speaker: "mara",
    requires: { sector: [3] },
    text: "content:events.maraTwiceStall.text",
    dialogue: [
      { who: "mara", line: "content:events.maraTwiceStall.dia.l1" },
      { who: "echo", line: "content:events.maraTwiceStall.dia.l2" },
      { who: "mara", line: "content:events.maraTwiceStall.dia.l3" },
    ],
    options: [
      {
        id: "buyNow",
        label: "content:events.maraTwiceStall.opt.buyNow",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.maraTwiceStall.out.buyNow",
            weight: 3,
            effects: [
              { k: "scrap", n: -40 },
              { k: "loot", rarity: "rare" },
            ],
          },
          {
            text: "content:events.maraTwiceStall.out.buyNowSecond",
            weight: 1,
            effects: [
              { k: "scrap", n: -40 },
              { k: "loot", rarity: "uncommon" },
              { k: "hull", n: 6 },
            ],
          },
        ],
      },
      {
        id: "waitForSale",
        label: "content:events.maraTwiceStall.opt.waitForSale",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.maraTwiceStall.out.waitForSale",
            weight: 2,
            effects: [
              { k: "scrap", n: -20 },
              { k: "loot", rarity: "uncommon" },
              { k: "tide", n: 1 },
            ],
          },
          {
            text: "content:events.maraTwiceStall.out.waitSoldOut",
            weight: 1,
            effects: [
              { k: "tide", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
          },
        ],
      },
      {
        id: "playBoth",
        label: "content:events.maraTwiceStall.opt.playBoth",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.maraTwiceStall.out.playPass",
            effects: [
              { k: "scrap", n: 50 },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.maraTwiceStall.out.playFail",
            effects: [
              { k: "scrap", n: -20 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "warnHer",
        label: "content:events.maraTwiceStall.opt.warnHer",
        outcomes: [
          {
            text: "content:events.maraTwiceStall.out.warnHer",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
            ],
          },
          {
            text: "content:events.maraTwiceStall.out.warnHerDoubt",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
      {
        id: "robLater",
        label: "content:events.maraTwiceStall.opt.robLater",
        outcomes: [
          {
            text: "content:events.maraTwiceStall.out.robLater",
            weight: 3,
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.maraTwiceRobbed",
          },
          {
            text: "content:events.maraTwiceStall.out.robLaterCaught",
            weight: 1,
            effects: [
              { k: "scrap", n: 25 },
              { k: "hull", n: -8 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.maraTwiceRobbed",
          },
        ],
      },
    ],
  },
  {
    id: "courierNetwork",
    weight: 15,
    requires: { sector: [3], flags: { all: ["courierFreed"] } },
    text: "content:events.courierNetwork.text",
    dialogue: [
      { who: "narration", line: "content:events.courierNetwork.dia.l1" },
      { who: "echo", line: "content:events.courierNetwork.dia.l2" },
    ],
    options: [
      {
        id: "joinRing",
        label: "content:events.courierNetwork.opt.joinRing",
        outcomes: [
          {
            text: "content:events.courierNetwork.out.joinRing",
            weight: 3,
            effects: [
              { k: "flag", key: "courierDiscount", value: 2 },
              { k: "scrap", n: 20 },
            ],
            consequence: "content:consequence.courierRing",
          },
          {
            text: "content:events.courierNetwork.out.joinRingHot",
            weight: 1,
            effects: [
              { k: "flag", key: "courierDiscount", value: 2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.courierRing",
          },
        ],
      },
      {
        id: "buyPacket",
        label: "content:events.courierNetwork.opt.buyPacket",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.courierNetwork.out.buyPacket",
            weight: 2,
            effects: [
              { k: "scrap", n: -30 },
              { k: "loot", rarity: "rare" },
            ],
          },
          {
            text: "content:events.courierNetwork.out.buyPacketChart",
            weight: 1,
            effects: [
              { k: "scrap", n: -30 },
              { k: "nodeMod", mod: "sectorReveal", n: 1 },
            ],
          },
        ],
      },
      {
        id: "askLane",
        label: "content:events.courierNetwork.opt.askLane",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.courierNetwork.out.askPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "axis", n: 1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.courierNetwork.out.askFail",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "netRing",
        label: "content:events.courierNetwork.opt.netRing",
        outcomes: [
          {
            text: "content:events.courierNetwork.out.netRing",
            weight: 3,
            effects: [
              { k: "scrap", n: 70 },
              { k: "axis", n: -2 },
              { k: "flag", key: "courierNetted" },
            ],
            consequence: "content:consequence.courierRingNetted",
          },
          {
            text: "content:events.courierNetwork.out.netRingScatter",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "hull", n: -6 },
              { k: "axis", n: -2 },
              { k: "flag", key: "courierNetted" },
            ],
            consequence: "content:consequence.courierRingNetted",
          },
        ],
      },
    ],
  },
  {
    id: "answeredNotice",
    weight: 15,
    requires: { sector: [3], flags: { all: ["boardPosted"] } },
    text: "content:events.answeredNotice.text",
    options: [
      {
        id: "readReply",
        label: "content:events.answeredNotice.opt.readReply",
        outcomes: [
          {
            text: "content:events.answeredNotice.out.readReply",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "scrap", n: 25 },
            ],
          },
          {
            text: "content:events.answeredNotice.out.readReplyWarning",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
      {
        id: "writeBack",
        label: "content:events.answeredNotice.opt.writeBack",
        check: { dice: 3, pick: "sum", target: 13 },
        onPass: [
          {
            text: "content:events.answeredNotice.out.writePass",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.noticeAnswered",
          },
        ],
        onFail: [
          {
            text: "content:events.answeredNotice.out.writeFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.noticeAnswered",
          },
        ],
      },
      {
        id: "followHeading",
        label: "content:events.answeredNotice.opt.followHeading",
        outcomes: [
          {
            text: "content:events.answeredNotice.out.followHeading",
            weight: 2,
            effects: [
              { k: "scrap", n: 55 },
              { k: "hull", n: -6 },
            ],
          },
          {
            text: "content:events.answeredNotice.out.followHeadingAmbush",
            weight: 1,
            effects: [{ k: "hull", n: -4 }],
            follow: {
              enemyIds: ["paradoxHusk", "echoShade"],
              scrap: 40,
              loot: { rarity: "uncommon" },
            },
          },
        ],
      },
      {
        id: "sinkBuoy",
        label: "content:events.answeredNotice.opt.sinkBuoy",
        outcomes: [
          {
            text: "content:events.answeredNotice.out.sinkBuoy",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 3 },
            ],
          },
          {
            text: "content:events.answeredNotice.out.sinkBuoyQuiet",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "tide", n: -1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "lighterLoop",
    weight: 14,
    requires: { sector: [3], flags: { any: ["lighterLoaded", "lighterStripped", "lighterStopped"] } },
    text: "content:events.lighterLoop.text",
    options: [
      {
        id: "signForIt",
        label: "content:events.lighterLoop.opt.signForIt",
        requires: { req: "flag", key: "lighterLoaded" },
        outcomes: [
          {
            text: "content:events.lighterLoop.out.signForIt",
            weight: 3,
            effects: [
              { k: "scrap", n: 60 },
              { k: "hull", n: 5 },
            ],
            consequence: "content:consequence.lighterSigned",
          },
          {
            text: "content:events.lighterLoop.out.signForItEarly",
            weight: 1,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.lighterSigned",
          },
        ],
      },
      {
        id: "finishStrip",
        label: "content:events.lighterLoop.opt.finishStrip",
        requires: { req: "flag", key: "lighterStripped" },
        outcomes: [
          {
            text: "content:events.lighterLoop.out.finishStrip",
            weight: 2,
            effects: [
              { k: "scrap", n: 45 },
              { k: "hullMax", n: 3 },
            ],
          },
          {
            text: "content:events.lighterLoop.out.finishStripLive",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "hull", n: -7 },
            ],
          },
        ],
      },
      {
        id: "restartIt",
        label: "content:events.lighterLoop.opt.restartIt",
        requires: { req: "flag", key: "lighterStopped" },
        outcomes: [
          {
            text: "content:events.lighterLoop.out.restartIt",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
          },
          {
            text: "content:events.lighterLoop.out.restartItTow",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "tapIce",
        label: "content:events.lighterLoop.opt.tapIce",
        outcomes: [
          {
            text: "content:events.lighterLoop.out.tapIce",
            weight: 3,
            effects: [{ k: "hull", n: 8 }],
          },
          {
            text: "content:events.lighterLoop.out.tapIceTanks",
            weight: 1,
            effects: [
              { k: "hull", n: 4 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
          },
        ],
      },
      {
        id: "rideWake",
        label: "content:events.lighterLoop.opt.rideWake",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.lighterLoop.out.ridePass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "scrap", n: 25 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.lighterLoop.out.rideFail",
            effects: [
              { k: "hull", n: -7 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "keeperDoubleBuoy",
    weight: 15,
    speaker: "beaconKeeper",
    requires: { sector: [3], flags: { any: ["beacon2", "beaconRebuilt"] } },
    text: "content:events.keeperDoubleBuoy.text",
    dialogue: [
      { who: "beaconKeeper", line: "content:events.keeperDoubleBuoy.dia.l1" },
      { who: "echo", line: "content:events.keeperDoubleBuoy.dia.l2" },
      { who: "beaconKeeper", line: "content:events.keeperDoubleBuoy.dia.l3" },
    ],
    options: [
      {
        id: "foldSignals",
        label: "content:events.keeperDoubleBuoy.opt.foldSignals",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.keeperDoubleBuoy.out.foldPass",
            effects: [
              { k: "flag", key: "keeperTrust" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.keeperBuoyKept",
          },
        ],
        onFail: [
          {
            text: "content:events.keeperDoubleBuoy.out.foldFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "payUpkeep",
        label: "content:events.keeperDoubleBuoy.opt.payUpkeep",
        requires: { req: "scrap", n: 35 },
        outcomes: [
          {
            text: "content:events.keeperDoubleBuoy.out.payUpkeep",
            weight: 3,
            effects: [
              { k: "scrap", n: -35 },
              { k: "flag", key: "keeperTrust" },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
            consequence: "content:consequence.keeperBuoyKept",
          },
          {
            text: "content:events.keeperDoubleBuoy.out.payUpkeepEcho",
            weight: 1,
            effects: [
              { k: "scrap", n: -35 },
              { k: "flag", key: "keeperTrust" },
              { k: "hullMax", n: 4 },
            ],
            consequence: "content:consequence.keeperBuoyKept",
          },
        ],
      },
      {
        id: "recordEcho",
        label: "content:events.keeperDoubleBuoy.opt.recordEcho",
        outcomes: [
          {
            text: "content:events.keeperDoubleBuoy.out.recordEcho",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.keeperDoubleBuoy.out.recordEchoNoticed",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "cutBuoy",
        label: "content:events.keeperDoubleBuoy.opt.cutBuoy",
        outcomes: [
          {
            text: "content:events.keeperDoubleBuoy.out.cutBuoy",
            weight: 2,
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.keeperDoubleBuoy.out.cutBuoySnap",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "echoTomorrowLog",
    weight: 16,
    requires: { sector: [3] },
    text: "content:events.echoTomorrowLog.text",
    dialogue: [
      { who: "echo", line: "content:events.echoTomorrowLog.dia.l1" },
      { who: "echo", line: "content:events.echoTomorrowLog.dia.l2" },
      { who: "narration", line: "content:events.echoTomorrowLog.dia.l3" },
    ],
    options: [
      {
        id: "readIt",
        label: "content:events.echoTomorrowLog.opt.readIt",
        outcomes: [
          {
            text: "content:events.echoTomorrowLog.out.readIt",
            weight: 3,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "flag", key: "tomorrowLogKept" },
            ],
            consequence: "content:consequence.tomorrowLogKept",
          },
          {
            text: "content:events.echoTomorrowLog.out.readItNextCaptain",
            weight: 1,
            effects: [
              { k: "shards", n: 10 },
              { k: "axis", n: -1 },
              { k: "flag", key: "tomorrowLogKept" },
            ],
            consequence: "content:consequence.tomorrowLogKept",
          },
        ],
      },
      {
        id: "sealIt",
        label: "content:events.echoTomorrowLog.opt.sealIt",
        outcomes: [
          {
            text: "content:events.echoTomorrowLog.out.sealIt",
            weight: 2,
            effects: [
              { k: "hull", n: 6 },
              { k: "flag", key: "tomorrowLogKept" },
            ],
            consequence: "content:consequence.tomorrowLogKept",
          },
          {
            text: "content:events.echoTomorrowLog.out.sealItHum",
            weight: 1,
            effects: [
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
              { k: "flag", key: "tomorrowLogKept" },
            ],
            consequence: "content:consequence.tomorrowLogKept",
          },
        ],
      },
      {
        id: "wipeIt",
        label: "content:events.echoTomorrowLog.opt.wipeIt",
        check: { dice: 2, pick: "lowest", target: 5 },
        onPass: [
          {
            text: "content:events.echoTomorrowLog.out.wipePass",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 4 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.echoTomorrowLog.out.wipeFail",
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "letEchoDecide",
        label: "content:events.echoTomorrowLog.opt.letEchoDecide",
        outcomes: [
          {
            text: "content:events.echoTomorrowLog.out.echoKeeps",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "flag", key: "tomorrowLogKept" },
            ],
            consequence: "content:consequence.tomorrowLogKept",
          },
          {
            text: "content:events.echoTomorrowLog.out.echoDeletes",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bandSurveyors",
    weight: 16,
    requires: { sector: [3] },
    text: "content:events.bandSurveyors.text",
    options: [
      {
        id: "lendSensors",
        label: "content:events.bandSurveyors.opt.lendSensors",
        outcomes: [
          {
            text: "content:events.bandSurveyors.out.lendSensors",
            weight: 3,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "flag", key: "surveyorsAided" },
            ],
            consequence: "content:consequence.surveyorsAided",
          },
          {
            text: "content:events.bandSurveyors.out.lendSensorsPaid",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "flag", key: "surveyorsAided" },
            ],
            consequence: "content:consequence.surveyorsAided",
          },
        ],
      },
      {
        id: "buyTables",
        label: "content:events.bandSurveyors.opt.buyTables",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.bandSurveyors.out.buyTables",
            weight: 2,
            effects: [
              { k: "scrap", n: -30 },
              { k: "nodeMod", mod: "sectorReveal", n: 1 },
            ],
          },
          {
            text: "content:events.bandSurveyors.out.buyTablesOdd",
            weight: 1,
            effects: [
              { k: "scrap", n: -30 },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
          },
        ],
      },
      {
        id: "doctorReading",
        label: "content:events.bandSurveyors.opt.doctorReading",
        check: { dice: 3, pick: "sum", target: 13 },
        onPass: [
          {
            text: "content:events.bandSurveyors.out.doctorPass",
            effects: [
              { k: "scrap", n: 65 },
              { k: "axis", n: -1 },
              { k: "flag", key: "surveyorsFleeced" },
            ],
            consequence: "content:consequence.surveyorsFleeced",
          },
        ],
        onFail: [
          {
            text: "content:events.bandSurveyors.out.doctorFail",
            effects: [
              { k: "scrap", n: 20 },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
              { k: "flag", key: "surveyorsFleeced" },
            ],
            consequence: "content:consequence.surveyorsFleeced",
          },
        ],
      },
      {
        id: "shareLog",
        label: "content:events.bandSurveyors.opt.shareLog",
        requires: { req: "flag", key: "tomorrowLogKept" },
        outcomes: [
          {
            text: "content:events.bandSurveyors.out.shareLog",
            weight: 2,
            effects: [
              { k: "hullMax", n: 5 },
              { k: "axis", n: 1 },
              { k: "flag", key: "surveyorsAided" },
            ],
            consequence: "content:consequence.surveyorsAided",
          },
          {
            text: "content:events.bandSurveyors.out.shareLogRare",
            weight: 1,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "surveyorsAided" },
            ],
            consequence: "content:consequence.surveyorsAided",
          },
        ],
      },
      {
        id: "warnThemOff",
        label: "content:events.bandSurveyors.opt.warnThemOff",
        outcomes: [
          {
            text: "content:events.bandSurveyors.out.warnThemOff",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
          {
            text: "content:events.bandSurveyors.out.warnThemOffLip",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -4 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "surveyorsReturn",
    weight: 14,
    requires: { sector: [3, 4], flags: { any: ["surveyorsAided", "surveyorsFleeced"] } },
    text: "content:events.surveyorsReturn.text",
    options: [
      {
        id: "claimShare",
        label: "content:events.surveyorsReturn.opt.claimShare",
        requires: { req: "flag", key: "surveyorsAided" },
        outcomes: [
          {
            text: "content:events.surveyorsReturn.out.claimShare",
            weight: 3,
            effects: [
              { k: "scrap", n: 45 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
          },
          {
            text: "content:events.surveyorsReturn.out.claimShareCore",
            weight: 1,
            effects: [{ k: "loot", rarity: "rare" }],
          },
        ],
      },
      {
        id: "settleUp",
        label: "content:events.surveyorsReturn.opt.settleUp",
        requires: [
          { req: "flag", key: "surveyorsFleeced" },
          { req: "scrap", n: 40 },
        ],
        outcomes: [
          {
            text: "content:events.surveyorsReturn.out.settleUp",
            weight: 2,
            effects: [
              { k: "scrap", n: -40 },
              { k: "axis", n: 2 },
            ],
          },
          {
            text: "content:events.surveyorsReturn.out.settleUpRefused",
            weight: 1,
            effects: [{ k: "hull", n: -4 }],
            follow: { enemyIds: ["breachDrone", "chaffSwarm"], scrap: 30 },
          },
        ],
      },
      {
        id: "askHorizon",
        label: "content:events.surveyorsReturn.opt.askHorizon",
        outcomes: [
          {
            text: "content:events.surveyorsReturn.out.askHorizon",
            weight: 2,
            effects: [
              { k: "axis", n: -2 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
          {
            text: "content:events.surveyorsReturn.out.askHorizonLong",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "tradeCharts",
        label: "content:events.surveyorsReturn.opt.tradeCharts",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.surveyorsReturn.out.tradePass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.surveyorsReturn.out.tradeFail",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "foldedSermon",
    weight: 15,
    speaker: "choirPreacher",
    requires: { sector: [3] },
    text: "content:events.foldedSermon.text",
    dialogue: [
      { who: "choirPreacher", line: "content:events.foldedSermon.dia.l1" },
      { who: "echo", line: "content:events.foldedSermon.dia.l2" },
      { who: "choirPreacher", line: "content:events.foldedSermon.dia.l3" },
    ],
    options: [
      {
        id: "objectAnyway",
        label: "content:events.foldedSermon.opt.objectAnyway",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.foldedSermon.out.objectPass",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 4 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.foldedSermon.out.objectFail",
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "recordSermon",
        label: "content:events.foldedSermon.opt.recordSermon",
        outcomes: [
          {
            text: "content:events.foldedSermon.out.recordSermon",
            weight: 3,
            effects: [
              { k: "flag", key: "hymnCopied" },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.sermonRecorded",
          },
          {
            text: "content:events.foldedSermon.out.recordSermonCore",
            weight: 1,
            effects: [
              { k: "flag", key: "hymnCopied" },
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.sermonRecorded",
          },
        ],
      },
      {
        id: "skipAhead",
        label: "content:events.foldedSermon.opt.skipAhead",
        outcomes: [
          {
            text: "content:events.foldedSermon.out.skipAhead",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 },
              { k: "tide", n: 1 },
            ],
          },
          {
            text: "content:events.foldedSermon.out.skipAheadEnd",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "nodeMod", mod: "revealRows", n: 4 },
            ],
          },
        ],
      },
      {
        id: "jamHour",
        label: "content:events.foldedSermon.opt.jamHour",
        outcomes: [
          {
            text: "content:events.foldedSermon.out.jamHour",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "scrap", n: 35 },
            ],
          },
          {
            text: "content:events.foldedSermon.out.jamHourBack",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: -5 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "mawScar",
    weight: 16,
    requires: { sector: [3] },
    text: "content:events.mawScar.text",
    options: [
      {
        id: "sweepCores",
        label: "content:events.mawScar.opt.sweepCores",
        outcomes: [
          {
            text: "content:events.mawScar.out.sweepCores",
            weight: 2,
            effects: [{ k: "swapLowestDie" }, { k: "scrap", n: 15 }],
          },
          {
            text: "content:events.mawScar.out.sweepCoresStir",
            weight: 1,
            effects: [{ k: "swapLowestDie" }, { k: "hull", n: -6 }],
          },
        ],
      },
      {
        id: "studyBite",
        label: "content:events.mawScar.opt.studyBite",
        check: { dice: 3, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.mawScar.out.studyPass",
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.mawScar.out.studyFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "hull", n: -5 },
            ],
          },
        ],
      },
      {
        id: "baitIt",
        label: "content:events.mawScar.opt.baitIt",
        outcomes: [
          {
            text: "content:events.mawScar.out.baitIt",
            weight: 3,
            effects: [{ k: "axis", n: -1 }],
            consequence: "content:consequence.mawBaited",
            follow: {
              enemyIds: ["riftWidow"],
              scrap: 45,
              loot: { rarity: "rare" },
            },
          },
          {
            text: "content:events.mawScar.out.baitItPair",
            weight: 1,
            effects: [{ k: "axis", n: -1 }],
            consequence: "content:consequence.mawBaited",
            follow: {
              enemyIds: ["riftWidow", "foldWorm"],
              scrap: 60,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "leaveOffering",
        label: "content:events.mawScar.opt.leaveOffering",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.mawScar.out.leaveOffering",
            weight: 2,
            effects: [
              { k: "scrap", n: -25 },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
          {
            text: "content:events.mawScar.out.leaveOfferingTide",
            weight: 1,
            effects: [
              { k: "scrap", n: -25 },
              { k: "tide", n: -1 },
            ],
          },
        ],
      },
      {
        id: "checkTheLog",
        label: "content:events.mawScar.opt.checkTheLog",
        requires: { req: "flag", key: "tomorrowLogKept" },
        outcomes: [
          {
            text: "content:events.mawScar.out.checkTheLog",
            weight: 2,
            effects: [
              { k: "hullMax", n: 4 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
          {
            text: "content:events.mawScar.out.checkTheLogCore",
            weight: 1,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
      },
    ],
  },
];
