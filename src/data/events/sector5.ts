import type { EventDef } from "@/types/events";

// Sector 5 — The Core. Nine scenes; four are callbacks
// (pactSigned, hereticsArmed, silentReady, defectorSaved).
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
        id: "leadThem",
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
];
