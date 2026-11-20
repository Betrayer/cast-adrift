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
      {
        id: "haul",
        label: "content:events.retroSalvage.haul",
        requires: { req: "cargo", id: "keeperArchive" },
        outcomes: [
          {
            text: "content:events.retroSalvage.haulOut",
            effects: [{ k: "cargo", id: "keeperArchive" }],
            consequence: "content:consequence.cargoTaken",
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
  {
    id: "lateBounty",
    weight: 2,
    speaker: "bountyHuntress",
    requires: {
      sector: [6],
      flags: { any: ["hunterMark", "hunterEngaged", "hunterPaid", "hunterAllied"] },
    },
    text: "content:events.lateBounty.text",
    dialogue: [
      { who: "bountyHuntress", line: "content:events.lateBounty.dia.l1" },
      { who: "echo", line: "content:events.lateBounty.dia.l2" },
      { who: "bountyHuntress", line: "content:events.lateBounty.dia.l3" },
    ],
    options: [
      {
        id: "buyOut",
        label: "content:events.lateBounty.opt.buyOut",
        requires: { req: "scrap", n: 50 },
        outcomes: [
          {
            text: "content:events.lateBounty.out.buyOutA",
            weight: 3,
            effects: [
              { k: "scrap", n: -50 },
              { k: "flag", key: "bountyVoided" },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
            consequence: "content:consequence.bountyVoided",
          },
          {
            text: "content:events.lateBounty.out.buyOutB",
            weight: 1,
            effects: [
              { k: "scrap", n: -50 },
              { k: "flag", key: "bountyVoided" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.bountyVoided",
          },
        ],
      },
      {
        id: "countersign",
        label: "content:events.lateBounty.opt.countersign",
        outcomes: [
          {
            text: "content:events.lateBounty.out.countersignA",
            weight: 2,
            effects: [
              { k: "flag", key: "bountyTurned" },
              { k: "scrap", n: 45 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.bountyTurned",
          },
          {
            text: "content:events.lateBounty.out.countersignB",
            weight: 1,
            effects: [
              { k: "flag", key: "bountyTurned" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.bountyTurned",
            follow: {
              enemyIds: ["retroEcho", "causalSplinter"],
              scrap: 50,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "callFavor",
        label: "content:events.lateBounty.opt.callFavor",
        requires: { req: "flag", key: "hunterFavorHeld" },
        outcomes: [
          {
            text: "content:events.lateBounty.out.callFavorA",
            weight: 3,
            effects: [
              { k: "flag", key: "bountyVoided" },
              { k: "hull", n: 12 },
            ],
            consequence: "content:consequence.bountyVoided",
          },
          {
            text: "content:events.lateBounty.out.callFavorB",
            weight: 1,
            effects: [
              { k: "flag", key: "bountyVoided" },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.bountyVoided",
          },
        ],
      },
      {
        id: "outrun",
        label: "content:events.lateBounty.opt.outrun",
        check: { dice: 2, pick: "highest", target: 8 },
        onPass: [
          {
            text: "content:events.lateBounty.out.outrunPass",
            effects: [{ k: "nodeMod", mod: "revealRows", n: 3 }],
          },
        ],
        onFail: [
          {
            text: "content:events.lateBounty.out.outrunFail",
            effects: [
              { k: "hull", n: -9 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.bountyStands",
          },
        ],
      },
    ],
  },
  {
    id: "farQuarantine",
    weight: 2,
    speaker: "warden",
    requires: {
      sector: [6],
      flags: {
        any: [
          "wardenAnswered",
          "wardenReleased",
          "postAccepted",
          "rosterWiped",
          "transitPapers",
          "papersForged",
          "checkpointOpened",
          "lastPostCleared",
          "lastPostRelieved",
          "lastPostRun",
        ],
      },
    },
    text: "content:events.farQuarantine.text",
    dialogue: [
      { who: "warden", line: "content:events.farQuarantine.dia.l1" },
      { who: "echo", line: "content:events.farQuarantine.dia.l2" },
    ],
    options: [
      {
        id: "showPapers",
        label: "content:events.farQuarantine.opt.showPapers",
        requires: { req: "flag", key: "transitPapers" },
        outcomes: [
          {
            text: "content:events.farQuarantine.out.showPapersA",
            weight: 3,
            effects: [
              { k: "hull", n: 10 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.cordonPassed",
          },
          {
            text: "content:events.farQuarantine.out.showPapersB",
            weight: 1,
            effects: [{ k: "scrap", n: 50 }],
            consequence: "content:consequence.cordonPassed",
          },
        ],
      },
      {
        id: "override",
        label: "content:events.farQuarantine.opt.override",
        check: { dice: 2, pick: "sum", target: 10, school: "grey" },
        onPass: [
          {
            text: "content:events.farQuarantine.out.overridePass",
            effects: [
              { k: "flag", key: "cordonTurned" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.cordonTurned",
          },
        ],
        onFail: [
          {
            text: "content:events.farQuarantine.out.overrideFail",
            effects: [
              { k: "hull", n: -8 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.cordonAlerted",
          },
        ],
      },
      {
        id: "runLine",
        label: "content:events.farQuarantine.opt.runLine",
        outcomes: [
          {
            text: "content:events.farQuarantine.out.runLineA",
            weight: 3,
            effects: [
              { k: "hull", n: -7 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.farQuarantine.out.runLineB",
            weight: 2,
            effects: [{ k: "axis", n: -1 }],
            follow: {
              enemyIds: ["slowStrider", "hushHerald"],
              scrap: 45,
            },
          },
          {
            text: "content:events.farQuarantine.out.runLineC",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
      },
      {
        id: "stripBuoy",
        label: "content:events.farQuarantine.opt.stripBuoy",
        check: { dice: 2, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.farQuarantine.out.stripBuoyPass",
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.farQuarantine.out.stripBuoyFail",
            effects: [
              { k: "scrap", n: 25 },
              { k: "hull", n: -8 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "echoPrimary",
    weight: 3,
    requires: { sector: [6] },
    text: "content:events.echoPrimary.text",
    dialogue: [
      { who: "echo", line: "content:events.echoPrimary.dia.l1" },
      { who: "echo", line: "content:events.echoPrimary.dia.l2" },
      { who: "narration", line: "content:events.echoPrimary.dia.l3" },
    ],
    options: [
      {
        id: "merge",
        label: "content:events.echoPrimary.opt.merge",
        outcomes: [
          {
            text: "content:events.echoPrimary.out.mergeA",
            weight: 3,
            effects: [
              { k: "flag", key: "primaryMerged" },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 3 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.primaryMerged",
          },
          {
            text: "content:events.echoPrimary.out.mergeB",
            weight: 1,
            effects: [
              { k: "flag", key: "primaryMerged" },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 3 },
              { k: "axis", n: -2 },
              { k: "hull", n: -8 },
            ],
            consequence: "content:consequence.primaryMerged",
          },
        ],
      },
      {
        id: "wipe",
        label: "content:events.echoPrimary.opt.wipe",
        outcomes: [
          {
            text: "content:events.echoPrimary.out.wipeA",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 5 },
            ],
            consequence: "content:consequence.primaryWiped",
          },
          {
            text: "content:events.echoPrimary.out.wipeB",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -7 },
            ],
            consequence: "content:consequence.primaryWiped",
          },
        ],
      },
      {
        id: "interrogate",
        label: "content:events.echoPrimary.opt.interrogate",
        check: { dice: 2, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.echoPrimary.out.interrogatePass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: 1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.echoPrimary.out.interrogateFail",
            effects: [{ k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }],
          },
        ],
      },
      {
        id: "strip",
        label: "content:events.echoPrimary.opt.strip",
        outcomes: [
          {
            text: "content:events.echoPrimary.out.stripA",
            weight: 3,
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.echoPrimary.out.stripB",
            weight: 1,
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -1 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "showRemainder",
        label: "content:events.echoPrimary.opt.showRemainder",
        requires: { req: "flag", key: "remainderKept" },
        outcomes: [
          {
            text: "content:events.echoPrimary.out.showRemainderA",
            weight: 2,
            effects: [
              { k: "hullMax", n: 8 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.primarySeated",
          },
          {
            text: "content:events.echoPrimary.out.showRemainderB",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 3 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.primarySeated",
          },
        ],
      },
    ],
  },
  {
    id: "unwreckedHull",
    weight: 3,
    requires: { sector: [6] },
    text: "content:events.unwreckedHull.text",
    options: [
      {
        id: "board",
        label: "content:events.unwreckedHull.opt.board",
        check: { dice: 3, pick: "sum", target: 15 },
        onPass: [
          {
            text: "content:events.unwreckedHull.out.boardPass",
            effects: [{ k: "loot", rarity: "rare" }],
          },
        ],
        onFail: [
          {
            text: "content:events.unwreckedHull.out.boardFail",
            effects: [{ k: "hull", n: -10 }],
          },
        ],
      },
      {
        id: "warnCrew",
        label: "content:events.unwreckedHull.opt.warnCrew",
        outcomes: [
          {
            text: "content:events.unwreckedHull.out.warnCrewA",
            weight: 2,
            effects: [
              { k: "flag", key: "frigateWarned" },
              { k: "axis", n: 1 },
              { k: "hull", n: 8 },
            ],
            consequence: "content:consequence.frigateWarned",
          },
          {
            text: "content:events.unwreckedHull.out.warnCrewB",
            weight: 2,
            effects: [
              { k: "flag", key: "frigateWarned" },
              { k: "axis", n: 1 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
            consequence: "content:consequence.frigateWarned",
          },
        ],
      },
      {
        id: "harvest",
        label: "content:events.unwreckedHull.opt.harvest",
        outcomes: [
          {
            text: "content:events.unwreckedHull.out.harvestA",
            weight: 3,
            effects: [{ k: "scrap", n: 50 }],
          },
          {
            text: "content:events.unwreckedHull.out.harvestB",
            weight: 1,
            effects: [
              { k: "scrap", n: 50 },
              { k: "hull", n: -7 },
            ],
          },
        ],
      },
      {
        id: "readAhead",
        label: "content:events.unwreckedHull.opt.readAhead",
        requires: { req: "flag", key: "logRead" },
        outcomes: [
          {
            text: "content:events.unwreckedHull.out.readAheadA",
            weight: 3,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "hull", n: 6 },
            ],
          },
          {
            text: "content:events.unwreckedHull.out.readAheadB",
            weight: 1,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "oddsEaterNest",
    weight: 3,
    requires: { sector: [6] },
    text: "content:events.oddsEaterNest.text",
    options: [
      {
        id: "feed",
        label: "content:events.oddsEaterNest.opt.feed",
        outcomes: [
          {
            text: "content:events.oddsEaterNest.out.feedA",
            weight: 3,
            effects: [{ k: "swapLowestDie" }, { k: "axis", n: -1 }],
          },
          {
            text: "content:events.oddsEaterNest.out.feedB",
            weight: 1,
            effects: [
              { k: "swapLowestDie" },
              { k: "axis", n: -1 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
          {
            text: "content:events.oddsEaterNest.out.feedC",
            weight: 1,
            effects: [
              { k: "swapLowestDie" },
              { k: "axis", n: -1 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "burn",
        label: "content:events.oddsEaterNest.opt.burn",
        outcomes: [
          {
            text: "content:events.oddsEaterNest.out.burnA",
            weight: 3,
            effects: [{ k: "axis", n: 1 }],
            follow: {
              enemyIds: ["oddsEater", "causalSplinter"],
              scrap: 55,
              loot: { rarity: "rare" },
            },
          },
          {
            text: "content:events.oddsEaterNest.out.burnB",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: -6 },
              { k: "scrap", n: 35 },
            ],
          },
        ],
      },
      {
        id: "cutFaces",
        label: "content:events.oddsEaterNest.opt.cutFaces",
        check: { dice: 2, pick: "lowest", target: 4, tierAtMost: 6 },
        onPass: [
          {
            text: "content:events.oddsEaterNest.out.cutFacesPass",
            effects: [{ k: "loot", rarity: "rare" }],
          },
        ],
        onFail: [
          {
            text: "content:events.oddsEaterNest.out.cutFacesFail",
            effects: [
              { k: "hull", n: -8 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "sealIt",
        label: "content:events.oddsEaterNest.opt.sealIt",
        outcomes: [
          {
            text: "content:events.oddsEaterNest.out.sealItA",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
          {
            text: "content:events.oddsEaterNest.out.sealItB",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "scrap", n: 25 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "verdictFirst",
    weight: 2,
    requires: { sector: [6] },
    text: "content:events.verdictFirst.text",
    dialogue: [
      { who: "narration", line: "content:events.verdictFirst.dia.l1" },
      { who: "echo", line: "content:events.verdictFirst.dia.l2" },
    ],
    options: [
      {
        id: "serve",
        label: "content:events.verdictFirst.opt.serve",
        outcomes: [
          {
            text: "content:events.verdictFirst.out.serveA",
            weight: 3,
            effects: [
              { k: "hull", n: -8 },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.sentenceServed",
          },
          {
            text: "content:events.verdictFirst.out.serveB",
            weight: 1,
            effects: [
              { k: "hullMax", n: -4 },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.sentenceServed",
          },
        ],
      },
      {
        id: "appeal",
        label: "content:events.verdictFirst.opt.appeal",
        check: { dice: 3, pick: "sum", target: 16 },
        onPass: [
          {
            text: "content:events.verdictFirst.out.appealPass",
            effects: [{ k: "scrap", n: 60 }],
            consequence: "content:consequence.verdictOverturned",
          },
        ],
        onFail: [
          {
            text: "content:events.verdictFirst.out.appealFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "commit",
        label: "content:events.verdictFirst.opt.commit",
        outcomes: [
          {
            text: "content:events.verdictFirst.out.commitA",
            weight: 2,
            effects: [
              { k: "scrap", n: 70 },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.crimeCommitted",
          },
          {
            text: "content:events.verdictFirst.out.commitB",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.crimeCommitted",
          },
        ],
      },
      {
        id: "citeVoid",
        label: "content:events.verdictFirst.opt.citeVoid",
        requires: { req: "flag", key: "bountyVoided" },
        outcomes: [
          {
            text: "content:events.verdictFirst.out.citeVoidA",
            weight: 3,
            effects: [
              { k: "hull", n: 10 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.verdictVoided",
          },
          {
            text: "content:events.verdictFirst.out.citeVoidB",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "shipyardDiscount", n: 25 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.verdictVoided",
          },
        ],
      },
    ],
  },
  {
    id: "fleetAnchorage",
    weight: 2,
    speaker: "yusuf",
    requires: {
      sector: [6],
      flags: {
        any: [
          "fleetAnswered",
          "fleetLaneOpen",
          "fleetTruthShared",
          "fleetTruthKept",
          "yusufFriend",
          "frigateWarned",
        ],
      },
    },
    text: "content:events.fleetAnchorage.text",
    dialogue: [
      { who: "yusuf", line: "content:events.fleetAnchorage.dia.l1" },
      { who: "echo", line: "content:events.fleetAnchorage.dia.l2" },
      { who: "yusuf", line: "content:events.fleetAnchorage.dia.l3" },
    ],
    options: [
      {
        id: "takeBerth",
        label: "content:events.fleetAnchorage.opt.takeBerth",
        outcomes: [
          {
            text: "content:events.fleetAnchorage.out.takeBerthA",
            weight: 3,
            effects: [
              { k: "hull", n: 14 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
            consequence: "content:consequence.berthTaken",
          },
          {
            text: "content:events.fleetAnchorage.out.takeBerthB",
            weight: 1,
            effects: [{ k: "hullMax", n: 6 }],
            consequence: "content:consequence.berthTaken",
          },
        ],
      },
      {
        id: "signMuster",
        label: "content:events.fleetAnchorage.opt.signMuster",
        outcomes: [
          {
            text: "content:events.fleetAnchorage.out.signMusterA",
            weight: 2,
            effects: [
              { k: "flag", key: "fleetRemembered" },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.fleetRemembered",
          },
          {
            text: "content:events.fleetAnchorage.out.signMusterB",
            weight: 2,
            effects: [
              { k: "flag", key: "fleetRemembered" },
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.fleetRemembered",
          },
        ],
      },
      {
        id: "leadOut",
        label: "content:events.fleetAnchorage.opt.leadOut",
        requires: { req: "flag", key: "cordonTurned" },
        outcomes: [
          {
            text: "content:events.fleetAnchorage.out.leadOutA",
            weight: 3,
            effects: [
              { k: "axis", n: 2 },
              { k: "scrap", n: 45 },
            ],
            consequence: "content:consequence.convoyLed",
          },
          {
            text: "content:events.fleetAnchorage.out.leadOutB",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.convoyLed",
          },
        ],
      },
      {
        id: "strip",
        label: "content:events.fleetAnchorage.opt.strip",
        check: { dice: 2, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.fleetAnchorage.out.stripPass",
            effects: [
              { k: "scrap", n: 65 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.anchorageStripped",
          },
        ],
        onFail: [
          {
            text: "content:events.fleetAnchorage.out.stripFail",
            effects: [{ k: "axis", n: -1 }],
            consequence: "content:consequence.anchorageStripped",
            follow: {
              enemyIds: ["slowStrider", "preEcho"],
              scrap: 40,
            },
          },
        ],
      },
      {
        id: "logIt",
        label: "content:events.fleetAnchorage.opt.logIt",
        outcomes: [
          {
            text: "content:events.fleetAnchorage.out.logItA",
            weight: 2,
            effects: [{ k: "nodeMod", mod: "revealRows", n: 3 }],
          },
          {
            text: "content:events.fleetAnchorage.out.logItB",
            weight: 2,
            effects: [{ k: "nodeMod", mod: "shipyardDiscount", n: 25 }],
          },
        ],
      },
    ],
  },
  {
    id: "preacherUnsung",
    weight: 2,
    speaker: "choirPreacher",
    requires: { sector: [6] },
    text: "content:events.preacherUnsung.text",
    dialogue: [
      { who: "choirPreacher", line: "content:events.preacherUnsung.dia.l1" },
      { who: "echo", line: "content:events.preacherUnsung.dia.l2" },
    ],
    options: [
      {
        id: "giveVerse",
        label: "content:events.preacherUnsung.opt.giveVerse",
        check: { dice: 2, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.preacherUnsung.out.giveVersePass",
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 2 },
            ],
            consequence: "content:consequence.verseGiven",
          },
        ],
        onFail: [
          {
            text: "content:events.preacherUnsung.out.giveVerseFail",
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "teachSilence",
        label: "content:events.preacherUnsung.opt.teachSilence",
        outcomes: [
          {
            text: "content:events.preacherUnsung.out.teachSilenceA",
            weight: 3,
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: 8 },
            ],
            consequence: "content:consequence.preacherSilenced",
          },
          {
            text: "content:events.preacherUnsung.out.teachSilenceB",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -5 },
            ],
            consequence: "content:consequence.preacherSilenced",
          },
        ],
      },
      {
        id: "takeCenser",
        label: "content:events.preacherUnsung.opt.takeCenser",
        outcomes: [
          {
            text: "content:events.preacherUnsung.out.takeCenserA",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: 1 },
            ],
          },
          {
            text: "content:events.preacherUnsung.out.takeCenserB",
            weight: 2,
            effects: [
              { k: "scrap", n: 50 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
      {
        id: "emptyPart",
        label: "content:events.preacherUnsung.opt.emptyPart",
        requires: { req: "flag", key: "choirQuieted" },
        outcomes: [
          {
            text: "content:events.preacherUnsung.out.emptyPartA",
            weight: 3,
            effects: [
              { k: "hull", n: 12 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.formationTold",
          },
          {
            text: "content:events.preacherUnsung.out.emptyPartB",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "endHeal", n: 3 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.formationTold",
          },
        ],
      },
    ],
  },
  {
    id: "chartMargin",
    weight: 2,
    requires: { sector: [6] },
    text: "content:events.chartMargin.text",
    options: [
      {
        id: "copyEdge",
        label: "content:events.chartMargin.opt.copyEdge",
        check: { dice: 1, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.chartMargin.out.copyEdgePass",
            effects: [{ k: "shards", n: 10 }],
          },
        ],
        onFail: [
          {
            text: "content:events.chartMargin.out.copyEdgeFail",
            effects: [{ k: "hull", n: -6 }],
          },
        ],
      },
      {
        id: "drawPast",
        label: "content:events.chartMargin.opt.drawPast",
        outcomes: [
          {
            text: "content:events.chartMargin.out.drawPastA",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.chartMargin.out.drawPastB",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: -1 },
              { k: "hull", n: -7 },
            ],
          },
        ],
      },
      {
        id: "askEcho",
        label: "content:events.chartMargin.opt.askEcho",
        requires: { req: "flag", key: "primaryMerged" },
        outcomes: [
          {
            text: "content:events.chartMargin.out.askEchoA",
            weight: 3,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "hull", n: 8 },
            ],
          },
          {
            text: "content:events.chartMargin.out.askEchoB",
            weight: 1,
            effects: [{ k: "battleMod", mod: "startCharge", n: 6, battles: 2 }],
          },
        ],
      },
      {
        id: "leaveEdge",
        label: "content:events.chartMargin.opt.leaveEdge",
        outcomes: [
          {
            text: "content:events.chartMargin.out.leaveEdgeA",
            weight: 3,
            effects: [
              { k: "hull", n: 8 },
              { k: "axis", n: 1 },
            ],
          },
          {
            text: "content:events.chartMargin.out.leaveEdgeB",
            weight: 1,
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "detonationsFirst",
    weight: 3,
    requires: { sector: [6] },
    text: "content:events.detonationsFirst.text",
    dialogue: [
      { who: "echo", line: "content:events.detonationsFirst.dia.l1" },
      { who: "echo", line: "content:events.detonationsFirst.dia.l2" },
    ],
    options: [
      {
        id: "thread",
        label: "content:events.detonationsFirst.opt.thread",
        check: { dice: 2, pick: "sum", target: 10, school: "green" },
        onPass: [
          {
            text: "content:events.detonationsFirst.out.threadPass",
            effects: [{ k: "nodeMod", mod: "revealRows", n: 3 }],
          },
        ],
        onFail: [
          {
            text: "content:events.detonationsFirst.out.threadFail",
            effects: [{ k: "hull", n: -10 }],
          },
        ],
      },
      {
        id: "harvest",
        label: "content:events.detonationsFirst.opt.harvest",
        outcomes: [
          {
            text: "content:events.detonationsFirst.out.harvestA",
            weight: 3,
            effects: [{ k: "scrap", n: 50 }],
          },
          {
            text: "content:events.detonationsFirst.out.harvestB",
            weight: 2,
            effects: [
              { k: "scrap", n: 50 },
              { k: "hull", n: -8 },
            ],
          },
          {
            text: "content:events.detonationsFirst.out.harvestC",
            weight: 1,
            effects: [{ k: "loot", rarity: "uncommon" }],
          },
        ],
      },
      {
        id: "chartPattern",
        label: "content:events.detonationsFirst.opt.chartPattern",
        outcomes: [
          {
            text: "content:events.detonationsFirst.out.chartPatternA",
            weight: 2,
            effects: [{ k: "battleMod", mod: "startCharge", n: 4, battles: 2 }],
          },
          {
            text: "content:events.detonationsFirst.out.chartPatternB",
            weight: 2,
            effects: [{ k: "nodeMod", mod: "rerollSize", n: 1 }],
          },
        ],
      },
    ],
  },
  {
    id: "doublesLog",
    weight: 2,
    requires: {
      sector: [6],
      flags: {
        any: [
          "twinTraded",
          "twinWarned",
          "twinFought",
          "doubleAhead",
          "doubleNamed",
          "doubleJoined",
          "twinBoarded",
          "twinHailed",
          "twinLeft",
        ],
      },
    },
    text: "content:events.doublesLog.text",
    dialogue: [
      { who: "echo", line: "content:events.doublesLog.dia.l1" },
      { who: "narration", line: "content:events.doublesLog.dia.l2" },
    ],
    options: [
      {
        id: "playIt",
        label: "content:events.doublesLog.opt.playIt",
        check: { dice: 3, pick: "sum", target: 15 },
        onPass: [
          {
            text: "content:events.doublesLog.out.playItPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "hull", n: 8 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.doublesLog.out.playItFail",
            effects: [
              { k: "hull", n: -7 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "answerIt",
        label: "content:events.doublesLog.opt.answerIt",
        outcomes: [
          {
            text: "content:events.doublesLog.out.answerItA",
            weight: 3,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
          {
            text: "content:events.doublesLog.out.answerItB",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "hullMax", n: 4 },
            ],
          },
        ],
      },
      {
        id: "eraseIt",
        label: "content:events.doublesLog.opt.eraseIt",
        outcomes: [
          {
            text: "content:events.doublesLog.out.eraseItA",
            weight: 2,
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 2 },
            ],
            consequence: "content:consequence.doubleErased",
          },
          {
            text: "content:events.doublesLog.out.eraseItB",
            weight: 2,
            effects: [
              { k: "axis", n: -2 },
              { k: "scrap", n: 40 },
            ],
            consequence: "content:consequence.doubleErased",
          },
        ],
      },
      {
        id: "collectBounty",
        label: "content:events.doublesLog.opt.collectBounty",
        requires: { req: "flag", key: "bountyTurned" },
        outcomes: [
          {
            text: "content:events.doublesLog.out.collectBountyA",
            weight: 3,
            effects: [{ k: "scrap", n: 70 }],
            consequence: "content:consequence.bountyCollected",
          },
          {
            text: "content:events.doublesLog.out.collectBountyB",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "loot", rarity: "rare" },
            ],
            consequence: "content:consequence.bountyCollected",
          },
        ],
      },
      {
        id: "returnIt",
        label: "content:events.doublesLog.opt.returnIt",
        requires: { req: "flag", key: "twinWarned" },
        outcomes: [
          {
            text: "content:events.doublesLog.out.returnItA",
            weight: 3,
            effects: [{ k: "hull", n: 12 }],
          },
          {
            text: "content:events.doublesLog.out.returnItB",
            weight: 1,
            effects: [{ k: "loot", rarity: "rare" }],
          },
        ],
      },
    ],
  },
];
