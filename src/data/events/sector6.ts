import type { EventDef } from "@/types/events";

export const SECTOR6_EVENTS: readonly EventDef[] = [
  {
    id: "hushAntechamber",
    weight: 3,
    speaker: "beaconKeeper",
    requires: { sector: [6] },
    text: "content:events.hushAntechamber.text",
    codex: "beyondTheCore",
    options: [
      {
        id: "listen",
        label: "content:events.hushAntechamber.listen",
        outcomes: [
          {
            text: "content:events.hushAntechamber.listenOut",
            effects: [
              { k: "flag", key: "hushHeard" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            codex: "beyondTheCore",
            consequence: "content:consequence.hushHeard",
          },
        ],
      },
      {
        id: "speak",
        label: "content:events.hushAntechamber.speak",
        outcomes: [
          {
            text: "content:events.hushAntechamber.speakOut",
            effects: [
              { k: "flag", key: "hushRefused" },
              { k: "scrap", n: 40 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.hushRefused",
          },
        ],
      },
      {
        id: "pass",
        label: "content:events.hushAntechamber.pass",
        outcomes: [
          {
            text: "content:events.hushAntechamber.passOut",
            effects: [{ k: "hull", n: 4 }],
          },
        ],
      },
    ],
  },
  {
    id: "retroSalvage",
    weight: 3,
    requires: { sector: [6] },
    text: "content:events.retroSalvage.text",
    options: [
      {
        id: "take",
        label: "content:events.retroSalvage.take",
        outcomes: [
          {
            text: "content:events.retroSalvage.takeA",
            weight: 3,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "retroTaken" },
            ],
            consequence: "content:consequence.retroTaken",
          },
          {
            text: "content:events.retroSalvage.takeB",
            weight: 2,
            effects: [
              { k: "hull", n: -8 },
              { k: "flag", key: "retroTaken" },
            ],
            consequence: "content:consequence.retroTaken",
          },
        ],
      },
      {
        id: "log",
        label: "content:events.retroSalvage.log",
        outcomes: [
          {
            text: "content:events.retroSalvage.logOut",
            effects: [
              { k: "scrap", n: 55 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
      {
        id: "leave",
        label: "content:events.retroSalvage.leave",
        outcomes: [
          {
            text: "content:events.retroSalvage.leaveOut",
            effects: [
              { k: "axis", n: -1 },
              { k: "flag", key: "retroLeft" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "foldedYard",
    weight: 3,
    speaker: "mara",
    requires: { sector: [6] },
    text: "content:events.foldedYard.text",
    options: [
      {
        id: "trade",
        label: "content:events.foldedYard.trade",
        requires: { req: "scrap", n: 60 },
        outcomes: [
          {
            text: "content:events.foldedYard.tradeOut",
            effects: [
              { k: "scrap", n: -60 },
              { k: "hullMax", n: 8 },
              { k: "flag", key: "maraBeyond" },
            ],
            consequence: "content:consequence.maraBeyond",
          },
        ],
      },
      {
        id: "ask",
        label: "content:events.foldedYard.ask",
        requires: { req: "flag", key: "maraFriend" },
        outcomes: [
          {
            text: "content:events.foldedYard.askOut",
            effects: [
              { k: "hull", n: 14 },
              { k: "flag", key: "maraBeyond" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 25 },
            ],
            consequence: "content:consequence.maraBeyond",
          },
        ],
      },
      {
        id: "salvage",
        label: "content:events.foldedYard.salvage",
        check: { dice: 3, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.foldedYard.salvagePass",
            effects: [
              { k: "scrap", n: 70 },
              { k: "flag", key: "yardStripped" },
            ],
            consequence: "content:consequence.yardStripped",
          },
        ],
        onFail: [
          {
            text: "content:events.foldedYard.salvageFail",
            effects: [
              { k: "hull", n: -10 },
              { k: "flag", key: "yardStripped" },
            ],
            consequence: "content:consequence.yardStripped",
          },
        ],
      },
    ],
  },
  {
    id: "ghostFleetSignal",
    weight: 3,
    speaker: "yusuf",
    requires: { sector: [6] },
    text: "content:events.ghostFleetSignal.text",
    codex: "echoFleetLog",
    options: [
      {
        id: "answer",
        label: "content:events.ghostFleetSignal.answer",
        outcomes: [
          {
            text: "content:events.ghostFleetSignal.answerOut",
            effects: [
              { k: "flag", key: "fleetRemembered" },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 },
            ],
            codex: "echoFleetLog",
            consequence: "content:consequence.fleetRemembered",
          },
        ],
      },
      {
        id: "record",
        label: "content:events.ghostFleetSignal.record",
        outcomes: [
          {
            text: "content:events.ghostFleetSignal.recordOut",
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: 1 },
              { k: "flag", key: "fleetRecorded" },
            ],
          },
        ],
      },
      {
        id: "jam",
        label: "content:events.ghostFleetSignal.jam",
        outcomes: [
          {
            text: "content:events.ghostFleetSignal.jamOut",
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: 2 },
              { k: "flag", key: "fleetSilenced" },
            ],
            consequence: "content:consequence.fleetSilenced",
          },
        ],
      },
    ],
  },
  {
    id: "causalityAudit",
    weight: 2,
    requires: { sector: [6] },
    text: "content:events.causalityAudit.text",
    options: [
      {
        id: "submit",
        label: "content:events.causalityAudit.submit",
        check: { dice: 2, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.causalityAudit.submitPass",
            effects: [
              { k: "flag", key: "auditFolded" },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.auditFolded",
          },
        ],
        onFail: [
          {
            text: "content:events.causalityAudit.submitFail",
            effects: [
              { k: "flag", key: "auditFolded" },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.auditFolded",
          },
        ],
      },
      {
        id: "forge",
        label: "content:events.causalityAudit.forge",
        outcomes: [
          {
            text: "content:events.causalityAudit.forgeOut",
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -2 },
              { k: "flag", key: "auditForged" },
            ],
            consequence: "content:consequence.auditForged",
          },
        ],
      },
      {
        id: "refuse",
        label: "content:events.causalityAudit.refuse",
        outcomes: [
          {
            text: "content:events.causalityAudit.refuseOut",
            effects: [
              { k: "axis", n: 2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
              { k: "flag", key: "auditRefused" },
            ],
            consequence: "content:consequence.auditRefused",
          },
        ],
      },
    ],
  },
  {
    id: "quietChoir",
    weight: 2,
    speaker: "choirPreacher",
    requires: { sector: [6] },
    text: "content:events.quietChoir.text",
    options: [
      {
        id: "sing",
        label: "content:events.quietChoir.sing",
        outcomes: [
          {
            text: "content:events.quietChoir.singOut",
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "choirQuieted" },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 2 },
            ],
            consequence: "content:consequence.choirQuieted",
          },
        ],
      },
      {
        id: "listen",
        label: "content:events.quietChoir.listen",
        outcomes: [
          {
            text: "content:events.quietChoir.listenOut",
            effects: [
              { k: "flag", key: "choirHeard" },
              { k: "hull", n: 8 },
            ],
          },
        ],
      },
      {
        id: "cut",
        label: "content:events.quietChoir.cut",
        outcomes: [
          {
            text: "content:events.quietChoir.cutOut",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "choirCut" },
              { k: "scrap", n: 35 },
            ],
            consequence: "content:consequence.choirCut",
          },
        ],
      },
    ],
  },
  {
    id: "unwrittenLog",
    weight: 2,
    requires: { sector: [6] },
    text: "content:events.unwrittenLog.text",
    options: [
      {
        id: "read",
        label: "content:events.unwrittenLog.read",
        outcomes: [
          {
            text: "content:events.unwrittenLog.readA",
            weight: 3,
            effects: [
              { k: "flag", key: "logRead" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.logRead",
          },
          {
            text: "content:events.unwrittenLog.readB",
            weight: 1,
            effects: [
              { k: "flag", key: "logRead" },
              { k: "hull", n: -6 },
            ],
            consequence: "content:consequence.logRead",
          },
        ],
      },
      {
        id: "write",
        label: "content:events.unwrittenLog.write",
        outcomes: [
          {
            text: "content:events.unwrittenLog.writeOut",
            effects: [
              { k: "flag", key: "logWritten" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
            consequence: "content:consequence.logWritten",
          },
        ],
      },
      {
        id: "burn",
        label: "content:events.unwrittenLog.burn",
        outcomes: [
          {
            text: "content:events.unwrittenLog.burnOut",
            effects: [
              { k: "flag", key: "logBurned" },
              { k: "axis", n: -1 },
              { k: "scrap", n: 50 },
            ],
            consequence: "content:consequence.logBurned",
          },
        ],
      },
    ],
  },
  {
    id: "stormBreak",
    weight: 3,
    requires: { sector: [6] },
    text: "content:events.stormBreak.text",
    options: [
      {
        id: "ride",
        label: "content:events.stormBreak.ride",
        outcomes: [
          {
            text: "content:events.stormBreak.rideA",
            weight: 2,
            effects: [
              { k: "flag", key: "stormRidden" },
              { k: "nodeMod", mod: "rerollSize", n: 1 },
            ],
            consequence: "content:consequence.stormRidden",
          },
          {
            text: "content:events.stormBreak.rideB",
            weight: 2,
            effects: [
              { k: "flag", key: "stormRidden" },
              { k: "hull", n: -9 },
            ],
            consequence: "content:consequence.stormRidden",
          },
        ],
      },
      {
        id: "anchor",
        label: "content:events.stormBreak.anchor",
        requires: { req: "dieSchool", school: "blue" },
        outcomes: [
          {
            text: "content:events.stormBreak.anchorOut",
            effects: [
              { k: "flag", key: "stormAnchored" },
              { k: "tide", n: -1 },
            ],
            consequence: "content:consequence.stormAnchored",
          },
        ],
      },
      {
        id: "wait",
        label: "content:events.stormBreak.wait",
        outcomes: [
          {
            text: "content:events.stormBreak.waitOut",
            effects: [
              { k: "hull", n: 6 },
              { k: "flag", key: "stormWaited" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "secondCaptain",
    weight: 2,
    requires: { sector: [6] },
    text: "content:events.secondCaptain.text",
    codex: "secondCaptain",
    options: [
      {
        id: "trade",
        label: "content:events.secondCaptain.trade",
        outcomes: [
          {
            text: "content:events.secondCaptain.tradeOut",
            effects: [
              { k: "swapLowestDie" },
              { k: "flag", key: "twinTraded" },
            ],
            codex: "secondCaptain",
            consequence: "content:consequence.twinTraded",
          },
        ],
      },
      {
        id: "warn",
        label: "content:events.secondCaptain.warn",
        outcomes: [
          {
            text: "content:events.secondCaptain.warnOut",
            effects: [
              { k: "flag", key: "twinWarned" },
              { k: "axis", n: 2 },
              { k: "hull", n: 6 },
            ],
            consequence: "content:consequence.twinWarned",
          },
        ],
      },
      {
        id: "fight",
        label: "content:events.secondCaptain.fight",
        outcomes: [
          {
            text: "content:events.secondCaptain.fightOut",
            effects: [
              { k: "flag", key: "twinFought" },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.twinFought",
            follow: {
              enemyIds: ["retroEcho", "foldWraith"],
              scrap: 60,
              loot: { rarity: "rare" },
              setFlags: [["twinBeaten", true]],
            },
          },
        ],
      },
    ],
  },
  {
    id: "borrowedTurn",
    weight: 2,
    requires: { sector: [6] },
    text: "content:events.borrowedTurn.text",
    options: [
      {
        id: "borrow",
        label: "content:events.borrowedTurn.borrow",
        outcomes: [
          {
            text: "content:events.borrowedTurn.borrowOut",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 8, battles: 3 },
              { k: "flag", key: "turnBorrowed" },
              { k: "hullMax", n: -5 },
            ],
            consequence: "content:consequence.turnBorrowed",
          },
        ],
      },
      {
        id: "repay",
        label: "content:events.borrowedTurn.repay",
        requires: { req: "flag", key: "turnWritten" },
        outcomes: [
          {
            text: "content:events.borrowedTurn.repayOut",
            effects: [
              { k: "flag", key: "turnRepaid" },
              { k: "hull", n: 16 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.turnRepaid",
          },
        ],
      },
      {
        id: "decline",
        label: "content:events.borrowedTurn.decline",
        outcomes: [
          {
            text: "content:events.borrowedTurn.declineOut",
            effects: [
              { k: "scrap", n: 30 },
              { k: "flag", key: "turnDeclined" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "lastKeeper",
    weight: 2,
    speaker: "beaconKeeper",
    requires: { sector: [6], flags: { any: ["beacon5"] } },
    text: "content:events.lastKeeper.text",
    codex: "keeperBeyond",
    options: [
      {
        id: "carry",
        label: "content:events.lastKeeper.carry",
        outcomes: [
          {
            text: "content:events.lastKeeper.carryOut",
            effects: [
              { k: "flag", key: "keeperCarried" },
              { k: "hull", n: 10 },
              { k: "nodeMod", mod: "endHeal", n: 3 },
            ],
            codex: "keeperBeyond",
            consequence: "content:consequence.keeperCarried",
          },
        ],
      },
      {
        id: "relieve",
        label: "content:events.lastKeeper.relieve",
        outcomes: [
          {
            text: "content:events.lastKeeper.relieveOut",
            effects: [
              { k: "flag", key: "keeperRelieved" },
              { k: "axis", n: 1 },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.keeperRelieved",
          },
        ],
      },
      {
        id: "leave",
        label: "content:events.lastKeeper.leave",
        outcomes: [
          {
            text: "content:events.lastKeeper.leaveOut",
            effects: [
              { k: "flag", key: "keeperLeft" },
              { k: "scrap", n: 55 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.keeperLeft",
          },
        ],
      },
    ],
  },
  {
    id: "coreRemainder",
    weight: 2,
    requires: { sector: [6] },
    text: "content:events.coreRemainder.text",
    codex: "coreRemainder",
    options: [
      {
        id: "measure",
        label: "content:events.coreRemainder.measure",
        check: { dice: 2, pick: "lowest", target: 3 },
        onPass: [
          {
            text: "content:events.coreRemainder.measurePass",
            effects: [
              { k: "flag", key: "remainderMeasured" },
              { k: "hullMax", n: 6 },
            ],
            codex: "coreRemainder",
            consequence: "content:consequence.remainderMeasured",
          },
        ],
        onFail: [
          {
            text: "content:events.coreRemainder.measureFail",
            effects: [
              { k: "flag", key: "remainderMeasured" },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.remainderMeasured",
          },
        ],
      },
      {
        id: "keep",
        label: "content:events.coreRemainder.keep",
        outcomes: [
          {
            text: "content:events.coreRemainder.keepOut",
            effects: [
              { k: "loot", rarity: "legendary" },
              { k: "flag", key: "remainderKept" },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.remainderKept",
          },
        ],
      },
      {
        id: "return",
        label: "content:events.coreRemainder.return",
        outcomes: [
          {
            text: "content:events.coreRemainder.returnOut",
            effects: [
              { k: "flag", key: "remainderReturned" },
              { k: "axis", n: 2 },
              { k: "hull", n: 12 },
            ],
            consequence: "content:consequence.remainderReturned",
          },
        ],
      },
    ],
  },
];
