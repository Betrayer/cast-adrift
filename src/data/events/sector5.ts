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
];
