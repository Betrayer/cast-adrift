import type { EventDef } from "@/types/events";

export const SECTOR2_EVENTS: readonly EventDef[] = [
  {
    id: "clanToll",
    weight: 22,
    speaker: "yusuf",
    requires: { sector: [2] },
    text: "content:events.clanToll.text",
    options: [
      {
        id: "pay",
        label: "content:events.clanToll.opt.pay",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.clanToll.out.pay",
            effects: [
              { k: "scrap", n: -30 },
              { k: "flag", key: "clanPaid" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
      },
      {
        id: "run",
        label: "content:events.clanToll.opt.run",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.clanToll.out.runPass",
            effects: [
              { k: "scrap", n: 25 },
              { k: "flag", key: "clanSlighted" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.clanToll.out.runFail",
            effects: [
              { k: "hull", n: -7 },
              { k: "flag", key: "clanSlighted" },
            ],
          },
        ],
      },
      {
        id: "haggle",
        label: "content:events.clanToll.opt.haggle",
        requires: { req: "scrap", n: 30 },
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.clanToll.out.hagglePass",
            effects: [
              { k: "scrap", n: -15 },
              { k: "flag", key: "clanPaid" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.clanToll.out.haggleFail",
            effects: [
              { k: "scrap", n: -30 },
              { k: "flag", key: "clanPaid" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "magnetGraveyard",
    weight: 20,
    requires: { sector: [2] },
    text: "content:events.magnetGraveyard.text",
    options: [
      {
        id: "alignField",
        label: "content:events.magnetGraveyard.opt.alignField",
        requires: { req: "axis", min: 2 },
        outcomes: [
          {
            text: "content:events.magnetGraveyard.out.alignField",
            effects: [
              { k: "scrap", n: 30 },
              { k: "loot", rarity: "common" },
            ],
            consequence: "content:consequence.fieldAligned",
          },
        ],
      },
      {
        id: "strip",
        label: "content:events.magnetGraveyard.opt.strip",
        outcomes: [
          {
            text: "content:events.magnetGraveyard.out.strip",
            effects: [
              { k: "scrap", n: 45 },
              { k: "hull", n: -5 },
            ],
          },
        ],
      },
      {
        id: "salvageCore",
        label: "content:events.magnetGraveyard.opt.salvageCore",
        outcomes: [
          {
            text: "content:events.magnetGraveyard.out.salvageCore",
            effects: [{ k: "loot", rarity: "uncommon" }],
          },
        ],
      },
      {
        id: "leave",
        label: "content:events.magnetGraveyard.opt.leave",
        outcomes: [
          {
            text: "content:events.magnetGraveyard.out.leave",
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
    id: "convoyRun",
    weight: 18,
    speaker: "yusuf",
    requires: { sector: [2], flags: { all: ["yusufFriend"] } },
    text: "content:events.convoyRun.text",
    options: [
      {
        id: "escortHim",
        label: "content:events.convoyRun.opt.escortHim",
        outcomes: [
          {
            text: "content:events.convoyRun.out.escortHim",
            effects: [
              { k: "nodeMod", mod: "shipyardDiscount", n: 50 },
              { k: "scrap", n: 20 },
            ],
            consequence: "content:consequence.yusufOnSide",
          },
        ],
      },
      {
        id: "takeCargo",
        label: "content:events.convoyRun.opt.takeCargo",
        outcomes: [
          {
            text: "content:events.convoyRun.out.takeCargo",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 },
              { k: "flag", key: "yusufGrudge" },
            ],
            consequence: "content:consequence.yusufOnSide",
          },
        ],
      },
      {
        id: "flyDecoy",
        label: "content:events.convoyRun.opt.flyDecoy",
        outcomes: [
          {
            text: "content:events.convoyRun.out.flyDecoy",
            weight: 2,
            effects: [
              { k: "scrap", n: 35 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.yusufOnSide",
          },
          {
            text: "content:events.convoyRun.out.flyDecoyCaught",
            weight: 1,
            effects: [{ k: "hull", n: -6 }],
            consequence: "content:consequence.yusufOnSide",
            follow: {
              enemyIds: ["hookTug", "scrapKite"],
              scrap: 25,
            },
          },
        ],
      },
    ],
  },
  {
    id: "yusufDebt",
    weight: 18,
    speaker: "yusuf",
    requires: { sector: [2, 3], flags: { all: ["yusufGrudge"] } },
    text: "content:events.yusufDebt.text",
    options: [
      {
        id: "settle",
        label: "content:events.yusufDebt.opt.settle",
        requires: { req: "scrap", n: 60 },
        outcomes: [
          {
            text: "content:events.yusufDebt.out.settle",
            effects: [
              { k: "scrap", n: -60 },
              { k: "axis", n: 1 },
              { k: "flag", key: "yusufFriend" },
            ],
            consequence: "content:consequence.yusufOwed",
          },
        ],
      },
      {
        id: "refuse",
        label: "content:events.yusufDebt.opt.refuse",
        outcomes: [
          {
            text: "content:events.yusufDebt.out.refuse",
            effects: [{ k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }],
            consequence: "content:consequence.yusufOwed",
            follow: {
              enemyIds: ["hookTug", "chaffSwarm"],
              scrap: 30,
            },
          },
        ],
      },
      {
        id: "workItOff",
        label: "content:events.yusufDebt.opt.workItOff",
        check: { dice: 3, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.yusufDebt.out.workPass",
            effects: [
              { k: "hull", n: -4 },
              { k: "axis", n: 1 },
              { k: "flag", key: "yusufFriend" },
            ],
            consequence: "content:consequence.yusufOwed",
          },
        ],
        onFail: [
          {
            text: "content:events.yusufDebt.out.workFail",
            effects: [
              { k: "hull", n: -9 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.yusufOwed",
          },
        ],
      },
    ],
  },
  {
    id: "minefieldLane",
    weight: 20,
    requires: { sector: [2] },
    text: "content:events.minefieldLane.text",
    options: [
      {
        id: "threadIt",
        label: "content:events.minefieldLane.opt.threadIt",
        check: { dice: 2, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.minefieldLane.out.threadPass",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "scrap", n: 20 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.minefieldLane.out.threadFail",
            effects: [{ k: "hull", n: -8 }],
          },
        ],
      },
      {
        id: "detonate",
        label: "content:events.minefieldLane.opt.detonate",
        outcomes: [
          {
            text: "content:events.minefieldLane.out.detonate",
            effects: [{ k: "scrap", n: 35 }],
            follow: { enemyIds: ["mineCluster"], scrap: 15 },
          },
        ],
      },
      {
        id: "ploughHulk",
        label: "content:events.minefieldLane.opt.ploughHulk",
        outcomes: [
          {
            text: "content:events.minefieldLane.out.ploughHulk",
            weight: 3,
            effects: [
              { k: "tide", n: -1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
          {
            text: "content:events.minefieldLane.out.ploughHulkBack",
            weight: 1,
            effects: [
              { k: "hull", n: -5 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "driftAuction",
    weight: 22,
    speaker: "mara",
    requires: { sector: [2] },
    text: "content:events.driftAuction.text",
    options: [
      {
        id: "bidHigh",
        label: "content:events.driftAuction.opt.bidHigh",
        requires: { req: "scrap", n: 70 },
        outcomes: [
          {
            text: "content:events.driftAuction.out.bidHigh",
            effects: [
              { k: "scrap", n: -70 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "maraFriend" },
            ],
          },
        ],
      },
      {
        id: "bidLow",
        label: "content:events.driftAuction.opt.bidLow",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.driftAuction.out.bidLow",
            effects: [
              { k: "scrap", n: -25 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
        ],
      },
      {
        id: "heckle",
        label: "content:events.driftAuction.opt.heckle",
        outcomes: [
          {
            text: "content:events.driftAuction.out.heckle",
            effects: [
              { k: "scrap", n: 15 },
              { k: "flag", key: "maraGrudge" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "crewReunion",
    weight: 16,
    requires: { sector: [2, 3], flags: { all: ["crewSaved"] } },
    text: "content:events.crewReunion.text",
    options: [
      {
        id: "hire",
        label: "content:events.crewReunion.opt.hire",
        outcomes: [
          {
            text: "content:events.crewReunion.out.hire",
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "hull", n: 6 },
            ],
            consequence: "content:consequence.crewSaved",
          },
        ],
      },
      {
        id: "sendOff",
        label: "content:events.crewReunion.opt.sendOff",
        outcomes: [
          {
            text: "content:events.crewReunion.out.sendOff",
            effects: [
              { k: "scrap", n: 55 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.crewSaved",
          },
        ],
      },
    ],
  },
  {
    id: "hunterTrail",
    weight: 16,
    speaker: "bountyHuntress",
    requires: { sector: [2, 3, 4], flags: { all: ["hunterEngaged"] } },
    text: "content:events.hunterTrail.text",
    options: [
      {
        id: "buyOff",
        label: "content:events.hunterTrail.opt.buyOff",
        requires: { req: "scrap", n: 50 },
        outcomes: [
          {
            text: "content:events.hunterTrail.out.buyOff",
            effects: [
              { k: "scrap", n: -50 },
              { k: "flag", key: "hunterPaid" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.hunterEngaged",
          },
        ],
      },
      {
        id: "ambushHer",
        label: "content:events.hunterTrail.opt.ambushHer",
        outcomes: [
          {
            text: "content:events.hunterTrail.out.ambushHer",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 6, battles: 1 },
              { k: "flag", key: "hunterBeaten" },
            ],
            consequence: "content:consequence.hunterEngaged",
            follow: {
              enemyIds: ["bountyHuntress"],
              scrap: 60,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "driftChapel",
    weight: 18,
    speaker: "choirPreacher",
    requires: { sector: [2] },
    text: "content:events.driftChapel.text",
    options: [
      {
        id: "sing",
        label: "content:events.driftChapel.opt.sing",
        requires: { req: "axis", max: -3 },
        outcomes: [
          {
            text: "content:events.driftChapel.out.sing",
            effects: [
              { k: "axis", n: -1 },
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "hymnCopied" },
            ],
            consequence: "content:consequence.hymnCopied",
          },
        ],
      },
      {
        id: "listen",
        label: "content:events.driftChapel.opt.listen",
        outcomes: [
          {
            text: "content:events.driftChapel.out.listen",
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 },
              { k: "flag", key: "choirCurious" },
            ],
          },
        ],
      },
      {
        id: "refuse",
        label: "content:events.driftChapel.opt.refuse",
        outcomes: [
          {
            text: "content:events.driftChapel.out.refuse",
            effects: [
              { k: "axis", n: 2 },
              { k: "hullMax", n: 3 },
              { k: "flag", key: "refusedChoir" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "tetheredHulk",
    weight: 20,
    requires: { sector: [2] },
    text: "content:events.tetheredHulk.text",
    options: [
      {
        id: "boardIt",
        label: "content:events.tetheredHulk.opt.boardIt",
        requires: { req: "hull", n: 15 },
        outcomes: [
          {
            text: "content:events.tetheredHulk.out.boardIt",
            consequence: "content:consequence.hulkAnswered",
            effects: [
              { k: "hull", n: -6 },
              { k: "loot", rarity: "rare" },
            ],
          },
        ],
      },
      {
        id: "cutFree",
        label: "content:events.tetheredHulk.opt.cutFree",
        outcomes: [
          {
            text: "content:events.tetheredHulk.out.cutFree",
            consequence: "content:consequence.hulkAnswered",
            effects: [
              { k: "scrap", n: 30 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
          },
        ],
      },
      {
        id: "traceMooring",
        label: "content:events.tetheredHulk.opt.traceMooring",
        check: { dice: 2, pick: "highest", target: 4, school: "grey" },
        onPass: [
          {
            text: "content:events.tetheredHulk.out.tracePass",
            consequence: "content:consequence.hulkAnswered",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "clanPaid" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.tetheredHulk.out.traceFail",
            consequence: "content:consequence.hulkAnswered",
            effects: [
              { k: "hull", n: -5 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "beaconRelay",
    weight: 18,
    speaker: "beaconKeeper",
    requires: { sector: [2] },
    text: "content:events.beaconRelay.text",
    options: [
      {
        id: "useKey",
        label: "content:events.beaconRelay.opt.useKey",
        requires: { req: "flag", key: "beaconKey1" },
        outcomes: [
          {
            text: "content:events.beaconRelay.out.useKey",
            effects: [
              { k: "flag", key: "beaconRebuilt" },
              { k: "flag", key: "beacon2" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.beaconRebuilt",
          },
        ],
      },
      {
        id: "repairIt",
        label: "content:events.beaconRelay.opt.repairIt",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.beaconRelay.out.repairIt",
            effects: [
              { k: "scrap", n: -25 },
              { k: "axis", n: 2 },
              { k: "flag", key: "relayFixed" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
      },
      {
        id: "stripIt",
        label: "content:events.beaconRelay.opt.stripIt",
        outcomes: [
          {
            text: "content:events.beaconRelay.out.stripIt",
            effects: [
              { k: "scrap", n: 40 },
              { k: "axis", n: -2 },
              { k: "flag", key: "keeperSlighted" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "fuelBloom",
    weight: 20,
    requires: { sector: [2] },
    text: "content:events.fuelBloom.text",
    options: [
      {
        id: "siphon",
        label: "content:events.fuelBloom.opt.siphon",
        outcomes: [
          {
            text: "content:events.fuelBloom.out.siphon",
            consequence: "content:consequence.fuelBloomWorked",
            effects: [{ k: "battleMod", mod: "startCharge", n: 5, battles: 4 }],
          },
        ],
      },
      {
        id: "burnIt",
        label: "content:events.fuelBloom.opt.burnIt",
        outcomes: [
          {
            text: "content:events.fuelBloom.out.burnIt",
            consequence: "content:consequence.fuelBloomWorked",
            effects: [
              { k: "tide", n: -1 },
              { k: "hull", n: -3 },
            ],
          },
        ],
      },
      {
        id: "bottleIt",
        label: "content:events.fuelBloom.opt.bottleIt",
        outcomes: [
          {
            text: "content:events.fuelBloom.out.bottleIt",
            weight: 3,
            consequence: "content:consequence.fuelBloomWorked",
            effects: [{ k: "scrap", n: 40 }],
          },
          {
            text: "content:events.fuelBloom.out.bottleItCooked",
            weight: 1,
            consequence: "content:consequence.fuelBloomWorked",
            effects: [
              { k: "scrap", n: 15 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "hullBreakerYard",
    weight: 20,
    requires: { sector: [2] },
    text: "content:events.hullBreakerYard.text",
    options: [
      {
        id: "takeStack",
        label: "content:events.hullBreakerYard.opt.takeStack",
        outcomes: [
          {
            text: "content:events.hullBreakerYard.out.takeStack",
            weight: 3,
            effects: [
              { k: "scrap", n: 55 }
            ],
            consequence: "content:consequence.yardStripped",
          },
          {
            text: "content:events.hullBreakerYard.out.takeStackTrap",
            weight: 2,
            effects: [
              { k: "scrap", n: 25 },
              { k: "hull", n: -8 }
            ],
            consequence: "content:consequence.yardStripped",
          },
        ],
      },
      {
        id: "stopTheYard",
        label: "content:events.hullBreakerYard.opt.stopTheYard",
        outcomes: [
          {
            text: "content:events.hullBreakerYard.out.stopTheYard",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "yardStopped" },
              { k: "nodeMod", mod: "endHeal", n: 1 }
            ],
            consequence: "content:consequence.yardStopped",
          },
        ],
      },
      {
        id: "restartIt",
        label: "content:events.hullBreakerYard.opt.restartIt",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.hullBreakerYard.out.restartPass",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "yardStopped" }
            ],
            consequence: "content:consequence.yardStopped",
          },
        ],
        onFail: [
          {
            text: "content:events.hullBreakerYard.out.restartFail",
            effects: [
              { k: "hull", n: -6 },
              { k: "tide", n: 1 }
            ],
            consequence: "content:consequence.yardStripped",
          },
        ],
      },
    ],
  },
  {
    id: "tugStrike",
    weight: 18,
    requires: { sector: [2] },
    text: "content:events.tugStrike.text",
    options: [
      {
        id: "payThem",
        label: "content:events.tugStrike.opt.payThem",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.tugStrike.out.payThem",
            effects: [
              { k: "scrap", n: -40 },
              { k: "flag", key: "tugsPaid" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.tugsPaid",
          },
        ],
      },
      {
        id: "crossPicket",
        label: "content:events.tugStrike.opt.crossPicket",
        outcomes: [
          {
            text: "content:events.tugStrike.out.crossPicket",
            effects: [
              { k: "scrap", n: 30 },
              { k: "flag", key: "tugsCrossed" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }
            ],
            consequence: "content:consequence.tugsCrossed",
          },
        ],
      },
      {
        id: "haulForThem",
        label: "content:events.tugStrike.opt.haulForThem",
        outcomes: [
          {
            text: "content:events.tugStrike.out.haulForThem",
            effects: [
              { k: "flag", key: "tugsPaid" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 25 }
            ],
            consequence: "content:consequence.tugsPaid",
          },
        ],
      },
    ],
  },
  {
    id: "salvageQuarantine",
    weight: 16,
    requires: { sector: [2] },
    text: "content:events.salvageQuarantine.text",
    codex: "silentField",
    options: [
      {
        id: "obeyIt",
        label: "content:events.salvageQuarantine.opt.obeyIt",
        outcomes: [
          {
            text: "content:events.salvageQuarantine.out.obeyIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "endHeal", n: 1 }
            ],
            consequence: "content:consequence.quarantineKept",
          },
        ],
      },
      {
        id: "breakSeal",
        label: "content:events.salvageQuarantine.opt.breakSeal",
        outcomes: [
          {
            text: "content:events.salvageQuarantine.out.breakSeal",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "quarantineBroken" }
            ],
            consequence: "content:consequence.quarantineBroken",
          },
          {
            text: "content:events.salvageQuarantine.out.breakSealBad",
            weight: 2,
            effects: [
              { k: "hull", n: -10 },
              { k: "flag", key: "quarantineBroken" },
              { k: "tide", n: 1 }
            ],
            consequence: "content:consequence.quarantineBroken",
          },
        ],
      },
      {
        id: "readBuoy",
        label: "content:events.salvageQuarantine.opt.readBuoy",
        outcomes: [
          {
            text: "content:events.salvageQuarantine.out.readBuoy",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "flag", key: "quarantineKept" }
            ],
            codex: "silentField",
            consequence: "content:consequence.quarantineKept",
          },
        ],
      },
    ],
  },
  {
    id: "driftSchool",
    weight: 16,
    requires: { sector: [2] },
    text: "content:events.driftSchool.text",
    options: [
      {
        id: "donate",
        label: "content:events.driftSchool.opt.donate",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.driftSchool.out.donate",
            effects: [
              { k: "scrap", n: -25 },
              { k: "axis", n: 1 },
              { k: "flag", key: "schoolHelped" },
              { k: "hullMax", n: 3 }
            ],
            consequence: "content:consequence.schoolHelped",
          },
        ],
      },
      {
        id: "teachThem",
        label: "content:events.driftSchool.opt.teachThem",
        outcomes: [
          {
            text: "content:events.driftSchool.out.teachThem",
            effects: [
              { k: "flag", key: "schoolHelped" },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            consequence: "content:consequence.schoolHelped",
          },
        ],
      },
      {
        id: "takeTheFreighter",
        label: "content:events.driftSchool.opt.takeTheFreighter",
        outcomes: [
          {
            text: "content:events.driftSchool.out.takeTheFreighter",
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -2 },
              { k: "flag", key: "schoolRobbed" }
            ],
            consequence: "content:consequence.schoolRobbed",
          },
        ],
      },
    ],
  },
  {
    id: "clanFuneral",
    weight: 15,
    requires: { sector: [2], flags: {any: ["clanPaid", "clanSlighted"]} },
    text: "content:events.clanFuneral.text",
    options: [
      {
        id: "standDown",
        label: "content:events.clanFuneral.opt.standDown",
        outcomes: [
          {
            text: "content:events.clanFuneral.out.standDown",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "clanPaid" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 }
            ],
            consequence: "content:consequence.clanRespect",
          },
        ],
      },
      {
        id: "salvageDrift",
        label: "content:events.clanFuneral.opt.salvageDrift",
        outcomes: [
          {
            text: "content:events.clanFuneral.out.salvageDrift",
            weight: 2,
            effects: [
              { k: "scrap", n: 50 },
              { k: "flag", key: "clanSlighted" }
            ],
            consequence: "content:consequence.clanSlighted",
          },
          {
            text: "content:events.clanFuneral.out.salvageDriftSeen",
            weight: 1,
            effects: [
              { k: "scrap", n: 20 },
              { k: "flag", key: "clanSlighted" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 3 }
            ],
            consequence: "content:consequence.clanSlighted",
          },
        ],
      },
      {
        id: "sendSalute",
        label: "content:events.clanFuneral.opt.sendSalute",
        outcomes: [
          {
            text: "content:events.clanFuneral.out.sendSalute",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "clanPaid" },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.clanRespect",
          },
        ],
      },
    ],
  },
  {
    id: "coolantBloom",
    weight: 15,
    requires: { sector: [2] },
    text: "content:events.coolantBloom.text",
    options: [
      {
        id: "tapBloom",
        label: "content:events.coolantBloom.opt.tapBloom",
        check: { dice: 2, pick: "lowest", target: 4 },
        onPass: [
          {
            text: "content:events.coolantBloom.out.tapPass",
            effects: [
              { k: "scrap", n: 45 },
              { k: "nodeMod", mod: "endHeal", n: 2 }
            ],
            consequence: "content:consequence.bloomTapped",
          },
        ],
        onFail: [
          {
            text: "content:events.coolantBloom.out.tapFail",
            effects: [
              { k: "hull", n: -9 },
              { k: "scrap", n: 15 }
            ],
            consequence: "content:consequence.bloomTapped",
          },
        ],
      },
      {
        id: "findSource",
        label: "content:events.coolantBloom.opt.findSource",
        outcomes: [
          {
            text: "content:events.coolantBloom.out.findSource",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "bloomSource" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.bloomSource",
          },
        ],
      },
      {
        id: "burnIt",
        label: "content:events.coolantBloom.opt.burnIt",
        outcomes: [
          {
            text: "content:events.coolantBloom.out.burnIt",
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: -1 },
              { k: "flag", key: "bloomBurned" }
            ],
            consequence: "content:consequence.bloomBurned",
          },
        ],
      },
    ],
  },
  {
    id: "manifestAuction",
    weight: 15,
    requires: { sector: [2] },
    text: "content:events.manifestAuction.text",
    options: [
      {
        id: "bidHigh",
        label: "content:events.manifestAuction.opt.bidHigh",
        requires: { req: "scrap", n: 55 },
        outcomes: [
          {
            text: "content:events.manifestAuction.out.bidHigh",
            weight: 2,
            effects: [
              { k: "scrap", n: -55 },
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "manifestWon" }
            ],
            consequence: "content:consequence.manifestWon",
          },
          {
            text: "content:events.manifestAuction.out.bidHighDud",
            weight: 1,
            effects: [
              { k: "scrap", n: -55 },
              { k: "flag", key: "manifestWon" },
              { k: "nodeMod", mod: "revealRows", n: 3 }
            ],
            consequence: "content:consequence.manifestWon",
          },
        ],
      },
      {
        id: "backScript",
        label: "content:events.manifestAuction.opt.backScript",
        outcomes: [
          {
            text: "content:events.manifestAuction.out.backScript",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "scriptBacked" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 }
            ],
            consequence: "content:consequence.scriptBacked",
          },
        ],
      },
      {
        id: "jamAuction",
        label: "content:events.manifestAuction.opt.jamAuction",
        outcomes: [
          {
            text: "content:events.manifestAuction.out.jamAuction",
            effects: [
              { k: "scrap", n: 35 },
              { k: "axis", n: -1 },
              { k: "flag", key: "auctionJammed" }
            ],
            consequence: "content:consequence.auctionJammed",
          },
        ],
      },
      {
        id: "haul",
        label: "content:events.manifestAuction.opt.haul",
        requires: { req: "cargo", id: "overwoundCoils" },
        outcomes: [
          {
            text: "content:events.manifestAuction.out.haul",
            effects: [{ k: "cargo", id: "overwoundCoils" }],
            consequence: "content:consequence.cargoTaken",
          },
        ],
      },
    ],
  },
  {
    id: "wardenPatrolBoat",
    weight: 14,
    speaker: "warden",
    requires: { sector: [2] },
    text: "content:events.wardenPatrolBoat.text",
    options: [
      {
        id: "answerYes",
        label: "content:events.wardenPatrolBoat.opt.answerYes",
        outcomes: [
          {
            text: "content:events.wardenPatrolBoat.out.answerYes",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "wardenAnswered" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.wardenAnswered",
          },
        ],
      },
      {
        id: "answerNo",
        label: "content:events.wardenPatrolBoat.opt.answerNo",
        outcomes: [
          {
            text: "content:events.wardenPatrolBoat.out.answerNo",
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "wardenReleased" },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.wardenReleased",
          },
        ],
      },
      {
        id: "showPapers",
        label: "content:events.wardenPatrolBoat.opt.showPapers",
        check: { dice: 2, pick: "highest", target: 5, tierAtMost: 8 },
        onPass: [
          {
            text: "content:events.wardenPatrolBoat.out.papersPass",
            effects: [
              { k: "scrap", n: 40 },
              { k: "flag", key: "wardenAnswered" }
            ],
            consequence: "content:consequence.wardenAnswered",
          },
        ],
        onFail: [
          {
            text: "content:events.wardenPatrolBoat.out.papersFail",
            effects: [
              { k: "scrap", n: -20 },
              { k: "flag", key: "wardenReleased" }
            ],
            consequence: "content:consequence.wardenReleased",
          },
        ],
      },
    ],
  },
  {
    id: "wreckedRelayFarm",
    weight: 14,
    requires: { sector: [2] },
    text: "content:events.wreckedRelayFarm.text",
    options: [
      {
        id: "traceIt",
        label: "content:events.wreckedRelayFarm.opt.traceIt",
        outcomes: [
          {
            text: "content:events.wreckedRelayFarm.out.traceIt",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "flag", key: "relayTraced" }
            ],
            consequence: "content:consequence.relayTraced",
          },
        ],
      },
      {
        id: "stripFarm",
        label: "content:events.wreckedRelayFarm.opt.stripFarm",
        outcomes: [
          {
            text: "content:events.wreckedRelayFarm.out.stripFarm",
            effects: [
              { k: "scrap", n: 65 },
              { k: "flag", key: "relayStripped" },
              { k: "axis", n: -1 }
            ],
            consequence: "content:consequence.relayStripped",
          },
        ],
      },
      {
        id: "realign",
        label: "content:events.wreckedRelayFarm.opt.realign",
        outcomes: [
          {
            text: "content:events.wreckedRelayFarm.out.realign",
            effects: [
              { k: "flag", key: "relayTraced" },
              { k: "flag", key: "beaconRebuilt" },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.beaconRebuilt",
          },
        ],
      },
    ],
  },
  {
    id: "tetherRace",
    weight: 13,
    requires: { sector: [2] },
    text: "content:events.tetherRace.text",
    options: [
      {
        id: "race",
        label: "content:events.tetherRace.opt.race",
        check: { dice: 3, pick: "sum", target: 13 },
        onPass: [
          {
            text: "content:events.tetherRace.out.racePass",
            effects: [
              { k: "scrap", n: 60 },
              { k: "flag", key: "raceWon" }
            ],
            consequence: "content:consequence.raceWon",
          },
        ],
        onFail: [
          {
            text: "content:events.tetherRace.out.raceFail",
            effects: [
              { k: "hull", n: -7 },
              { k: "flag", key: "raceLost" }
            ],
            consequence: "content:consequence.raceLost",
          },
        ],
      },
      {
        id: "bet",
        label: "content:events.tetherRace.opt.bet",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.tetherRace.out.betWin",
            weight: 3,
            effects: [
              { k: "scrap", n: 35 },
              { k: "flag", key: "raceWon" }
            ],
            consequence: "content:consequence.raceWon",
          },
          {
            text: "content:events.tetherRace.out.betLose",
            weight: 2,
            effects: [
              { k: "scrap", n: -20 },
              { k: "flag", key: "raceLost" }
            ],
            consequence: "content:consequence.raceLost",
          },
        ],
      },
      {
        id: "cutTether",
        label: "content:events.tetherRace.opt.cutTether",
        outcomes: [
          {
            text: "content:events.tetherRace.out.cutTether",
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: -2 },
              { k: "flag", key: "raceLost" }
            ],
            consequence: "content:consequence.tetherCut",
          },
        ],
      },
    ],
  },
  {
    id: "yusufApprentice",
    weight: 14,
    speaker: "yusuf",
    requires: { sector: [2], flags: {any: ["yusufFriend", "yusufGrudge"]} },
    text: "content:events.yusufApprentice.text",
    options: [
      {
        id: "buyIt",
        label: "content:events.yusufApprentice.opt.buyIt",
        requires: { req: "scrap", n: 45 },
        outcomes: [
          {
            text: "content:events.yusufApprentice.out.buyIt",
            effects: [
              { k: "scrap", n: -45 },
              { k: "flag", key: "yusufFriend" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 40 }
            ],
            consequence: "content:consequence.yusufKnown",
          },
        ],
      },
      {
        id: "stealIt",
        label: "content:events.yusufApprentice.opt.stealIt",
        outcomes: [
          {
            text: "content:events.yusufApprentice.out.stealIt",
            weight: 2,
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -1 }
            ],
            consequence: "content:consequence.yusufKnown",
          },
          {
            text: "content:events.yusufApprentice.out.stealItSeen",
            weight: 1,
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "hull", n: -6 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }
            ],
            consequence: "content:consequence.yusufKnown",
          },
        ],
      },
      {
        id: "tellHim",
        label: "content:events.yusufApprentice.opt.tellHim",
        outcomes: [
          {
            text: "content:events.yusufApprentice.out.tellHim",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "apprenticeTold" },
              { k: "hullMax", n: 4 }
            ],
            consequence: "content:consequence.apprenticeTold",
          },
        ],
      },
    ],
  },
  {
    id: "iceLighter",
    weight: 13,
    requires: { sector: [2] },
    text: "content:events.iceLighter.text",
    options: [
      {
        id: "loadIt",
        label: "content:events.iceLighter.opt.loadIt",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.iceLighter.out.loadIt",
            effects: [
              { k: "scrap", n: -20 },
              { k: "axis", n: 1 },
              { k: "flag", key: "lighterLoaded" },
              { k: "nodeMod", mod: "endHeal", n: 2 }
            ],
            consequence: "content:consequence.lighterLoaded",
          },
        ],
      },
      {
        id: "boardIt",
        label: "content:events.iceLighter.opt.boardIt",
        outcomes: [
          {
            text: "content:events.iceLighter.out.boardIt",
            effects: [
              { k: "scrap", n: 70 },
              { k: "flag", key: "lighterStripped" }
            ],
            consequence: "content:consequence.lighterStripped",
          },
        ],
      },
      {
        id: "stopIt",
        label: "content:events.iceLighter.opt.stopIt",
        outcomes: [
          {
            text: "content:events.iceLighter.out.stopIt",
            effects: [
              { k: "axis", n: -1 },
              { k: "flag", key: "lighterStopped" },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.lighterStopped",
          },
        ],
      },
    ],
  },
  {
    id: "driftCourt",
    weight: 13,
    requires: { sector: [2] },
    text: "content:events.driftCourt.text",
    options: [
      {
        id: "ruleFair",
        label: "content:events.driftCourt.opt.ruleFair",
        outcomes: [
          {
            text: "content:events.driftCourt.out.ruleFair",
            effects: [
              { k: "flag", key: "courtFair" },
              { k: "axis", n: 1 },
              { k: "scrap", n: 20 }
            ],
            consequence: "content:consequence.courtFair",
          },
        ],
      },
      {
        id: "ruleForSelf",
        label: "content:events.driftCourt.opt.ruleForSelf",
        outcomes: [
          {
            text: "content:events.driftCourt.out.ruleForSelf",
            effects: [
              { k: "scrap", n: 65 },
              { k: "axis", n: -2 },
              { k: "flag", key: "courtRigged" }
            ],
            consequence: "content:consequence.courtRigged",
          },
        ],
      },
      {
        id: "auditWreck",
        label: "content:events.driftCourt.opt.auditWreck",
        check: { dice: 2, pick: "sum", target: 10 },
        onPass: [
          {
            text: "content:events.driftCourt.out.auditPass",
            effects: [
              { k: "flag", key: "courtFair" },
              { k: "loot", rarity: "uncommon" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.courtFair",
          },
        ],
        onFail: [
          {
            text: "content:events.driftCourt.out.auditFail",
            effects: [
              { k: "flag", key: "courtRigged" },
              { k: "tide", n: 1 }
            ],
            consequence: "content:consequence.courtRigged",
          },
        ],
      },
    ],
  },
  {
    id: "fieldsMarketDay",
    weight: 16,
    speaker: "mara",
    requires: { sector: [2] },
    text: "content:events.fieldsMarketDay.text",
    dialogue: [
      { who: "mara", line: "content:events.fieldsMarketDay.dia.l1" },
      { who: "echo", line: "content:events.fieldsMarketDay.dia.l2" },
    ],
    options: [
      {
        id: "swapRail",
        label: "content:events.fieldsMarketDay.opt.swapRail",
        outcomes: [
          {
            text: "content:events.fieldsMarketDay.out.swapRail",
            weight: 2,
            effects: [
              { k: "swapLowestDie" },
              { k: "scrap", n: 10 },
            ],
          },
          {
            text: "content:events.fieldsMarketDay.out.swapRailLoud",
            weight: 1,
            effects: [
              { k: "swapLowestDie" },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "buyChart",
        label: "content:events.fieldsMarketDay.opt.buyChart",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.fieldsMarketDay.out.buyChart",
            weight: 3,
            effects: [
              { k: "scrap", n: -30 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
          },
          {
            text: "content:events.fieldsMarketDay.out.buyChartStale",
            weight: 1,
            effects: [
              { k: "scrap", n: -15 },
              { k: "nodeMod", mod: "revealRows", n: 1 },
            ],
          },
        ],
      },
      {
        id: "tellStory",
        label: "content:events.fieldsMarketDay.opt.tellStory",
        check: { dice: 3, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.fieldsMarketDay.out.storyPass",
            effects: [{ k: "scrap", n: 40 }],
          },
        ],
        onFail: [
          {
            text: "content:events.fieldsMarketDay.out.storyFail",
            effects: [
              { k: "scrap", n: 5 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "liftCrate",
        label: "content:events.fieldsMarketDay.opt.liftCrate",
        outcomes: [
          {
            text: "content:events.fieldsMarketDay.out.liftCrate",
            weight: 2,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.fieldsMarketDay.out.liftCrateCaught",
            weight: 1,
            effects: [{ k: "axis", n: -1 }],
            follow: {
              enemyIds: ["magnetTug"],
              scrap: 20,
            },
          },
        ],
      },
      {
        id: "standRound",
        label: "content:events.fieldsMarketDay.opt.standRound",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.fieldsMarketDay.out.standRound",
            weight: 3,
            effects: [
              { k: "scrap", n: -20 },
              { k: "axis", n: 1 },
              { k: "flag", key: "clanPaid" },
            ],
            consequence: "content:consequence.marketRound",
          },
          {
            text: "content:events.fieldsMarketDay.out.standRoundBrawl",
            weight: 1,
            effects: [
              { k: "scrap", n: -20 },
              { k: "hull", n: -4 },
              { k: "flag", key: "clanPaid" },
            ],
            consequence: "content:consequence.marketRound",
          },
        ],
      },
    ],
  },
  {
    id: "clanTowPledge",
    weight: 16,
    requires: { sector: [2] },
    text: "content:events.clanTowPledge.text",
    options: [
      {
        id: "pledge",
        label: "content:events.clanTowPledge.opt.pledge",
        outcomes: [
          {
            text: "content:events.clanTowPledge.out.pledge",
            weight: 3,
            effects: [
              { k: "flag", key: "towPledged" },
              { k: "hullMax", n: 3 },
            ],
            consequence: "content:consequence.towPledged",
          },
          {
            text: "content:events.clanTowPledge.out.pledgeTested",
            weight: 1,
            effects: [
              { k: "flag", key: "towPledged" },
              { k: "hullMax", n: 3 },
              { k: "hull", n: -4 },
            ],
            consequence: "content:consequence.towPledged",
          },
        ],
      },
      {
        id: "payDeposit",
        label: "content:events.clanTowPledge.opt.payDeposit",
        requires: { req: "scrap", n: 35 },
        outcomes: [
          {
            text: "content:events.clanTowPledge.out.payDeposit",
            weight: 2,
            effects: [
              { k: "scrap", n: -35 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
          },
          {
            text: "content:events.clanTowPledge.out.payDepositOnce",
            weight: 1,
            effects: [
              { k: "scrap", n: -35 },
              { k: "hull", n: 6 },
            ],
          },
        ],
      },
      {
        id: "inspectTug",
        label: "content:events.clanTowPledge.opt.inspectTug",
        check: { dice: 2, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.clanTowPledge.out.inspectPass",
            effects: [
              { k: "flag", key: "towPledged" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.towPledged",
          },
        ],
        onFail: [
          {
            text: "content:events.clanTowPledge.out.inspectFail",
            effects: [
              { k: "flag", key: "clanSlighted" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.tugSlighted",
          },
        ],
      },
      {
        id: "stripTug",
        label: "content:events.clanTowPledge.opt.stripTug",
        outcomes: [
          {
            text: "content:events.clanTowPledge.out.stripTug",
            weight: 2,
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: -2 },
              { k: "flag", key: "clanSlighted" },
            ],
            consequence: "content:consequence.tugSlighted",
          },
          {
            text: "content:events.clanTowPledge.out.stripTugFight",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "clanSlighted" },
            ],
            consequence: "content:consequence.tugSlighted",
            follow: {
              enemyIds: ["hookTug", "ripperTug"],
              scrap: 30,
            },
          },
        ],
      },
    ],
  },
  {
    id: "towCalledIn",
    weight: 18,
    requires: { sector: [2, 3], flags: { all: ["towPledged"] } },
    text: "content:events.towCalledIn.text",
    dialogue: [
      { who: "echo", line: "content:events.towCalledIn.dia.l1" },
      { who: "narration", line: "content:events.towCalledIn.dia.l2" },
      { who: "echo", line: "content:events.towCalledIn.dia.l3" },
    ],
    options: [
      {
        id: "comeWhenCalled",
        label: "content:events.towCalledIn.opt.comeWhenCalled",
        outcomes: [
          {
            text: "content:events.towCalledIn.out.comeFight",
            weight: 2,
            effects: [
              { k: "flag", key: "clanPaid" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.towKept",
            follow: {
              enemyIds: ["hookTug", "ripperTug"],
              scrap: 35,
            },
          },
          {
            text: "content:events.towCalledIn.out.comeTow",
            weight: 1,
            effects: [
              { k: "flag", key: "clanPaid" },
              { k: "axis", n: 1 },
              { k: "hull", n: -5 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
            consequence: "content:consequence.towKept",
          },
        ],
      },
      {
        id: "sendScrap",
        label: "content:events.towCalledIn.opt.sendScrap",
        requires: { req: "scrap", n: 40 },
        outcomes: [
          {
            text: "content:events.towCalledIn.out.sendScrap",
            weight: 2,
            effects: [
              { k: "scrap", n: -40 },
              { k: "flag", key: "clanPaid" },
            ],
            consequence: "content:consequence.towKept",
          },
          {
            text: "content:events.towCalledIn.out.sendScrapCold",
            weight: 1,
            effects: [
              { k: "scrap", n: -40 },
              { k: "flag", key: "clanSlighted" },
            ],
            consequence: "content:consequence.towBroken",
          },
        ],
      },
      {
        id: "passToYusuf",
        label: "content:events.towCalledIn.opt.passToYusuf",
        requires: { req: "flag", key: "yusufFriend" },
        outcomes: [
          {
            text: "content:events.towCalledIn.out.passToYusuf",
            weight: 2,
            effects: [
              { k: "flag", key: "clanPaid" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
            ],
            consequence: "content:consequence.towKept",
          },
          {
            text: "content:events.towCalledIn.out.passToYusufLate",
            weight: 1,
            effects: [
              { k: "flag", key: "clanSlighted" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.towBroken",
          },
        ],
      },
      {
        id: "letItGo",
        label: "content:events.towCalledIn.opt.letItGo",
        outcomes: [
          {
            text: "content:events.towCalledIn.out.letItGo",
            weight: 2,
            effects: [
              { k: "flag", key: "clanSlighted" },
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
            consequence: "content:consequence.towBroken",
          },
          {
            text: "content:events.towCalledIn.out.letItGoHeard",
            weight: 1,
            effects: [
              { k: "flag", key: "clanSlighted" },
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.towBroken",
          },
        ],
      },
    ],
  },
  {
    id: "mineShepherd",
    weight: 15,
    requires: { sector: [2] },
    text: "content:events.mineShepherd.text",
    options: [
      {
        id: "hireHer",
        label: "content:events.mineShepherd.opt.hireHer",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.mineShepherd.out.hireHer",
            weight: 3,
            effects: [
              { k: "scrap", n: -25 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
          },
          {
            text: "content:events.mineShepherd.out.hireHerNewMine",
            weight: 1,
            effects: [
              { k: "scrap", n: -25 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "hull", n: -4 },
            ],
          },
        ],
      },
      {
        id: "learnNames",
        label: "content:events.mineShepherd.opt.learnNames",
        check: { dice: 2, pick: "lowest", target: 5, tierAtMost: 8 },
        onPass: [
          {
            text: "content:events.mineShepherd.out.namesPass",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: 1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.mineShepherd.out.namesFail",
            effects: [{ k: "hull", n: -8 }],
          },
        ],
      },
      {
        id: "cullFlock",
        label: "content:events.mineShepherd.opt.cullFlock",
        outcomes: [
          {
            text: "content:events.mineShepherd.out.cullFlock",
            weight: 2,
            effects: [
              { k: "scrap", n: 50 },
              { k: "axis", n: -2 },
              { k: "hull", n: -3 },
            ],
          },
          {
            text: "content:events.mineShepherd.out.cullFlockAnswered",
            weight: 1,
            effects: [{ k: "axis", n: -2 }],
            follow: {
              enemyIds: ["minelayer", "mine"],
              scrap: 25,
            },
          },
        ],
      },
      {
        id: "waitOut",
        label: "content:events.mineShepherd.opt.waitOut",
        outcomes: [
          {
            text: "content:events.mineShepherd.out.waitOut",
            weight: 2,
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: 1 },
            ],
          },
          {
            text: "content:events.mineShepherd.out.waitOutTrailed",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bargeCount",
    weight: 15,
    speaker: "choirPreacher",
    requires: { sector: [2], flags: { any: ["hymnCopied", "choirCurious", "refusedChoir"] } },
    text: "content:events.bargeCount.text",
    dialogue: [
      { who: "choirPreacher", line: "content:events.bargeCount.dia.l1" },
      { who: "narration", line: "content:events.bargeCount.dia.l2" },
      { who: "echo", line: "content:events.bargeCount.dia.l3" },
    ],
    options: [
      {
        id: "backForeman",
        label: "content:events.bargeCount.opt.backForeman",
        outcomes: [
          {
            text: "content:events.bargeCount.out.backForeman",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "scrap", n: 25 },
            ],
          },
          {
            text: "content:events.bargeCount.out.backForemanHum",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "backPreacher",
        label: "content:events.bargeCount.opt.backPreacher",
        outcomes: [
          {
            text: "content:events.bargeCount.out.backPreacher",
            weight: 2,
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "choirCurious" },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 2 },
            ],
            consequence: "content:consequence.choirCurious",
          },
          {
            text: "content:events.bargeCount.out.backPreacherFined",
            weight: 1,
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "choirCurious" },
              { k: "scrap", n: -20 },
            ],
            consequence: "content:consequence.choirCurious",
          },
        ],
      },
      {
        id: "singBoth",
        label: "content:events.bargeCount.opt.singBoth",
        check: { dice: 3, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.bargeCount.out.singPass",
            effects: [
              { k: "flag", key: "hymnCopied" },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.hymnCopied",
          },
        ],
        onFail: [
          {
            text: "content:events.bargeCount.out.singFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "stripBarge",
        label: "content:events.bargeCount.opt.stripBarge",
        outcomes: [
          {
            text: "content:events.bargeCount.out.stripBarge",
            weight: 2,
            effects: [
              { k: "scrap", n: 55 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.bargeCount.out.stripBargeCaught",
            weight: 1,
            effects: [{ k: "axis", n: -1 }],
            follow: {
              enemyIds: ["breakerDrone", "breakerDrone"],
              scrap: 20,
            },
          },
        ],
      },
    ],
  },
  {
    id: "inheritedLedger",
    weight: 15,
    requires: { sector: [2] },
    text: "content:events.inheritedLedger.text",
    options: [
      {
        id: "honourLedger",
        label: "content:events.inheritedLedger.opt.honourLedger",
        requires: { req: "scrap", n: 50 },
        outcomes: [
          {
            text: "content:events.inheritedLedger.out.honourLedger",
            weight: 2,
            effects: [
              { k: "scrap", n: -50 },
              { k: "flag", key: "clanPaid" },
              { k: "hullMax", n: 4 },
            ],
            consequence: "content:consequence.ledgerHonoured",
          },
          {
            text: "content:events.inheritedLedger.out.honourLedgerCore",
            weight: 1,
            effects: [
              { k: "scrap", n: -50 },
              { k: "flag", key: "clanPaid" },
              { k: "loot", rarity: "uncommon" },
              { k: "hull", n: 6 },
            ],
            consequence: "content:consequence.ledgerHonoured",
          },
        ],
      },
      {
        id: "burnLedger",
        label: "content:events.inheritedLedger.opt.burnLedger",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.inheritedLedger.out.burnLedger",
            weight: 2,
            effects: [
              { k: "scrap", n: -25 },
              { k: "hullMax", n: 4 },
              { k: "flag", key: "clanSlighted" },
            ],
            consequence: "content:consequence.ledgerBurned",
          },
          {
            text: "content:events.inheritedLedger.out.burnLedgerSeen",
            weight: 1,
            effects: [
              { k: "scrap", n: -25 },
              { k: "hullMax", n: 4 },
              { k: "flag", key: "clanSlighted" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.ledgerBurned",
          },
        ],
      },
      {
        id: "readLedger",
        label: "content:events.inheritedLedger.opt.readLedger",
        requires: { req: "scrap", n: 15 },
        check: { dice: 3, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.inheritedLedger.out.readPass",
            effects: [
              { k: "scrap", n: -15 },
              { k: "hullMax", n: 3 },
              { k: "flag", key: "clanPaid" },
            ],
            consequence: "content:consequence.ledgerHonoured",
          },
        ],
        onFail: [
          {
            text: "content:events.inheritedLedger.out.readFail",
            effects: [
              { k: "scrap", n: -10 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "tipClans",
        label: "content:events.inheritedLedger.opt.tipClans",
        outcomes: [
          {
            text: "content:events.inheritedLedger.out.tipClans",
            weight: 2,
            effects: [
              { k: "flag", key: "clanPaid" },
              { k: "scrap", n: 20 },
            ],
            consequence: "content:consequence.ledgerTipped",
          },
          {
            text: "content:events.inheritedLedger.out.tipClansFight",
            weight: 1,
            effects: [{ k: "flag", key: "clanPaid" }],
            consequence: "content:consequence.ledgerTipped",
            follow: {
              enemyIds: ["tollBarge", "scrapKite"],
              scrap: 30,
            },
          },
        ],
      },
    ],
  },
  {
    id: "yusufNameRoute",
    weight: 16,
    speaker: "yusuf",
    requires: { sector: [2], flags: { any: ["yusufFriend", "fleetTruthShared", "fleetTruthKept"] } },
    text: "content:events.yusufNameRoute.text",
    dialogue: [
      { who: "yusuf", line: "content:events.yusufNameRoute.dia.l1" },
      { who: "echo", line: "content:events.yusufNameRoute.dia.l2" },
    ],
    options: [
      {
        id: "ownName",
        label: "content:events.yusufNameRoute.opt.ownName",
        outcomes: [
          {
            text: "content:events.yusufNameRoute.out.ownName",
            weight: 2,
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.nameGiven",
          },
          {
            text: "content:events.yusufNameRoute.out.ownNameHeard",
            weight: 1,
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.nameGiven",
          },
        ],
      },
      {
        id: "echoName",
        label: "content:events.yusufNameRoute.opt.echoName",
        outcomes: [
          {
            text: "content:events.yusufNameRoute.out.echoName",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
          },
          {
            text: "content:events.yusufNameRoute.out.echoNameKnown",
            weight: 1,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "hullMax", n: 3 },
            ],
          },
        ],
      },
      {
        id: "fleetName",
        label: "content:events.yusufNameRoute.opt.fleetName",
        requires: { req: "flag", key: "fleetTruthKept" },
        outcomes: [
          {
            text: "content:events.yusufNameRoute.out.fleetName",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 40 },
            ],
            consequence: "content:consequence.fleetNameCarried",
          },
          {
            text: "content:events.yusufNameRoute.out.fleetNameCrew",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: 6 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.fleetNameCarried",
          },
        ],
      },
      {
        id: "falseName",
        label: "content:events.yusufNameRoute.opt.falseName",
        outcomes: [
          {
            text: "content:events.yusufNameRoute.out.falseName",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.yusufNameRoute.out.falseNameCaught",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.nameFalse",
          },
        ],
      },
      {
        id: "offerScrap",
        label: "content:events.yusufNameRoute.opt.offerScrap",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.yusufNameRoute.out.offerScrap",
            weight: 2,
            effects: [
              { k: "scrap", n: -30 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
          },
          {
            text: "content:events.yusufNameRoute.out.offerScrapJoke",
            weight: 1,
            effects: [
              { k: "scrap", n: -30 },
              { k: "nodeMod", mod: "revealRows", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "cutterMind",
    weight: 15,
    requires: { sector: [2] },
    text: "content:events.cutterMind.text",
    dialogue: [
      { who: "echo", line: "content:events.cutterMind.dia.l1" },
      { who: "narration", line: "content:events.cutterMind.dia.l2" },
      { who: "echo", line: "content:events.cutterMind.dia.l3" },
    ],
    options: [
      {
        id: "buyMind",
        label: "content:events.cutterMind.opt.buyMind",
        requires: { req: "scrap", n: 45 },
        outcomes: [
          {
            text: "content:events.cutterMind.out.buyMind",
            weight: 2,
            effects: [
              { k: "scrap", n: -45 },
              { k: "flag", key: "cutterMindFreed" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.cutterMindFreed",
          },
          {
            text: "content:events.cutterMind.out.buyMindNavigates",
            weight: 1,
            effects: [
              { k: "scrap", n: -45 },
              { k: "flag", key: "cutterMindFreed" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.cutterMindFreed",
          },
        ],
      },
      {
        id: "echoTalks",
        label: "content:events.cutterMind.opt.echoTalks",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.cutterMind.out.talkPass",
            effects: [
              { k: "flag", key: "cutterMindFreed" },
              { k: "shards", n: 10 },
            ],
            consequence: "content:consequence.cutterMindFreed",
          },
        ],
        onFail: [
          {
            text: "content:events.cutterMind.out.talkFail",
            effects: [
              { k: "tide", n: 1 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
          },
        ],
      },
      {
        id: "pullCore",
        label: "content:events.cutterMind.opt.pullCore",
        outcomes: [
          {
            text: "content:events.cutterMind.out.pullCore",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "axis", n: -2 },
              { k: "hull", n: -5 },
            ],
            consequence: "content:consequence.cutterMindStripped",
          },
          {
            text: "content:events.cutterMind.out.pullCoreFight",
            weight: 1,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -2 },
            ],
            consequence: "content:consequence.cutterMindStripped",
            follow: {
              enemyIds: ["breakerDrone", "slagHauler"],
              scrap: 25,
            },
          },
        ],
      },
      {
        id: "letItRest",
        label: "content:events.cutterMind.opt.letItRest",
        outcomes: [
          {
            text: "content:events.cutterMind.out.letItRest",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "tide", n: -1 },
            ],
          },
          {
            text: "content:events.cutterMind.out.letItRestBilled",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "scrap", n: -15 },
            ],
          },
        ],
      },
      {
        id: "carryOn",
        label: "content:events.cutterMind.opt.carryOn",
        outcomes: [
          {
            text: "content:events.cutterMind.out.carryOn",
            weight: 2,
            effects: [
              { k: "scrap", n: 20 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.cutterMind.out.carryOnFollowed",
            weight: 1,
            effects: [
              { k: "scrap", n: 20 },
              { k: "axis", n: -1 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "yardStrikebreakers",
    weight: 14,
    requires: { sector: [2], flags: { any: ["tugsPaid", "tugsCrossed"] } },
    text: "content:events.yardStrikebreakers.text",
    options: [
      {
        id: "sellPicket",
        label: "content:events.yardStrikebreakers.opt.sellPicket",
        outcomes: [
          {
            text: "content:events.yardStrikebreakers.out.sellPicket",
            weight: 2,
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -2 },
              { k: "flag", key: "tugsCrossed" },
            ],
            consequence: "content:consequence.tugsCrossed",
          },
          {
            text: "content:events.yardStrikebreakers.out.sellPicketHeard",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "axis", n: -2 },
              { k: "flag", key: "tugsCrossed" },
            ],
            consequence: "content:consequence.tugsCrossed",
            follow: {
              enemyIds: ["hookTug", "hookTug"],
              scrap: 20,
            },
          },
        ],
      },
      {
        id: "warnPicket",
        label: "content:events.yardStrikebreakers.opt.warnPicket",
        outcomes: [
          {
            text: "content:events.yardStrikebreakers.out.warnPicket",
            weight: 2,
            effects: [
              { k: "flag", key: "tugsPaid" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
            ],
            consequence: "content:consequence.tugsPaid",
          },
          {
            text: "content:events.yardStrikebreakers.out.warnPicketFight",
            weight: 1,
            effects: [
              { k: "flag", key: "tugsPaid" },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.tugsPaid",
            follow: {
              enemyIds: ["ripperTug", "ripperTug"],
              scrap: 35,
            },
          },
        ],
      },
      {
        id: "bluffBoss",
        label: "content:events.yardStrikebreakers.opt.bluffBoss",
        check: { dice: 2, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.yardStrikebreakers.out.bluffPass",
            effects: [
              { k: "flag", key: "tugsPaid" },
              { k: "scrap", n: 25 },
            ],
            consequence: "content:consequence.tugsPaid",
          },
        ],
        onFail: [
          {
            text: "content:events.yardStrikebreakers.out.bluffFail",
            effects: [
              { k: "hull", n: -7 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "anchorMassPocket",
    weight: 14,
    requires: { sector: [2] },
    text: "content:events.anchorMassPocket.text",
    dialogue: [
      { who: "echo", line: "content:events.anchorMassPocket.dia.l1" },
      { who: "narration", line: "content:events.anchorMassPocket.dia.l2" },
    ],
    options: [
      {
        id: "cutMass",
        label: "content:events.anchorMassPocket.opt.cutMass",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.anchorMassPocket.out.cutPass",
            effects: [
              { k: "hullMax", n: 3 },
              { k: "scrap", n: 25 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.anchorMassPocket.out.cutFail",
            effects: [
              { k: "hull", n: -7 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "towHauler",
        label: "content:events.anchorMassPocket.opt.towHauler",
        outcomes: [
          {
            text: "content:events.anchorMassPocket.out.towHauler",
            weight: 2,
            effects: [
              { k: "axis", n: 2 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
          {
            text: "content:events.anchorMassPocket.out.towHaulerAged",
            weight: 1,
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -6 },
            ],
          },
        ],
      },
      {
        id: "mindFlies",
        label: "content:events.anchorMassPocket.opt.mindFlies",
        requires: { req: "flag", key: "cutterMindFreed" },
        outcomes: [
          {
            text: "content:events.anchorMassPocket.out.mindFlies",
            weight: 3,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.cutterMindFreed",
          },
          {
            text: "content:events.anchorMassPocket.out.mindFliesSlow",
            weight: 1,
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.cutterMindFreed",
          },
        ],
      },
      {
        id: "skirtPocket",
        label: "content:events.anchorMassPocket.opt.skirtPocket",
        outcomes: [
          {
            text: "content:events.anchorMassPocket.out.skirtPocket",
            weight: 2,
            effects: [
              { k: "tide", n: -1 },
              { k: "scrap", n: 10 },
            ],
          },
          {
            text: "content:events.anchorMassPocket.out.skirtPocketShear",
            weight: 1,
            effects: [
              { k: "tide", n: -1 },
              { k: "hull", n: -3 },
            ],
          },
        ],
      },
    ],
  },
];
