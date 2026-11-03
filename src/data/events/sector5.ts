import type { EventDef } from "@/types/events";

export const SECTOR5_EVENTS: readonly EventDef[] = [
  {
    id: "causalityTide",
    weight: 22,
    requires: { sector: [5] },
    text: "content:events.causalityTide.text",
    options: [
      {
        id: "steady",
        label: "content:events.causalityTide.opt.steady",
        requires: { req: "axis", min: 4 },
        outcomes: [
          {
            text: "content:events.causalityTide.out.steady",
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "hull", n: 8 },
            ],
            consequence: "content:consequence.tideSteadied",
          },
        ],
      },
      {
        id: "rideTide",
        label: "content:events.causalityTide.opt.rideTide",
        outcomes: [
          {
            text: "content:events.causalityTide.out.rideTide",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "anchorHere",
        label: "content:events.causalityTide.opt.anchorHere",
        outcomes: [
          {
            text: "content:events.causalityTide.out.anchorHere",
            effects: [
              { k: "tide", n: -1 },
              { k: "hull", n: 8 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "coreBargain",
    weight: 20,
    requires: { sector: [5], flags: { all: ["pactSigned"] } },
    text: "content:events.coreBargain.text",
    options: [
      {
        id: "acceptBargain",
        label: "content:events.coreBargain.opt.acceptBargain",
        outcomes: [
          {
            text: "content:events.coreBargain.out.acceptBargain",
            effects: [
              { k: "axis", n: -4 },
              { k: "loot", rarity: "legendary" },
              { k: "flag", key: "bargainReady" },
            ],
            consequence: "content:consequence.pactSigned",
          },
        ],
      },
      {
        id: "renege",
        label: "content:events.coreBargain.opt.renege",
        outcomes: [
          {
            text: "content:events.coreBargain.out.renege",
            effects: [
              { k: "axis", n: 4 },
              { k: "hull", n: -12 },
              { k: "flag", key: "pactBroken" },
            ],
            consequence: "content:consequence.pactSigned",
          },
        ],
      },
      {
        id: "haggle",
        label: "content:events.coreBargain.opt.haggle",
        check: { dice: 3, pick: "sum", target: 15 },
        onPass: [
          {
            text: "content:events.coreBargain.out.hagglePass",
            effects: [
              { k: "axis", n: -2 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "bargainReady" },
            ],
            consequence: "content:consequence.pactSigned",
          },
        ],
        onFail: [
          {
            text: "content:events.coreBargain.out.haggleFail",
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -8 },
              { k: "flag", key: "pactBroken" },
            ],
            consequence: "content:consequence.pactSigned",
          },
        ],
      },
    ],
  },
  {
    id: "hereticFleet",
    weight: 18,
    requires: { sector: [5], flags: { all: ["hereticsArmed"] } },
    text: "content:events.hereticFleet.text",
    options: [
      {
        id: "leadThem",
        label: "content:events.hereticFleet.opt.leadThem",
        requires: { req: "axis", max: -4 },
        outcomes: [
          {
            text: "content:events.hereticFleet.out.leadThem",
            effects: [
              { k: "flag", key: "hereticFleetLed" },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.hereticFleetLed",
          },
        ],
      },
      {
        id: "rideWithThem",
        label: "content:events.hereticFleet.opt.leadThem",
        outcomes: [
          {
            text: "content:events.hereticFleet.out.leadThem",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 8, battles: 6 },
              { k: "axis", n: 2 },
              { k: "flag", key: "hereticFleetLed" },
            ],
            consequence: "content:consequence.hereticsArmed",
          },
        ],
      },
      {
        id: "sendThemHome",
        label: "content:events.hereticFleet.opt.sendThemHome",
        outcomes: [
          {
            text: "content:events.hereticFleet.out.sendThemHome",
            effects: [
              { k: "axis", n: 3 },
              { k: "scrap", n: 80 },
            ],
            consequence: "content:consequence.hereticsArmed",
          },
        ],
      },
    ],
  },
  {
    id: "silentSignal",
    weight: 18,
    speaker: "beaconKeeper",
    requires: { sector: [5], flags: { all: ["silentReady"] } },
    text: "content:events.silentSignal.text",
    options: [
      {
        id: "broadcast",
        label: "content:events.silentSignal.opt.broadcast",
        outcomes: [
          {
            text: "content:events.silentSignal.out.broadcast",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "fleetAnswered" },
              { k: "hullMax", n: 8 },
            ],
            consequence: "content:consequence.silentReady",
            codex: "fleetBlackbox",
          },
        ],
      },
      {
        id: "keepSilent",
        label: "content:events.silentSignal.opt.keepSilent",
        outcomes: [
          {
            text: "content:events.silentSignal.out.keepSilent",
            effects: [
              { k: "axis", n: -1 },
              { k: "loot", rarity: "legendary" },
            ],
            consequence: "content:consequence.silentReady",
          },
        ],
      },
      {
        id: "carryIt",
        label: "content:events.silentSignal.opt.carryIt",
        outcomes: [
          {
            text: "content:events.silentSignal.out.carryIt",
            weight: 2,
            effects: [
              { k: "battleMod", mod: "startCharge", n: 6, battles: 2 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.silentReady",
          },
          {
            text: "content:events.silentSignal.out.carryItStatic",
            weight: 1,
            effects: [
              { k: "battleMod", mod: "startCharge", n: 6, battles: 2 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.silentReady",
          },
        ],
      },
    ],
  },
  {
    id: "defectorReturns",
    weight: 16,
    requires: { sector: [5], flags: { all: ["defectorSaved"] } },
    text: "content:events.defectorReturns.text",
    options: [
      {
        id: "callCrew",
        label: "content:events.defectorReturns.opt.callCrew",
        requires: { req: "flag", key: "defectorCrew" },
        outcomes: [
          {
            text: "content:events.defectorReturns.out.callCrew",
            effects: [
              { k: "hullMax", n: 6 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
              { k: "flag", key: "fleetAnswered" },
            ],
            consequence: "content:consequence.fleetAnswered",
          },
        ],
      },
      {
        id: "takeHerAboard",
        label: "content:events.defectorReturns.opt.takeHerAboard",
        outcomes: [
          {
            text: "content:events.defectorReturns.out.takeHerAboard",
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "flag", key: "defectorCrew" },
            ],
            consequence: "content:consequence.defectorSaved",
          },
        ],
      },
      {
        id: "sendHerBack",
        label: "content:events.defectorReturns.opt.sendHerBack",
        outcomes: [
          {
            text: "content:events.defectorReturns.out.sendHerBack",
            effects: [
              { k: "scrap", n: 70 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.defectorSaved",
          },
        ],
      },
    ],
  },
  {
    id: "brokenLighthouse",
    weight: 20,
    requires: { sector: [5] },
    text: "content:events.brokenLighthouse.text",
    options: [
      {
        id: "relight",
        label: "content:events.brokenLighthouse.opt.relight",
        requires: { req: "scrap", n: 60 },
        outcomes: [
          {
            text: "content:events.brokenLighthouse.out.relight",
            effects: [
              { k: "scrap", n: -60 },
              { k: "axis", n: 3 },
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "flag", key: "lighthouseLit" },
            ],
          },
        ],
      },
      {
        id: "harvestLens",
        label: "content:events.brokenLighthouse.opt.harvestLens",
        outcomes: [
          {
            text: "content:events.brokenLighthouse.out.harvestLens",
            effects: [
              { k: "loot", die: "prismCore" },
              { k: "axis", n: -2 },
            ],
          },
        ],
      },
      {
        id: "reactorLight",
        label: "content:events.brokenLighthouse.opt.reactorLight",
        check: { dice: 2, pick: "sum", target: 9, school: "black" },
        onPass: [
          {
            text: "content:events.brokenLighthouse.out.reactorPass",
            effects: [
              { k: "hull", n: -4 },
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "flag", key: "lighthouseLit" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.brokenLighthouse.out.reactorFail",
            effects: [
              { k: "hull", n: -10 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "unwrittenTurn",
    weight: 20,
    requires: { sector: [5] },
    text: "content:events.unwrittenTurn.text",
    options: [
      {
        id: "writeIt",
        label: "content:events.unwrittenTurn.opt.writeIt",
        check: { dice: 3, pick: "sum", target: 14 },
        onPass: [
          {
            text: "content:events.unwrittenTurn.out.writePass",
            effects: [
              { k: "loot", rarity: "legendary" },
              { k: "flag", key: "turnWritten" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.unwrittenTurn.out.writeFail",
            effects: [
              { k: "hull", n: -10 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "leaveBlank",
        label: "content:events.unwrittenTurn.opt.leaveBlank",
        outcomes: [
          {
            text: "content:events.unwrittenTurn.out.leaveBlank",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 6 },
            ],
          },
        ],
      },
      {
        id: "writeSmall",
        label: "content:events.unwrittenTurn.opt.writeSmall",
        outcomes: [
          {
            text: "content:events.unwrittenTurn.out.writeSmall",
            weight: 2,
            effects: [
              { k: "flag", key: "turnWritten" },
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.unwrittenTurn.out.writeSmallTorn",
            weight: 1,
            effects: [
              { k: "flag", key: "turnWritten" },
              { k: "hull", n: -5 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "coreChoirWreck",
    weight: 18,
    requires: { sector: [5] },
    text: "content:events.coreChoirWreck.text",
    options: [
      {
        id: "salvageIt",
        label: "content:events.coreChoirWreck.opt.salvageIt",
        outcomes: [
          {
            text: "content:events.coreChoirWreck.out.salvageIt",
            effects: [{ k: "scrap", n: 55 }],
            follow: {
              enemyIds: ["coreSentinel"],
              scrap: 70,
              loot: { rarity: "legendary" },
            },
          },
        ],
      },
      {
        id: "readNames",
        label: "content:events.coreChoirWreck.opt.readNames",
        outcomes: [
          {
            text: "content:events.coreChoirWreck.out.readNames",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 3 },
            ],
            codex: "coreThreshold",
          },
        ],
      },
      {
        id: "stripQuietly",
        label: "content:events.coreChoirWreck.opt.stripQuietly",
        check: { dice: 2, pick: "lowest", target: 5 },
        onPass: [
          {
            text: "content:events.coreChoirWreck.out.quietPass",
            effects: [
              { k: "scrap", n: 45 },
              { k: "hullMax", n: 4 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.coreChoirWreck.out.quietFail",
            effects: [{ k: "scrap", n: 20 }],
            follow: {
              enemyIds: ["coreSentinel"],
              scrap: 50,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "lastMarket",
    weight: 20,
    speaker: "mara",
    requires: { sector: [5] },
    text: "content:events.lastMarket.text",
    options: [
      {
        id: "buyOut",
        label: "content:events.lastMarket.opt.buyOut",
        requires: { req: "scrap", n: 90 },
        outcomes: [
          {
            text: "content:events.lastMarket.out.buyOut",
            effects: [
              { k: "scrap", n: -90 },
              { k: "loot", rarity: "legendary" },
              { k: "flag", key: "maraFriend" },
            ],
          },
        ],
      },
      {
        id: "sellShip",
        label: "content:events.lastMarket.opt.sellShip",
        outcomes: [
          {
            text: "content:events.lastMarket.out.sellShip",
            effects: [
              { k: "scrap", n: 75 },
              { k: "hullMax", n: -5 },
            ],
          },
        ],
      },
      {
        id: "walkPast",
        label: "content:events.lastMarket.opt.walkPast",
        outcomes: [
          {
            text: "content:events.lastMarket.out.walkPast",
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
      {
        id: "haul",
        label: "content:events.lastMarket.opt.haul",
        requires: { req: "cargo", id: "stasisPods" },
        outcomes: [
          {
            text: "content:events.lastMarket.out.haul",
            effects: [{ k: "cargo", id: "stasisPods" }],
            consequence: "content:consequence.cargoTaken",
          },
        ],
      },
    ],
  },
  {
    id: "haulersAtTheCore",
    weight: 18,
    requires: { sector: [5], flags: {any: ["haulersSent", "haulersUsed", "haulersArmed"]} },
    text: "content:events.haulersAtTheCore.text",
    options: [
      {
        id: "thankThem",
        label: "content:events.haulersAtTheCore.opt.thankThem",
        outcomes: [
          {
            text: "content:events.haulersAtTheCore.out.thankThem",
            effects: [
              { k: "flag", key: "picketHeld" },
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.picketHeld",
          },
        ],
      },
      {
        id: "sendThemOff",
        label: "content:events.haulersAtTheCore.opt.sendThemOff",
        outcomes: [
          {
            text: "content:events.haulersAtTheCore.out.sendThemOff",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "picketStood" },
              { k: "hullMax", n: 6 }
            ],
            consequence: "content:consequence.picketStood",
          },
        ],
      },
      {
        id: "armThemAgain",
        label: "content:events.haulersAtTheCore.opt.armThemAgain",
        requires: { req: "scrap", n: 60 },
        outcomes: [
          {
            text: "content:events.haulersAtTheCore.out.armThemAgain",
            effects: [
              { k: "scrap", n: -60 },
              { k: "flag", key: "picketHeld" },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 3 }
            ],
            consequence: "content:consequence.picketHeld",
          },
        ],
      },
    ],
  },
  {
    id: "ledgerAtTheThreshold",
    weight: 17,
    speaker: "choirPreacher",
    requires: { sector: [5], flags: {any: ["brokerDealt", "brokerCleared", "ledgerStruck", "ledgerRead"]} },
    text: "content:events.ledgerAtTheThreshold.text",
    options: [
      {
        id: "signIt",
        label: "content:events.ledgerAtTheThreshold.opt.signIt",
        outcomes: [
          {
            text: "content:events.ledgerAtTheThreshold.out.signIt",
            effects: [
              { k: "flag", key: "bargainReady" },
              { k: "axis", n: -3 },
              { k: "loot", rarity: "rare" }
            ],
            consequence: "content:consequence.bargainReady",
          },
        ],
      },
      {
        id: "tearPage",
        label: "content:events.ledgerAtTheThreshold.opt.tearPage",
        outcomes: [
          {
            text: "content:events.ledgerAtTheThreshold.out.tearPage",
            effects: [
              { k: "flag", key: "ledgerTorn" },
              { k: "flag", key: "choirEnemy" },
              { k: "axis", n: 3 }
            ],
            consequence: "content:consequence.ledgerTorn",
          },
        ],
      },
      {
        id: "writeSomeoneElse",
        label: "content:events.ledgerAtTheThreshold.opt.writeSomeoneElse",
        outcomes: [
          {
            text: "content:events.ledgerAtTheThreshold.out.writeSomeoneElse",
            weight: 2,
            effects: [
              { k: "flag", key: "ledgerTorn" },
              { k: "scrap", n: 80 },
              { k: "axis", n: -2 }
            ],
            consequence: "content:consequence.ledgerTorn",
          },
          {
            text: "content:events.ledgerAtTheThreshold.out.writeSomeoneElseSeen",
            weight: 1,
            effects: [
              { k: "flag", key: "ledgerTorn" },
              { k: "flag", key: "choirEnemy" },
              { k: "hull", n: -10 }
            ],
            consequence: "content:consequence.ledgerTorn",
          },
        ],
      },
    ],
  },
  {
    id: "lastCheckpoint",
    weight: 16,
    speaker: "warden",
    requires: { sector: [5], flags: {any: ["transitPapers", "papersForged", "checkpointOpened", "tribunalSeated", "tribunalDissolved"]} },
    text: "content:events.lastCheckpoint.text",
    options: [
      {
        id: "showPapers",
        label: "content:events.lastCheckpoint.opt.showPapers",
        outcomes: [
          {
            text: "content:events.lastCheckpoint.out.showPapers",
            effects: [
              { k: "flag", key: "lastPostCleared" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.lastPostCleared",
          },
        ],
      },
      {
        id: "relieveHim",
        label: "content:events.lastCheckpoint.opt.relieveHim",
        outcomes: [
          {
            text: "content:events.lastCheckpoint.out.relieveHim",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "lastPostRelieved" },
              { k: "hullMax", n: 8 }
            ],
            consequence: "content:consequence.lastPostRelieved",
          },
        ],
      },
      {
        id: "runPost",
        label: "content:events.lastCheckpoint.opt.runPost",
        outcomes: [
          {
            text: "content:events.lastCheckpoint.out.runPost",
            effects: [
              { k: "flag", key: "lastPostRun" },
              { k: "scrap", n: 40 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }
            ],
            consequence: "content:consequence.lastPostRun",
          },
        ],
      },
    ],
  },
  {
    id: "hospitalConvoy",
    weight: 16,
    requires: { sector: [5], flags: {any: ["triageRun", "queueSold", "pilgrimsFerried", "ferryBought", "ferryWatched"]} },
    text: "content:events.hospitalConvoy.text",
    options: [
      {
        id: "buyTime",
        label: "content:events.hospitalConvoy.opt.buyTime",
        outcomes: [
          {
            text: "content:events.hospitalConvoy.out.buyTime",
            effects: [
              { k: "hull", n: -12 },
              { k: "flag", key: "convoyCovered" },
              { k: "axis", n: 2 }
            ],
            consequence: "content:consequence.convoyCovered",
          },
        ],
      },
      {
        id: "moveThem",
        label: "content:events.hospitalConvoy.opt.moveThem",
        outcomes: [
          {
            text: "content:events.hospitalConvoy.out.moveThem",
            effects: [
              { k: "flag", key: "convoyMoved" },
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "scrap", n: 35 }
            ],
            consequence: "content:consequence.convoyMoved",
          },
        ],
      },
      {
        id: "takeTheatre",
        label: "content:events.hospitalConvoy.opt.takeTheatre",
        outcomes: [
          {
            text: "content:events.hospitalConvoy.out.takeTheatre",
            effects: [
              { k: "hullMax", n: 12 },
              { k: "axis", n: -2 },
              { k: "flag", key: "theatreTaken" }
            ],
            consequence: "content:consequence.theatreTaken",
          },
        ],
      },
    ],
  },
  {
    id: "riftAudit",
    weight: 15,
    requires: { sector: [5], flags: {any: ["riftSettled", "riftDisputed"]} },
    text: "content:events.riftAudit.text",
    options: [
      {
        id: "acceptAudit",
        label: "content:events.riftAudit.opt.acceptAudit",
        outcomes: [
          {
            text: "content:events.riftAudit.out.acceptAudit",
            effects: [
              { k: "flag", key: "auditAccepted" },
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            consequence: "content:consequence.auditAccepted",
          },
        ],
      },
      {
        id: "contestIt",
        label: "content:events.riftAudit.opt.contestIt",
        check: { dice: 3, pick: "sum", target: 14, school: "black" },
        onPass: [
          {
            text: "content:events.riftAudit.out.contestPass",
            effects: [
              { k: "flag", key: "auditBeaten" },
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 }
            ],
            consequence: "content:consequence.auditBeaten",
          },
        ],
        onFail: [
          {
            text: "content:events.riftAudit.out.contestFail",
            effects: [
              { k: "flag", key: "auditAccepted" },
              { k: "hull", n: -14 }
            ],
            consequence: "content:consequence.auditAccepted",
          },
        ],
      },
      {
        id: "burnBooks",
        label: "content:events.riftAudit.opt.burnBooks",
        outcomes: [
          {
            text: "content:events.riftAudit.out.burnBooks",
            effects: [
              { k: "flag", key: "auditBurned" },
              { k: "tide", n: 1 },
              { k: "scrap", n: 70 }
            ],
            consequence: "content:consequence.auditBurned",
          },
        ],
      },
    ],
  },
  {
    id: "doubleAtTheDoor",
    weight: 15,
    requires: { sector: [5], flags: {any: ["twinBoarded", "twinHailed", "twinLeft"]} },
    text: "content:events.doubleAtTheDoor.text",
    options: [
      {
        id: "letItGoFirst",
        label: "content:events.doubleAtTheDoor.opt.letItGoFirst",
        outcomes: [
          {
            text: "content:events.doubleAtTheDoor.out.letItGoFirst",
            effects: [
              { k: "flag", key: "doubleAhead" },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 2 }
            ],
            consequence: "content:consequence.doubleAhead",
          },
        ],
      },
      {
        id: "takeItsName",
        label: "content:events.doubleAtTheDoor.opt.takeItsName",
        outcomes: [
          {
            text: "content:events.doubleAtTheDoor.out.takeItsName",
            effects: [
              { k: "flag", key: "doubleNamed" },
              { k: "loot", rarity: "rare" },
              { k: "hullMax", n: -4 }
            ],
            consequence: "content:consequence.doubleNamed",
          },
        ],
      },
      {
        id: "goTogether",
        label: "content:events.doubleAtTheDoor.opt.goTogether",
        outcomes: [
          {
            text: "content:events.doubleAtTheDoor.out.goTogether",
            effects: [
              { k: "flag", key: "doubleJoined" },
              { k: "axis", n: 1 },
              { k: "hullMax", n: 8 }
            ],
            consequence: "content:consequence.doubleJoined",
          },
        ],
      },
    ],
  },
  {
    id: "hymnAtTheEdge",
    weight: 15,
    requires: { sector: [5], flags: {any: ["hymnSchoolSeen", "hymnSchoolBroken"]} },
    text: "content:events.hymnAtTheEdge.text",
    options: [
      {
        id: "takeThemHome",
        label: "content:events.hymnAtTheEdge.opt.takeThemHome",
        outcomes: [
          {
            text: "content:events.hymnAtTheEdge.out.takeThemHome",
            effects: [
              { k: "axis", n: 3 },
              { k: "flag", key: "childrenTaken" },
              { k: "hullMax", n: -4 }
            ],
            consequence: "content:consequence.childrenTaken",
          },
        ],
      },
      {
        id: "singWithThem",
        label: "content:events.hymnAtTheEdge.opt.singWithThem",
        outcomes: [
          {
            text: "content:events.hymnAtTheEdge.out.singWithThem",
            effects: [
              { k: "axis", n: -3 },
              { k: "flag", key: "childrenJoined" },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 3 }
            ],
            consequence: "content:consequence.childrenJoined",
          },
        ],
      },
      {
        id: "giveThemEngines",
        label: "content:events.hymnAtTheEdge.opt.giveThemEngines",
        requires: { req: "scrap", n: 70 },
        outcomes: [
          {
            text: "content:events.hymnAtTheEdge.out.giveThemEngines",
            effects: [
              { k: "scrap", n: -70 },
              { k: "axis", n: 2 },
              { k: "flag", key: "childrenTaken" },
              { k: "nodeMod", mod: "endHeal", n: 2 }
            ],
            consequence: "content:consequence.childrenTaken",
          },
        ],
      },
    ],
  },
  {
    id: "finalCount",
    weight: 15,
    requires: { sector: [5], flags: {any: ["censusHelped", "censusBought", "censusTold"]} },
    text: "content:events.finalCount.text",
    options: [
      {
        id: "readThemOut",
        label: "content:events.finalCount.opt.readThemOut",
        outcomes: [
          {
            text: "content:events.finalCount.out.readThemOut",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "namesRead" },
              { k: "flag", key: "silentReady" }
            ],
            consequence: "content:consequence.namesRead",
          },
        ],
      },
      {
        id: "keepList",
        label: "content:events.finalCount.opt.keepList",
        outcomes: [
          {
            text: "content:events.finalCount.out.keepList",
            effects: [
              { k: "flag", key: "namesKept" },
              { k: "loot", rarity: "rare" }
            ],
            consequence: "content:consequence.namesKept",
          },
        ],
      },
      {
        id: "burnList",
        label: "content:events.finalCount.opt.burnList",
        outcomes: [
          {
            text: "content:events.finalCount.out.burnList",
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "namesBurned" },
              { k: "hullMax", n: 6 }
            ],
            consequence: "content:consequence.namesBurned",
          },
        ],
      },
    ],
  },
  {
    id: "approachSilence",
    weight: 14,
    requires: { sector: [5] },
    text: "content:events.approachSilence.text",
    codex: "coreThreshold",
    options: [
      {
        id: "broadcast",
        label: "content:events.approachSilence.opt.broadcast",
        outcomes: [
          {
            text: "content:events.approachSilence.out.broadcast",
            effects: [
              { k: "flag", key: "silenceAnswered" },
              { k: "axis", n: -1 },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.silenceAnswered",
          },
        ],
      },
      {
        id: "listenOnly",
        label: "content:events.approachSilence.opt.listenOnly",
        outcomes: [
          {
            text: "content:events.approachSilence.out.listenOnly",
            effects: [
              { k: "flag", key: "coreListened" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            codex: "coreThreshold",
            consequence: "content:consequence.coreListened",
          },
        ],
      },
      {
        id: "shutDown",
        label: "content:events.approachSilence.opt.shutDown",
        outcomes: [
          {
            text: "content:events.approachSilence.out.shutDown",
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: 10 },
              { k: "flag", key: "silenceRefused" }
            ],
            consequence: "content:consequence.silenceRefused",
          },
        ],
      },
    ],
  },
  {
    id: "lastYard",
    weight: 14,
    requires: { sector: [5] },
    text: "content:events.lastYard.text",
    options: [
      {
        id: "refitHere",
        label: "content:events.lastYard.opt.refitHere",
        requires: { req: "scrap", n: 50 },
        outcomes: [
          {
            text: "content:events.lastYard.out.refitHere",
            effects: [
              { k: "scrap", n: -50 },
              { k: "hullMax", n: 12 },
              { k: "flag", key: "lastYardUsed" }
            ],
            consequence: "content:consequence.lastYardUsed",
          },
        ],
      },
      {
        id: "warnThem",
        label: "content:events.lastYard.opt.warnThem",
        outcomes: [
          {
            text: "content:events.lastYard.out.warnThem",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "lastYardWarned" },
              { k: "nodeMod", mod: "endHeal", n: 1 }
            ],
            consequence: "content:consequence.lastYardWarned",
          },
        ],
      },
      {
        id: "hireCrew",
        label: "content:events.lastYard.opt.hireCrew",
        requires: { req: "scrap", n: 35 },
        outcomes: [
          {
            text: "content:events.lastYard.out.hireCrew",
            weight: 2,
            effects: [
              { k: "scrap", n: -35 },
              { k: "flag", key: "lastYardCrew" },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 }
            ],
            consequence: "content:consequence.lastYardCrew",
          },
          {
            text: "content:events.lastYard.out.hireCrewNone",
            weight: 1,
            effects: [
              { k: "scrap", n: -35 },
              { k: "flag", key: "lastYardCrew" },
              { k: "hullMax", n: 6 }
            ],
            consequence: "content:consequence.lastYardCrew",
          },
        ],
      },
    ],
  },
  {
    id: "thresholdMarket",
    weight: 14,
    speaker: "mara",
    requires: { sector: [5] },
    text: "content:events.thresholdMarket.text",
    options: [
      {
        id: "buyEverything",
        label: "content:events.thresholdMarket.opt.buyEverything",
        requires: { req: "scrap", n: 85 },
        outcomes: [
          {
            text: "content:events.thresholdMarket.out.buyEverything",
            effects: [
              { k: "scrap", n: -85 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "thresholdBought" }
            ],
            consequence: "content:consequence.thresholdBought",
          },
        ],
      },
      {
        id: "askWhose",
        label: "content:events.thresholdMarket.opt.askWhose",
        outcomes: [
          {
            text: "content:events.thresholdMarket.out.askWhose",
            effects: [
              { k: "flag", key: "thresholdAsked" },
              { k: "flag", key: "maraFriend" },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.thresholdAsked",
          },
        ],
      },
      {
        id: "leaveStock",
        label: "content:events.thresholdMarket.opt.leaveStock",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.thresholdMarket.out.leaveStock",
            effects: [
              { k: "scrap", n: -30 },
              { k: "axis", n: 2 },
              { k: "flag", key: "thresholdStocked" },
              { k: "nodeMod", mod: "endHeal", n: 2 }
            ],
            consequence: "content:consequence.thresholdStocked",
          },
        ],
      },
    ],
  },
  {
    id: "courierAtTheCore",
    weight: 15,
    requires: {
      sector: [5],
      flags: { all: ["courierFreed"], not: ["courierNetted"] },
    },
    text: "content:events.courierAtTheCore.text",
    dialogue: [
      { who: "narration", line: "content:events.courierAtTheCore.dia.l1" },
      { who: "echo", line: "content:events.courierAtTheCore.dia.l2" },
    ],
    options: [
      {
        id: "readManifest",
        label: "content:events.courierAtTheCore.opt.readManifest",
        check: { dice: 2, pick: "sum", target: 10 },
        onPass: [
          {
            text: "content:events.courierAtTheCore.out.readPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "scrap", n: 40 },
            ],
            consequence: "content:consequence.courierFreed",
          },
        ],
        onFail: [
          {
            text: "content:events.courierAtTheCore.out.readFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "followIt",
        label: "content:events.courierAtTheCore.opt.followIt",
        outcomes: [
          {
            text: "content:events.courierAtTheCore.out.followIt",
            weight: 3,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
            consequence: "content:consequence.courierFreed",
          },
          {
            text: "content:events.courierAtTheCore.out.followItShort",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "hull", n: -8 },
            ],
            consequence: "content:consequence.courierFreed",
          },
        ],
      },
      {
        id: "sendIn",
        label: "content:events.courierAtTheCore.opt.sendIn",
        outcomes: [
          {
            text: "content:events.courierAtTheCore.out.sendIn",
            weight: 2,
            effects: [
              { k: "flag", key: "courierSentIn" },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.courierSentIn",
          },
          {
            text: "content:events.courierAtTheCore.out.sendInGift",
            weight: 1,
            effects: [
              { k: "flag", key: "courierSentIn" },
              { k: "axis", n: 2 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.courierSentIn",
          },
        ],
      },
      {
        id: "stripIt",
        label: "content:events.courierAtTheCore.opt.stripIt",
        outcomes: [
          {
            text: "content:events.courierAtTheCore.out.stripIt",
            weight: 2,
            effects: [
              { k: "scrap", n: 55 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.courierStripped",
          },
          {
            text: "content:events.courierAtTheCore.out.stripItCalled",
            weight: 1,
            effects: [
              { k: "scrap", n: 55 },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.courierStripped",
          },
        ],
      },
    ],
  },
  {
    id: "mirrorAtTheCore",
    weight: 15,
    requires: { sector: [5], flags: { any: ["mirrorBound", "mirrorBroken"] } },
    text: "content:events.mirrorAtTheCore.text",
    options: [
      {
        id: "takeItsLane",
        label: "content:events.mirrorAtTheCore.opt.takeItsLane",
        outcomes: [
          {
            text: "content:events.mirrorAtTheCore.out.takeItsLane",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.mirrorAtTheCore.out.takeItsLaneHurt",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "hull", n: -10 },
            ],
          },
        ],
      },
      {
        id: "fireOnIt",
        label: "content:events.mirrorAtTheCore.opt.fireOnIt",
        check: { dice: 3, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.mirrorAtTheCore.out.firePass",
            effects: [
              { k: "axis", n: 2 },
              { k: "loot", rarity: "rare" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.mirrorAtTheCore.out.fireFail",
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -12 },
            ],
          },
        ],
      },
      {
        id: "letItGo",
        label: "content:events.mirrorAtTheCore.opt.letItGo",
        requires: { req: "flag", key: "mirrorBound" },
        outcomes: [
          {
            text: "content:events.mirrorAtTheCore.out.letItGo",
            weight: 2,
            effects: [
              { k: "flag", key: "mirrorSentHome" },
              { k: "hullMax", n: 5 },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.mirrorBound",
          },
          {
            text: "content:events.mirrorAtTheCore.out.letItGoTrade",
            weight: 1,
            effects: [
              { k: "flag", key: "mirrorSentHome" },
              { k: "hullMax", n: 5 },
              { k: "swapLowestDie" },
            ],
            consequence: "content:consequence.mirrorBound",
          },
        ],
      },
      {
        id: "gatherPieces",
        label: "content:events.mirrorAtTheCore.opt.gatherPieces",
        requires: { req: "flag", key: "mirrorBroken" },
        outcomes: [
          {
            text: "content:events.mirrorAtTheCore.out.gatherPieces",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.mirrorPieces",
          },
          {
            text: "content:events.mirrorAtTheCore.out.gatherPiecesAwake",
            weight: 1,
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.mirrorPieces",
            follow: { enemyIds: ["causalWard"], scrap: 45 },
          },
        ],
      },
    ],
  },
  {
    id: "yusufAtTheCore",
    weight: 16,
    speaker: "yusuf",
    requires: { sector: [5], flags: { any: ["fleetLaneOpen", "fleetLaneClosed"] } },
    text: "content:events.yusufAtTheCore.text",
    dialogue: [
      { who: "yusuf", line: "content:events.yusufAtTheCore.dia.l1" },
      { who: "yusuf", line: "content:events.yusufAtTheCore.dia.l2" },
      { who: "echo", line: "content:events.yusufAtTheCore.dia.l3" },
    ],
    options: [
      {
        id: "sendHome",
        label: "content:events.yusufAtTheCore.opt.sendHome",
        outcomes: [
          {
            text: "content:events.yusufAtTheCore.out.sendHome",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 4 },
            ],
          },
          {
            text: "content:events.yusufAtTheCore.out.sendHomeFuel",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "scrap", n: -30 },
            ],
          },
        ],
      },
      {
        id: "holdEdge",
        label: "content:events.yusufAtTheCore.opt.holdEdge",
        outcomes: [
          {
            text: "content:events.yusufAtTheCore.out.holdEdge",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "axis", n: 1 },
            ],
          },
          {
            text: "content:events.yusufAtTheCore.out.holdEdgeClipped",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "takeGunners",
        label: "content:events.yusufAtTheCore.opt.takeGunners",
        outcomes: [
          {
            text: "content:events.yusufAtTheCore.out.takeGunners",
            weight: 2,
            effects: [{ k: "battleMod", mod: "startCharge", n: 6, battles: 3 }],
          },
          {
            text: "content:events.yusufAtTheCore.out.takeGunnersOne",
            weight: 1,
            effects: [
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 },
              { k: "hullMax", n: 3 },
            ],
          },
        ],
      },
      {
        id: "collectLane",
        label: "content:events.yusufAtTheCore.opt.collectLane",
        requires: { req: "flag", key: "fleetLaneOpen" },
        outcomes: [
          {
            text: "content:events.yusufAtTheCore.out.collectLane",
            weight: 2,
            effects: [{ k: "loot", rarity: "rare" }],
            consequence: "content:consequence.fleetLaneOpen",
          },
          {
            text: "content:events.yusufAtTheCore.out.collectLaneWelded",
            weight: 1,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "hullMax", n: 4 },
            ],
            consequence: "content:consequence.fleetLaneOpen",
          },
        ],
      },
      {
        id: "squarePinch",
        label: "content:events.yusufAtTheCore.opt.squarePinch",
        requires: [
          { req: "flag", key: "fleetLaneClosed" },
          { req: "scrap", n: 50 },
        ],
        outcomes: [
          {
            text: "content:events.yusufAtTheCore.out.squarePinch",
            weight: 2,
            effects: [
              { k: "scrap", n: -50 },
              { k: "axis", n: 3 },
            ],
            consequence: "content:consequence.pinchSquared",
          },
          {
            text: "content:events.yusufAtTheCore.out.squarePinchMedic",
            weight: 1,
            effects: [
              { k: "scrap", n: -50 },
              { k: "axis", n: 3 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
            consequence: "content:consequence.pinchSquared",
          },
        ],
      },
    ],
  },
  {
    id: "huntressAtTheCore",
    weight: 15,
    speaker: "bountyHuntress",
    requires: {
      sector: [5],
      flags: { all: ["hunterEngaged"], not: ["hunterSquared"] },
    },
    text: "content:events.huntressAtTheCore.text",
    dialogue: [
      { who: "echo", line: "content:events.huntressAtTheCore.dia.l1" },
      { who: "bountyHuntress", line: "content:events.huntressAtTheCore.dia.l2" },
    ],
    options: [
      {
        id: "payIt",
        label: "content:events.huntressAtTheCore.opt.payIt",
        requires: { req: "scrap", n: 60 },
        outcomes: [
          {
            text: "content:events.huntressAtTheCore.out.payIt",
            weight: 2,
            effects: [
              { k: "scrap", n: -60 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.huntressAtCore",
          },
          {
            text: "content:events.huntressAtTheCore.out.payItCrate",
            weight: 1,
            effects: [
              { k: "scrap", n: -60 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.huntressAtCore",
          },
        ],
      },
      {
        id: "settleIt",
        label: "content:events.huntressAtTheCore.opt.settleIt",
        outcomes: [
          {
            text: "content:events.huntressAtTheCore.out.settleIt",
            weight: 2,
            effects: [{ k: "battleMod", mod: "startCharge", n: 4, battles: 1 }],
            consequence: "content:consequence.huntressAtCore",
            follow: {
              enemyIds: ["bountyHuntress"],
              scrap: 60,
              loot: { rarity: "rare" },
            },
          },
          {
            text: "content:events.huntressAtTheCore.out.settleItHers",
            weight: 1,
            effects: [{ k: "hull", n: -6 }],
            consequence: "content:consequence.huntressAtCore",
            follow: {
              enemyIds: ["bountyHuntress"],
              scrap: 60,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "hireHer",
        label: "content:events.huntressAtTheCore.opt.hireHer",
        requires: [
          { req: "flag", key: "hunterAllied" },
          { req: "scrap", n: 30 },
        ],
        outcomes: [
          {
            text: "content:events.huntressAtTheCore.out.hireHer",
            weight: 2,
            effects: [
              { k: "scrap", n: -30 },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 4 },
            ],
            consequence: "content:consequence.huntressAtCore",
          },
          {
            text: "content:events.huntressAtTheCore.out.hireHerShort",
            weight: 1,
            effects: [
              { k: "scrap", n: -30 },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 2 },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.huntressAtCore",
          },
        ],
      },
      {
        id: "counterBounty",
        label: "content:events.huntressAtTheCore.opt.counterBounty",
        check: { dice: 3, pick: "sum", target: 14 },
        onPass: [
          {
            text: "content:events.huntressAtTheCore.out.counterPass",
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.huntressAtCore",
          },
        ],
        onFail: [
          {
            text: "content:events.huntressAtTheCore.out.counterFail",
            effects: [
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.huntressAtCore",
          },
        ],
      },
    ],
  },
  {
    id: "echoLastOrders",
    weight: 16,
    requires: { sector: [5] },
    text: "content:events.echoLastOrders.text",
    dialogue: [
      { who: "echo", line: "content:events.echoLastOrders.dia.l1" },
      { who: "echo", line: "content:events.echoLastOrders.dia.l2" },
      { who: "echo", line: "content:events.echoLastOrders.dia.l3" },
    ],
    options: [
      {
        id: "sendReport",
        label: "content:events.echoLastOrders.opt.sendReport",
        outcomes: [
          {
            text: "content:events.echoLastOrders.out.sendReport",
            weight: 2,
            effects: [
              { k: "flag", key: "echoReportSent" },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 2 },
            ],
            consequence: "content:consequence.echoReportSent",
          },
          {
            text: "content:events.echoLastOrders.out.sendReportLoud",
            weight: 1,
            effects: [
              { k: "flag", key: "echoReportSent" },
              { k: "axis", n: -2 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.echoReportSent",
          },
        ],
      },
      {
        id: "burnOrders",
        label: "content:events.echoLastOrders.opt.burnOrders",
        outcomes: [
          {
            text: "content:events.echoLastOrders.out.burnOrders",
            weight: 3,
            effects: [
              { k: "axis", n: 3 },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
          },
          {
            text: "content:events.echoLastOrders.out.burnOrdersShot",
            weight: 1,
            effects: [
              { k: "axis", n: 3 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "readRest",
        label: "content:events.echoLastOrders.opt.readRest",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.echoLastOrders.out.readPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "loot", rarity: "uncommon" },
            ],
            codex: "echoFleetLog",
          },
        ],
        onFail: [
          {
            text: "content:events.echoLastOrders.out.readFail",
            effects: [
              { k: "hull", n: -6 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "fakeScuttle",
        label: "content:events.echoLastOrders.opt.fakeScuttle",
        outcomes: [
          {
            text: "content:events.echoLastOrders.out.fakeScuttle",
            weight: 1,
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.echoLastOrders.out.fakeScuttleChecked",
            weight: 1,
            effects: [
              { k: "scrap", n: 60 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "askEcho",
        label: "content:events.echoLastOrders.opt.askEcho",
        outcomes: [
          {
            text: "content:events.echoLastOrders.out.askEcho",
            weight: 2,
            effects: [
              { k: "hullMax", n: 5 },
              { k: "axis", n: 1 },
            ],
          },
          {
            text: "content:events.echoLastOrders.out.askEchoCurious",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: -1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "unhappeningFight",
    weight: 15,
    requires: { sector: [5] },
    text: "content:events.unhappeningFight.text",
    dialogue: [
      { who: "echo", line: "content:events.unhappeningFight.dia.l1" },
      { who: "narration", line: "content:events.unhappeningFight.dia.l2" },
    ],
    options: [
      {
        id: "strikeNow",
        label: "content:events.unhappeningFight.opt.strikeNow",
        check: { dice: 2, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.unhappeningFight.out.strikePass",
            effects: [
              { k: "scrap", n: 55 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.unhappeningFight.out.strikeFail",
            effects: [{ k: "hull", n: -6 }],
            follow: { enemyIds: ["causalityLoop", "retrocausalMote"], scrap: 40 },
          },
        ],
      },
      {
        id: "readResult",
        label: "content:events.unhappeningFight.opt.readResult",
        outcomes: [
          {
            text: "content:events.unhappeningFight.out.readResult",
            weight: 2,
            effects: [{ k: "battleMod", mod: "startCharge", n: 8, battles: 1 }],
            follow: { enemyIds: ["causalityLoop", "retrocausalMote"], scrap: 50 },
          },
          {
            text: "content:events.unhappeningFight.out.readResultTide",
            weight: 1,
            effects: [
              { k: "battleMod", mod: "startCharge", n: 8, battles: 1 },
              { k: "tide", n: 1 },
            ],
            follow: { enemyIds: ["causalityLoop", "retrocausalMote"], scrap: 50 },
          },
        ],
      },
      {
        id: "keepItDone",
        label: "content:events.unhappeningFight.opt.keepItDone",
        check: { dice: 3, pick: "sum", target: 15 },
        onPass: [
          {
            text: "content:events.unhappeningFight.out.keepPass",
            effects: [
              { k: "flag", key: "turnWritten" },
              { k: "loot", rarity: "rare" },
              { k: "scrap", n: 30 },
            ],
            consequence: "content:consequence.resultKept",
          },
        ],
        onFail: [
          {
            text: "content:events.unhappeningFight.out.keepFail",
            effects: [{ k: "hull", n: -8 }],
            follow: { enemyIds: ["causalityLoop"], scrap: 35 },
          },
        ],
      },
      {
        id: "slipPast",
        label: "content:events.unhappeningFight.opt.slipPast",
        outcomes: [
          {
            text: "content:events.unhappeningFight.out.slipPast",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
          },
          {
            text: "content:events.unhappeningFight.out.slipPastTide",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "probabilityOrchard",
    weight: 16,
    requires: { sector: [5] },
    text: "content:events.probabilityOrchard.text",
    options: [
      {
        id: "pickRipe",
        label: "content:events.probabilityOrchard.opt.pickRipe",
        check: { dice: 2, pick: "highest", target: 7, tierAtLeast: 8 },
        onPass: [
          {
            text: "content:events.probabilityOrchard.out.pickPass",
            effects: [{ k: "loot", rarity: "rare" }],
          },
        ],
        onFail: [
          {
            text: "content:events.probabilityOrchard.out.pickFail",
            effects: [
              { k: "hull", n: -6 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "graft",
        label: "content:events.probabilityOrchard.opt.graft",
        outcomes: [
          {
            text: "content:events.probabilityOrchard.out.graft",
            weight: 2,
            effects: [
              { k: "swapLowestDie" },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.probabilityOrchard.out.graftTwo",
            weight: 1,
            effects: [
              { k: "swapLowestDie" },
              { k: "loot", rarity: "uncommon" },
            ],
          },
        ],
      },
      {
        id: "carrySeeds",
        label: "content:events.probabilityOrchard.opt.carrySeeds",
        outcomes: [
          {
            text: "content:events.probabilityOrchard.out.carrySeeds",
            weight: 2,
            effects: [
              { k: "flag", key: "orchardSeeded" },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.orchardSeeded",
          },
          {
            text: "content:events.probabilityOrchard.out.carrySeedsSprout",
            weight: 1,
            effects: [
              { k: "flag", key: "orchardSeeded" },
              { k: "axis", n: 2 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.orchardSeeded",
          },
        ],
      },
      {
        id: "stripBare",
        label: "content:events.probabilityOrchard.opt.stripBare",
        outcomes: [
          {
            text: "content:events.probabilityOrchard.out.stripBare",
            weight: 2,
            effects: [
              { k: "scrap", n: 65 },
              { k: "axis", n: -2 },
            ],
          },
          {
            text: "content:events.probabilityOrchard.out.stripBareGardener",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "axis", n: -2 },
            ],
            follow: { enemyIds: ["quietEngine"], scrap: 40 },
          },
        ],
      },
      {
        id: "moorUnder",
        label: "content:events.probabilityOrchard.opt.moorUnder",
        outcomes: [
          {
            text: "content:events.probabilityOrchard.out.moorUnder",
            weight: 3,
            effects: [{ k: "hull", n: 8 }],
          },
          {
            text: "content:events.probabilityOrchard.out.moorUnderFruit",
            weight: 1,
            effects: [
              { k: "hull", n: 8 },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "rimSurveyor",
    weight: 15,
    requires: { sector: [5] },
    text: "content:events.rimSurveyor.text",
    dialogue: [
      { who: "narration", line: "content:events.rimSurveyor.dia.l1" },
      { who: "echo", line: "content:events.rimSurveyor.dia.l2" },
    ],
    options: [
      {
        id: "buyLog",
        label: "content:events.rimSurveyor.opt.buyLog",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.rimSurveyor.out.buyLog",
            weight: 2,
            effects: [
              { k: "scrap", n: -40 },
              { k: "nodeMod", mod: "revealRows", n: 5 },
            ],
          },
          {
            text: "content:events.rimSurveyor.out.buyLogGovernor",
            weight: 1,
            effects: [
              { k: "scrap", n: -40 },
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
          },
        ],
      },
      {
        id: "throwProbe",
        label: "content:events.rimSurveyor.opt.throwProbe",
        outcomes: [
          {
            text: "content:events.rimSurveyor.out.throwProbe",
            weight: 2,
            effects: [
              { k: "flag", key: "probeThrown" },
              { k: "scrap", n: 30 },
            ],
            consequence: "content:consequence.probeThrown",
          },
          {
            text: "content:events.rimSurveyor.out.throwProbeBitten",
            weight: 1,
            effects: [
              { k: "flag", key: "probeThrown" },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.probeThrown",
          },
        ],
      },
      {
        id: "fishShards",
        label: "content:events.rimSurveyor.opt.fishShards",
        check: { dice: 2, pick: "sum", target: 10 },
        onPass: [
          {
            text: "content:events.rimSurveyor.out.fishPass",
            effects: [
              { k: "shards", n: 12 },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.rimSurveyor.out.fishFail",
            effects: [{ k: "hull", n: -10 }],
          },
        ],
      },
      {
        id: "warnHer",
        label: "content:events.rimSurveyor.opt.warnHer",
        outcomes: [
          {
            text: "content:events.rimSurveyor.out.warnHer",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 4 },
            ],
          },
          {
            text: "content:events.rimSurveyor.out.warnHerQuiet",
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
    id: "collapsedStall",
    weight: 14,
    requires: { sector: [5] },
    text: "content:events.collapsedStall.text",
    options: [
      {
        id: "cutHerOut",
        label: "content:events.collapsedStall.opt.cutHerOut",
        outcomes: [
          {
            text: "content:events.collapsedStall.out.cutHerOut",
            weight: 2,
            effects: [{ k: "axis", n: 2 }],
            consequence: "content:consequence.stallCutOut",
            follow: {
              enemyIds: ["stormChanter"],
              scrap: 45,
              loot: { rarity: "rare" },
            },
          },
          {
            text: "content:events.collapsedStall.out.cutHerOutWorse",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.stallCutOut",
            follow: {
              enemyIds: ["stormChanter", "nullDrone"],
              scrap: 55,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "tradeThroughHatch",
        label: "content:events.collapsedStall.opt.tradeThroughHatch",
        requires: { req: "scrap", n: 30 },
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.collapsedStall.out.tradePass",
            effects: [
              { k: "scrap", n: -30 },
              { k: "loot", rarity: "rare" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.collapsedStall.out.tradeFail",
            effects: [
              { k: "scrap", n: -30 },
              { k: "hull", n: -8 },
            ],
          },
        ],
      },
      {
        id: "leaveHer",
        label: "content:events.collapsedStall.opt.leaveHer",
        outcomes: [
          {
            text: "content:events.collapsedStall.out.leaveHer",
            weight: 2,
            effects: [
              { k: "axis", n: -2 },
              { k: "scrap", n: 35 },
            ],
          },
          {
            text: "content:events.collapsedStall.out.leaveHerFollowed",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "scrap", n: 35 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "whatCameBack",
    weight: 15,
    requires: {
      sector: [5, 6],
      flags: {
        any: ["courierSentIn", "echoReportSent", "orchardSeeded", "probeThrown", "mirrorSentHome"],
      },
    },
    text: "content:events.whatCameBack.text",
    dialogue: [
      { who: "echo", line: "content:events.whatCameBack.dia.l1" },
      { who: "narration", line: "content:events.whatCameBack.dia.l2" },
    ],
    options: [
      {
        id: "signForCourier",
        label: "content:events.whatCameBack.opt.signForCourier",
        requires: { req: "flag", key: "courierSentIn" },
        outcomes: [
          {
            text: "content:events.whatCameBack.out.signForCourier",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.courierSentIn",
          },
          {
            text: "content:events.whatCameBack.out.signForCourierBroken",
            weight: 1,
            effects: [
              { k: "loot", rarity: "legendary" },
              { k: "hull", n: -8 },
            ],
            consequence: "content:consequence.courierSentIn",
          },
        ],
      },
      {
        id: "readReply",
        label: "content:events.whatCameBack.opt.readReply",
        requires: { req: "flag", key: "echoReportSent" },
        outcomes: [
          {
            text: "content:events.whatCameBack.out.readReply",
            weight: 2,
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 3 },
            ],
            consequence: "content:consequence.echoReportSent",
          },
          {
            text: "content:events.whatCameBack.out.readReplyShort",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "hullMax", n: 6 },
            ],
            consequence: "content:consequence.echoReportSent",
          },
        ],
      },
      {
        id: "readProbe",
        label: "content:events.whatCameBack.opt.readProbe",
        requires: { req: "flag", key: "probeThrown" },
        outcomes: [
          {
            text: "content:events.whatCameBack.out.readProbe",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "scrap", n: 40 },
            ],
            consequence: "content:consequence.probeThrown",
          },
          {
            text: "content:events.whatCameBack.out.readProbeFast",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 5 },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.probeThrown",
          },
        ],
      },
      {
        id: "openIt",
        label: "content:events.whatCameBack.opt.openIt",
        check: { dice: 3, pick: "sum", target: 14 },
        onPass: [
          {
            text: "content:events.whatCameBack.out.openPass",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "hullMax", n: 5 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.whatCameBack.out.openFail",
            effects: [
              { k: "hull", n: -10 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "sendBack",
        label: "content:events.whatCameBack.opt.sendBack",
        outcomes: [
          {
            text: "content:events.whatCameBack.out.sendBack",
            weight: 2,
            effects: [
              { k: "axis", n: 3 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
          {
            text: "content:events.whatCameBack.out.sendBackThrust",
            weight: 1,
            effects: [
              { k: "axis", n: 3 },
              { k: "scrap", n: -30 },
            ],
          },
        ],
      },
    ],
  },
];
