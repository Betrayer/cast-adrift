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
            consequence: "content:consequence.yusufFriend",
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
            consequence: "content:consequence.yusufFriend",
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
            consequence: "content:consequence.yusufGrudge",
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
            consequence: "content:consequence.yusufGrudge",
            follow: {
              enemyIds: ["hookTug", "chaffSwarm"],
              scrap: 30,
            },
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
            effects: [{ k: "battleMod", mod: "startCharge", n: 6, battles: 1 }],
            consequence: "content:consequence.hunterEngaged",
            follow: {
              enemyIds: ["bountyHuntress"],
              scrap: 60,
              loot: { rarity: "rare" },
              setFlags: [["hunterBeaten", true]],
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
            consequence: "content:consequence.yusufFriend",
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
            consequence: "content:consequence.yusufFriend",
          },
          {
            text: "content:events.yusufApprentice.out.stealItSeen",
            weight: 1,
            effects: [
              { k: "flag", key: "yusufFriend" },
              { k: "hull", n: -6 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }
            ],
            consequence: "content:consequence.yusufFriend",
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
];
