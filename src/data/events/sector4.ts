import type { EventDef } from "@/types/events";

// Sector 4 — The Choir. Twelve scenes; five are callbacks
// (pactOpened, refusedChoir, keeperTrust, mirrorSpoke, hunterAllied).
export const SECTOR4_EVENTS: readonly EventDef[] = [
  {
    id: "hymnGate",
    weight: 22,
    speaker: "choirPreacher",
    requires: { sector: [4] },
    text: "content:events.hymnGate.text",
    options: [
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
];
