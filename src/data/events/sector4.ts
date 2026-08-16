import type { EventDef } from "@/types/events";

export const SECTOR4_EVENTS: readonly EventDef[] = [
  {
    id: "hymnGate",
    weight: 22,
    speaker: "choirPreacher",
    requires: { sector: [4] },
    text: "content:events.hymnGate.text",
    options: [
      {
        id: "harmonize",
        label: "content:events.hymnGate.opt.harmonize",
        requires: { req: "axis", max: -3 },
        outcomes: [
          {
            text: "content:events.hymnGate.out.harmonize",
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
            consequence: "content:consequence.hymnHarmonized",
          },
        ],
      },
      {
        id: "singAlong",
        label: "content:events.hymnGate.opt.singAlong",
        outcomes: [
          {
            text: "content:events.hymnGate.out.singAlong",
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 3 },
              { k: "flag", key: "hymnJoined" },
            ],
          },
        ],
      },
      {
        id: "jamIt",
        label: "content:events.hymnGate.opt.jamIt",
        requires: { req: "mk", slot: "sensors", mk: 2 },
        outcomes: [
          {
            text: "content:events.hymnGate.out.jamIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "tide", n: -1 },
              { k: "flag", key: "hymnJammed" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "pactSealing",
    weight: 20,
    speaker: "choirPreacher",
    requires: { sector: [4], flags: { all: ["pactOpened"] } },
    text: "content:events.pactSealing.text",
    options: [
      {
        id: "signIt",
        label: "content:events.pactSealing.opt.signIt",
        outcomes: [
          {
            text: "content:events.pactSealing.out.signIt",
            effects: [
              { k: "axis", n: -4 },
              { k: "flag", key: "pactSigned" },
              { k: "loot", rarity: "rare" },
              { k: "hullMax", n: -4 },
            ],
            consequence: "content:consequence.pactOpened",
            codex: "pactLedger",
          },
        ],
      },
      {
        id: "tearIt",
        label: "content:events.pactSealing.opt.tearIt",
        outcomes: [
          {
            text: "content:events.pactSealing.out.tearIt",
            effects: [
              { k: "axis", n: 3 },
              { k: "flag", key: "choirEnemy" },
              { k: "hullMax", n: 5 },
            ],
            consequence: "content:consequence.pactOpened",
          },
        ],
      },
    ],
  },
  {
    id: "heretics",
    weight: 18,
    requires: { sector: [4], flags: { all: ["refusedChoir"] } },
    text: "content:events.heretics.text",
    options: [
      {
        id: "armThem",
        label: "content:events.heretics.opt.armThem",
        requires: { req: "scrap", n: 45 },
        outcomes: [
          {
            text: "content:events.heretics.out.armThem",
            effects: [
              { k: "scrap", n: -45 },
              { k: "axis", n: 2 },
              { k: "flag", key: "hereticsArmed" },
              { k: "battleMod", mod: "startCharge", n: 5, battles: 4 },
            ],
            consequence: "content:consequence.refusedChoir",
          },
        ],
      },
      {
        id: "reportThem",
        label: "content:events.heretics.opt.reportThem",
        outcomes: [
          {
            text: "content:events.heretics.out.reportThem",
            effects: [
              { k: "scrap", n: 60 },
              { k: "axis", n: -3 },
            ],
            consequence: "content:consequence.refusedChoir",
          },
        ],
      },
    ],
  },
  {
    id: "keeperVault",
    weight: 16,
    speaker: "beaconKeeper",
    requires: { sector: [4, 5], flags: { all: ["keeperTrust"] } },
    text: "content:events.keeperVault.text",
    options: [
      {
        id: "openVault",
        label: "content:events.keeperVault.opt.openVault",
        outcomes: [
          {
            text: "content:events.keeperVault.out.openVault",
            effects: [
              { k: "loot", rarity: "legendary" },
              { k: "flag", key: "silentReady" },
            ],
            consequence: "content:consequence.keeperTrust",
          },
        ],
      },
      {
        id: "leaveSealed",
        label: "content:events.keeperVault.opt.leaveSealed",
        outcomes: [
          {
            text: "content:events.keeperVault.out.leaveSealed",
            effects: [
              { k: "axis", n: 3 },
              { k: "hullMax", n: 6 },
              { k: "flag", key: "vaultKept" },
            ],
            consequence: "content:consequence.keeperTrust",
          },
        ],
      },
    ],
  },
  {
    id: "mirrorReturn",
    weight: 16,
    requires: { sector: [4], flags: { all: ["mirrorSpoke"] } },
    text: "content:events.mirrorReturn.text",
    options: [
      {
        id: "listenAgain",
        label: "content:events.mirrorReturn.opt.listenAgain",
        outcomes: [
          {
            text: "content:events.mirrorReturn.out.listenAgain",
            effects: [
              { k: "axis", n: -3 },
              { k: "nodeMod", mod: "revealRows", n: 4 },
              { k: "flag", key: "mirrorBound" },
            ],
            consequence: "content:consequence.mirrorSpoke",
          },
        ],
      },
      {
        id: "sealIt",
        label: "content:events.mirrorReturn.opt.sealIt",
        outcomes: [
          {
            text: "content:events.mirrorReturn.out.sealIt",
            effects: [
              { k: "axis", n: 3 },
              { k: "hull", n: -6 },
              { k: "flag", key: "mirrorBroken" },
            ],
            consequence: "content:consequence.mirrorSpoke",
          },
        ],
      },
    ],
  },
  {
    id: "huntressFavor",
    weight: 14,
    speaker: "bountyHuntress",
    requires: { sector: [4, 5], flags: { all: ["hunterAllied"] } },
    text: "content:events.huntressFavor.text",
    options: [
      {
        id: "debtPaid",
        label: "content:events.huntressFavor.opt.debtPaid",
        requires: { req: "flag", key: "hunterPaid" },
        outcomes: [
          {
            text: "content:events.huntressFavor.out.debtPaid",
            effects: [
              { k: "scrap", n: 55 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
            consequence: "content:consequence.hunterPaid",
          },
        ],
      },
      {
        id: "callFavor",
        label: "content:events.huntressFavor.opt.callFavor",
        outcomes: [
          {
            text: "content:events.huntressFavor.out.callFavor",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "scrap", n: 40 },
            ],
            consequence: "content:consequence.hunterAllied",
          },
        ],
      },
      {
        id: "saveFavor",
        label: "content:events.huntressFavor.opt.saveFavor",
        outcomes: [
          {
            text: "content:events.huntressFavor.out.saveFavor",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 8, battles: 4 },
              { k: "flag", key: "favorHeld" },
            ],
            consequence: "content:consequence.hunterAllied",
          },
        ],
      },
    ],
  },
  {
    id: "reliquaryRun",
    weight: 20,
    requires: { sector: [4] },
    text: "content:events.reliquaryRun.text",
    options: [
      {
        id: "catalogue",
        label: "content:events.reliquaryRun.opt.catalogue",
        requires: { req: "axis", min: 3 },
        outcomes: [
          {
            text: "content:events.reliquaryRun.out.catalogue",
            effects: [
              { k: "scrap", n: 40 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 25 },
            ],
            consequence: "content:consequence.reliquaryCatalogued",
          },
        ],
      },
      {
        id: "raidIt",
        label: "content:events.reliquaryRun.opt.raidIt",
        outcomes: [
          {
            text: "content:events.reliquaryRun.out.raidIt",
            effects: [{ k: "axis", n: -1 }],
            follow: {
              enemyIds: ["reliquary", "hymnCantor"],
              scrap: 45,
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "trade",
        label: "content:events.reliquaryRun.opt.trade",
        requires: { req: "dieSchool", school: "yellow" },
        outcomes: [
          {
            text: "content:events.reliquaryRun.out.trade",
            effects: [
              { k: "swapLowestDie" },
              { k: "scrap", n: 20 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "choirTithe",
    weight: 20,
    speaker: "choirPreacher",
    requires: { sector: [4] },
    text: "content:events.choirTithe.text",
    options: [
      {
        id: "tithe",
        label: "content:events.choirTithe.opt.tithe",
        requires: { req: "scrap", n: 50 },
        outcomes: [
          {
            text: "content:events.choirTithe.out.tithe",
            consequence: "content:consequence.titheSettled",
            effects: [
              { k: "scrap", n: -50 },
              { k: "axis", n: -2 },
              { k: "hullMax", n: 8 },
            ],
          },
        ],
      },
      {
        id: "bleed",
        label: "content:events.choirTithe.opt.bleed",
        outcomes: [
          {
            text: "content:events.choirTithe.out.bleed",
            consequence: "content:consequence.titheSettled",
            effects: [
              { k: "hull", n: -8 },
              { k: "axis", n: -1 },
              { k: "loot", rarity: "rare" },
            ],
          },
        ],
      },
      {
        id: "declineTithe",
        label: "content:events.choirTithe.opt.declineTithe",
        outcomes: [
          {
            text: "content:events.choirTithe.out.declineTithe",
            consequence: "content:consequence.titheSettled",
            effects: [
              { k: "axis", n: 2 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "organShip",
    weight: 18,
    requires: { sector: [4] },
    text: "content:events.organShip.text",
    options: [
      {
        id: "tuneOrgan",
        label: "content:events.organShip.opt.tuneOrgan",
        check: { dice: 2, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.organShip.out.tunePass",
            effects: [
              { k: "nodeMod", mod: "rerollSize", n: 1 },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.organShip.out.tuneFail",
            effects: [{ k: "hull", n: -7 }],
          },
        ],
      },
      {
        id: "silenceOrgan",
        label: "content:events.organShip.opt.silenceOrgan",
        outcomes: [
          {
            text: "content:events.organShip.out.silenceOrgan",
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: 1 },
              { k: "scrap", n: 25 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "acolyteDefector",
    weight: 18,
    requires: { sector: [4] },
    text: "content:events.acolyteDefector.text",
    options: [
      {
        id: "shelter",
        label: "content:events.acolyteDefector.opt.shelter",
        outcomes: [
          {
            text: "content:events.acolyteDefector.out.shelter",
            effects: [
              { k: "axis", n: 2 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "flag", key: "defectorSaved" },
            ],
          },
        ],
      },
      {
        id: "handOver",
        label: "content:events.acolyteDefector.opt.handOver",
        outcomes: [
          {
            text: "content:events.acolyteDefector.out.handOver",
            effects: [
              { k: "scrap", n: 70 },
              { k: "axis", n: -3 },
              { k: "flag", key: "defectorSold" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "voiceInTheHull",
    weight: 18,
    requires: { sector: [4, 5] },
    text: "content:events.voiceInTheHull.text",
    options: [
      {
        id: "answerVoice",
        label: "content:events.voiceInTheHull.opt.answerVoice",
        outcomes: [
          {
            text: "content:events.voiceInTheHull.out.answerVoice",
            consequence: "content:consequence.voiceHandled",
            effects: [
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 7, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "purgeVoice",
        label: "content:events.voiceInTheHull.opt.purgeVoice",
        outcomes: [
          {
            text: "content:events.voiceInTheHull.out.purgeVoice",
            consequence: "content:consequence.voiceHandled",
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: -5 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "hymnArchive",
    weight: 16,
    requires: { sector: [4] },
    text: "content:events.hymnArchive.text",
    codex: "choirDoctrine",
    options: [
      {
        id: "copyIt",
        label: "content:events.hymnArchive.opt.copyIt",
        outcomes: [
          {
            text: "content:events.hymnArchive.out.copyIt",
            effects: [
              { k: "flag", key: "hymnCopied" },
              { k: "nodeMod", mod: "endHeal", n: 1 },
            ],
            codex: "choirDoctrine",
          },
        ],
      },
      {
        id: "burnArchive",
        label: "content:events.hymnArchive.opt.burnArchive",
        outcomes: [
          {
            text: "content:events.hymnArchive.out.burnArchive",
            effects: [
              { k: "axis", n: 3 },
              { k: "flag", key: "choirEnemy" },
              { k: "scrap", n: 30 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "processionEscort",
    weight: 18,
    requires: { sector: [4], flags: {any: ["driftFriends", "crossingOpened", "crossingTolled"]} },
    text: "content:events.processionEscort.text",
    options: [
      {
        id: "sendBack",
        label: "content:events.processionEscort.opt.sendBack",
        outcomes: [
          {
            text: "content:events.processionEscort.out.sendBack",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "haulersSent" },
              { k: "nodeMod", mod: "endHeal", n: 2 }
            ],
            consequence: "content:consequence.haulersSent",
          },
        ],
      },
      {
        id: "useThem",
        label: "content:events.processionEscort.opt.useThem",
        outcomes: [
          {
            text: "content:events.processionEscort.out.useThem",
            weight: 3,
            effects: [
              { k: "scrap", n: 70 },
              { k: "flag", key: "haulersUsed" }
            ],
            consequence: "content:consequence.haulersUsed",
          },
          {
            text: "content:events.processionEscort.out.useThemCost",
            weight: 2,
            effects: [
              { k: "scrap", n: 45 },
              { k: "flag", key: "haulersUsed" },
              { k: "axis", n: -1 }
            ],
            consequence: "content:consequence.haulersUsed",
          },
        ],
      },
      {
        id: "armThem",
        label: "content:events.processionEscort.opt.armThem",
        outcomes: [
          {
            text: "content:events.processionEscort.out.armThem",
            effects: [
              { k: "scrap", n: -50 },
              { k: "flag", key: "haulersArmed" },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 }
            ],
            consequence: "content:consequence.haulersArmed",
          },
        ],
      },
    ],
  },
  {
    id: "brokerInTheChoir",
    weight: 17,
    requires: { sector: [4], flags: {any: ["wakeJammed", "wakeAnswered", "buyerBound", "buyerCut"]} },
    text: "content:events.brokerInTheChoir.text",
    options: [
      {
        id: "dealAnyway",
        label: "content:events.brokerInTheChoir.opt.dealAnyway",
        outcomes: [
          {
            text: "content:events.brokerInTheChoir.out.dealAnyway",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "brokerDealt" },
              { k: "axis", n: -1 }
            ],
            consequence: "content:consequence.brokerDealt",
          },
        ],
      },
      {
        id: "buyBackName",
        label: "content:events.brokerInTheChoir.opt.buyBackName",
        outcomes: [
          {
            text: "content:events.brokerInTheChoir.out.buyBackName",
            effects: [
              { k: "scrap", n: -60 },
              { k: "flag", key: "brokerCleared" },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.brokerCleared",
          },
        ],
      },
      {
        id: "readOrders",
        label: "content:events.brokerInTheChoir.opt.readOrders",
        check: { dice: 2, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.brokerInTheChoir.out.ordersPass",
            effects: [
              { k: "flag", key: "brokerCleared" },
              { k: "nodeMod", mod: "revealRows", n: 3 }
            ],
            consequence: "content:consequence.brokerCleared",
          },
        ],
        onFail: [
          {
            text: "content:events.brokerInTheChoir.out.ordersFail",
            effects: [
              { k: "flag", key: "brokerDealt" },
              { k: "tide", n: 1 }
            ],
            consequence: "content:consequence.brokerDealt",
          },
        ],
      },
    ],
  },
  {
    id: "postingOrders",
    weight: 16,
    speaker: "warden",
    requires: { sector: [4], flags: {any: ["postAccepted", "rosterWiped"]} },
    text: "content:events.postingOrders.text",
    options: [
      {
        id: "useAuthority",
        label: "content:events.postingOrders.opt.useAuthority",
        outcomes: [
          {
            text: "content:events.postingOrders.out.useAuthority",
            effects: [
              { k: "flag", key: "transitPapers" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 40 },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.transitPapers",
          },
        ],
      },
      {
        id: "forgeThem",
        label: "content:events.postingOrders.opt.forgeThem",
        outcomes: [
          {
            text: "content:events.postingOrders.out.forgeThem",
            weight: 2,
            effects: [
              { k: "flag", key: "papersForged" },
              { k: "scrap", n: 60 }
            ],
            consequence: "content:consequence.papersForged",
          },
          {
            text: "content:events.postingOrders.out.forgeThemFlag",
            weight: 1,
            effects: [
              { k: "flag", key: "papersForged" },
              { k: "scrap", n: 25 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }
            ],
            consequence: "content:consequence.papersForged",
          },
        ],
      },
      {
        id: "openIt",
        label: "content:events.postingOrders.opt.openIt",
        outcomes: [
          {
            text: "content:events.postingOrders.out.openIt",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "checkpointOpened" },
              { k: "hullMax", n: 5 }
            ],
            consequence: "content:consequence.checkpointOpened",
          },
        ],
      },
    ],
  },
  {
    id: "reliquaryLedger",
    weight: 16,
    requires: { sector: [4], flags: {any: ["archiveCatalogued", "archiveBurned", "boardRead", "boardTaken", "pilotHired"]} },
    text: "content:events.reliquaryLedger.text",
    options: [
      {
        id: "strikeName",
        label: "content:events.reliquaryLedger.opt.strikeName",
        outcomes: [
          {
            text: "content:events.reliquaryLedger.out.strikeName",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "ledgerStruck" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 }
            ],
            consequence: "content:consequence.ledgerStruck",
          },
        ],
      },
      {
        id: "readForward",
        label: "content:events.reliquaryLedger.opt.readForward",
        outcomes: [
          {
            text: "content:events.reliquaryLedger.out.readForward",
            effects: [
              { k: "flag", key: "ledgerRead" },
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "axis", n: -1 }
            ],
            codex: "choirDoctrine",
            consequence: "content:consequence.ledgerRead",
          },
        ],
      },
      {
        id: "copyLedger",
        label: "content:events.reliquaryLedger.opt.copyLedger",
        outcomes: [
          {
            text: "content:events.reliquaryLedger.out.copyLedger",
            effects: [
              { k: "flag", key: "ledgerRead" },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.ledgerRead",
          },
        ],
      },
    ],
  },
  {
    id: "fieldHospital",
    weight: 16,
    requires: { sector: [4], flags: {any: ["surgeryTaken", "surgeryStripped", "surgeryBooked"]} },
    text: "content:events.fieldHospital.text",
    options: [
      {
        id: "triage",
        label: "content:events.fieldHospital.opt.triage",
        outcomes: [
          {
            text: "content:events.fieldHospital.out.triage",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "triageRun" },
              { k: "hullMax", n: 6 }
            ],
            consequence: "content:consequence.triageRun",
          },
        ],
      },
      {
        id: "sellPlaces",
        label: "content:events.fieldHospital.opt.sellPlaces",
        outcomes: [
          {
            text: "content:events.fieldHospital.out.sellPlaces",
            effects: [
              { k: "scrap", n: 90 },
              { k: "axis", n: -2 },
              { k: "flag", key: "queueSold" }
            ],
            consequence: "content:consequence.queueSold",
          },
        ],
      },
      {
        id: "fetchSurgeon",
        label: "content:events.fieldHospital.opt.fetchSurgeon",
        outcomes: [
          {
            text: "content:events.fieldHospital.out.fetchSurgeon",
            effects: [
              { k: "flag", key: "triageRun" },
              { k: "nodeMod", mod: "endHeal", n: 2 },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.triageRun",
          },
        ],
      },
    ],
  },
  {
    id: "debtCollector",
    weight: 15,
    requires: { sector: [4], flags: {any: ["causalDebt", "causalPaid", "foldRead"]} },
    text: "content:events.debtCollector.text",
    options: [
      {
        id: "payIt",
        label: "content:events.debtCollector.opt.payIt",
        outcomes: [
          {
            text: "content:events.debtCollector.out.payIt",
            effects: [
              { k: "hull", n: -14 },
              { k: "flag", key: "riftSettled" },
              { k: "axis", n: 1 },
              { k: "loot", rarity: "rare" }
            ],
            consequence: "content:consequence.riftSettled",
          },
        ],
      },
      {
        id: "disputeIt",
        label: "content:events.debtCollector.opt.disputeIt",
        outcomes: [
          {
            text: "content:events.debtCollector.out.disputeIt",
            weight: 2,
            effects: [
              { k: "flag", key: "riftDisputed" },
              { k: "scrap", n: 50 }
            ],
            consequence: "content:consequence.riftDisputed",
          },
          {
            text: "content:events.debtCollector.out.disputeItLose",
            weight: 2,
            effects: [
              { k: "flag", key: "riftDisputed" },
              { k: "hull", n: -16 },
              { k: "tide", n: 1 }
            ],
            consequence: "content:consequence.riftDisputed",
          },
        ],
      },
      {
        id: "outrunIt",
        label: "content:events.debtCollector.opt.outrunIt",
        outcomes: [
          {
            text: "content:events.debtCollector.out.outrunIt",
            effects: [
              { k: "flag", key: "riftDisputed" },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 3 },
              { k: "scrap", n: 35 }
            ],
            consequence: "content:consequence.riftDisputed",
          },
        ],
      },
    ],
  },
  {
    id: "twinInTheProcession",
    weight: 15,
    requires: { sector: [4], flags: {any: ["twinChosen", "twinRefused", "cutRecorded", "cutRidden", "cutRefused"]} },
    text: "content:events.twinInTheProcession.text",
    options: [
      {
        id: "boardIt",
        label: "content:events.twinInTheProcession.opt.boardIt",
        outcomes: [
          {
            text: "content:events.twinInTheProcession.out.boardIt",
            weight: 2,
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "twinBoarded" },
              { k: "axis", n: -1 }
            ],
            consequence: "content:consequence.twinBoarded",
          },
          {
            text: "content:events.twinInTheProcession.out.boardItEmpty",
            weight: 1,
            effects: [
              { k: "flag", key: "twinBoarded" },
              { k: "hull", n: -8 },
              { k: "axis", n: -2 }
            ],
            consequence: "content:consequence.twinBoarded",
          },
        ],
      },
      {
        id: "hailIt",
        label: "content:events.twinInTheProcession.opt.hailIt",
        outcomes: [
          {
            text: "content:events.twinInTheProcession.out.hailIt",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "twinHailed" },
              { k: "nodeMod", mod: "rerollSize", n: 1 }
            ],
            consequence: "content:consequence.twinHailed",
          },
        ],
      },
      {
        id: "letItRide",
        label: "content:events.twinInTheProcession.opt.letItRide",
        outcomes: [
          {
            text: "content:events.twinInTheProcession.out.letItRide",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "twinLeft" },
              { k: "hullMax", n: 4 }
            ],
            consequence: "content:consequence.twinLeft",
          },
        ],
      },
    ],
  },
  {
    id: "hymnSchool",
    weight: 15,
    speaker: "choirPreacher",
    requires: { sector: [4], flags: {any: ["chapelAsked", "chapelSilenced", "hymnCopied"]} },
    text: "content:events.hymnSchool.text",
    options: [
      {
        id: "sayNothing",
        label: "content:events.hymnSchool.opt.sayNothing",
        outcomes: [
          {
            text: "content:events.hymnSchool.out.sayNothing",
            effects: [
              { k: "flag", key: "hymnSchoolSeen" },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 3 }
            ],
            consequence: "content:consequence.hymnSchoolSeen",
          },
        ],
      },
      {
        id: "takeThem",
        label: "content:events.hymnSchool.opt.takeThem",
        outcomes: [
          {
            text: "content:events.hymnSchool.out.takeThem",
            effects: [
              { k: "flag", key: "hymnSchoolBroken" },
              { k: "flag", key: "choirEnemy" },
              { k: "axis", n: 3 }
            ],
            consequence: "content:consequence.hymnSchoolBroken",
          },
        ],
      },
      {
        id: "arguePoint",
        label: "content:events.hymnSchool.opt.arguePoint",
        check: { dice: 2, pick: "highest", target: 8, tierAtLeast: 8 },
        onPass: [
          {
            text: "content:events.hymnSchool.out.arguePass",
            effects: [
              { k: "flag", key: "hymnSchoolSeen" },
              { k: "flag", key: "refusedChoir" },
              { k: "axis", n: 2 }
            ],
            consequence: "content:consequence.hymnSchoolSeen",
          },
        ],
        onFail: [
          {
            text: "content:events.hymnSchool.out.argueFail",
            effects: [
              { k: "flag", key: "hymnSchoolSeen" },
              { k: "axis", n: -2 },
              { k: "hull", n: -6 }
            ],
            consequence: "content:consequence.hymnSchoolSeen",
          },
        ],
      },
    ],
  },
  {
    id: "processionCensus",
    weight: 15,
    requires: { sector: [4] },
    text: "content:events.processionCensus.text",
    options: [
      {
        id: "helpCount",
        label: "content:events.processionCensus.opt.helpCount",
        outcomes: [
          {
            text: "content:events.processionCensus.out.helpCount",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "censusHelped" },
              { k: "nodeMod", mod: "revealRows", n: 3 }
            ],
            consequence: "content:consequence.censusHelped",
          },
        ],
      },
      {
        id: "buyCount",
        label: "content:events.processionCensus.opt.buyCount",
        outcomes: [
          {
            text: "content:events.processionCensus.out.buyCount",
            effects: [
              { k: "scrap", n: -45 },
              { k: "flag", key: "censusBought" },
              { k: "loot", rarity: "rare" }
            ],
            consequence: "content:consequence.censusBought",
          },
        ],
      },
      {
        id: "tellTruth",
        label: "content:events.processionCensus.opt.tellTruth",
        outcomes: [
          {
            text: "content:events.processionCensus.out.tellTruth",
            effects: [
              { k: "axis", n: -1 },
              { k: "flag", key: "censusTold" },
              { k: "hullMax", n: 6 }
            ],
            consequence: "content:consequence.censusTold",
          },
        ],
      },
    ],
  },
  {
    id: "acolyteFerry",
    weight: 14,
    requires: { sector: [4] },
    text: "content:events.acolyteFerry.text",
    options: [
      {
        id: "takeThemOver",
        label: "content:events.acolyteFerry.opt.takeThemOver",
        outcomes: [
          {
            text: "content:events.acolyteFerry.out.takeThemOver",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "pilgrimsFerried" },
              { k: "hull", n: -6 },
              { k: "loot", rarity: "uncommon" }
            ],
            consequence: "content:consequence.pilgrimsFerried",
          },
        ],
      },
      {
        id: "buyHull",
        label: "content:events.acolyteFerry.opt.buyHull",
        outcomes: [
          {
            text: "content:events.acolyteFerry.out.buyHull",
            effects: [
              { k: "scrap", n: -40 },
              { k: "flag", key: "ferryBought" },
              { k: "nodeMod", mod: "shipyardDiscount", n: 35 }
            ],
            consequence: "content:consequence.ferryBought",
          },
        ],
      },
      {
        id: "letItGo",
        label: "content:events.acolyteFerry.opt.letItGo",
        outcomes: [
          {
            text: "content:events.acolyteFerry.out.letItGo",
            weight: 2,
            effects: [
              { k: "flag", key: "ferryWatched" },
              { k: "scrap", n: 30 }
            ],
            consequence: "content:consequence.ferryWatched",
          },
          {
            text: "content:events.acolyteFerry.out.letItGoBad",
            weight: 1,
            effects: [
              { k: "flag", key: "ferryWatched" },
              { k: "axis", n: -2 },
              { k: "scrap", n: 55 }
            ],
            consequence: "content:consequence.ferryWatched",
          },
        ],
      },
    ],
  },
  {
    id: "wardenTribunal",
    weight: 14,
    speaker: "warden",
    requires: { sector: [4] },
    text: "content:events.wardenTribunal.text",
    options: [
      {
        id: "giveJurisdiction",
        label: "content:events.wardenTribunal.opt.giveJurisdiction",
        outcomes: [
          {
            text: "content:events.wardenTribunal.out.giveJurisdiction",
            effects: [
              { k: "axis", n: 2 },
              { k: "flag", key: "tribunalSeated" },
              { k: "nodeMod", mod: "revealRows", n: 2 }
            ],
            consequence: "content:consequence.tribunalSeated",
          },
        ],
      },
      {
        id: "dissolveIt",
        label: "content:events.wardenTribunal.opt.dissolveIt",
        outcomes: [
          {
            text: "content:events.wardenTribunal.out.dissolveIt",
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "tribunalDissolved" },
              { k: "scrap", n: 65 }
            ],
            consequence: "content:consequence.tribunalDissolved",
          },
        ],
      },
      {
        id: "standWitness",
        label: "content:events.wardenTribunal.opt.standWitness",
        outcomes: [
          {
            text: "content:events.wardenTribunal.out.standWitness",
            effects: [
              { k: "flag", key: "tribunalSeated" },
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: 1 }
            ],
            consequence: "content:consequence.tribunalSeated",
          },
        ],
      },
    ],
  },
];
