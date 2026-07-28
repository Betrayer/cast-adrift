import type { EventDef } from "@/types/events";

// Sector 2 — The Drift Fields. Twelve scenes; five are callbacks
// (yusufFriend, yusufGrudge, crewSaved, maraFriend, hunterEngaged).
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
