import type { EventDef } from "@/types/events";

const S1 = { sector: [1] } as const;

export const SECTOR1_EVENTS: readonly EventDef[] = [
  {
    id: "driftingPod",
    weight: 10,
    requires: S1,
    text: "content:events.driftingPod.text",
    options: [
      {
        id: "open",
        label: "content:events.driftingPod.opt.open",
        check: { dice: 2, pick: "sum", target: 7 },
        onPass: [
          {
            text: "content:events.driftingPod.out.openAlly",
            effects: [
              { k: "scrap", n: 22 },
              { k: "officer", id: "scrapper" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.driftingPod.out.openAmbush",
            effects: [{ k: "hull", n: -5 }],
          },
        ],
      },
      {
        id: "sell",
        label: "content:events.driftingPod.opt.sell",
        outcomes: [
          {
            text: "content:events.driftingPod.out.sell",
            effects: [{ k: "scrap", n: 25 }],
          },
        ],
      },
      {
        id: "leave",
        label: "content:events.driftingPod.opt.leave",
        outcomes: [
          {
            text: "content:events.driftingPod.out.leave",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
      },
    ],
  },
  {
    id: "freedCourier",
    weight: 9,
    requires: S1,
    text: "content:events.freedCourier.text",
    options: [
      {
        id: "free",
        label: "content:events.freedCourier.opt.free",
        outcomes: [
          {
            text: "content:events.freedCourier.out.free",
            effects: [{ k: "flag", key: "courierFreed" }],
          },
        ],
      },
      {
        id: "ransom",
        label: "content:events.freedCourier.opt.ransom",
        outcomes: [
          {
            text: "content:events.freedCourier.out.ransom",
            effects: [{ k: "scrap", n: 30 }],
          },
        ],
      },
      {
        id: "ignore",
        label: "content:events.freedCourier.opt.ignore",
        outcomes: [
          {
            text: "content:events.freedCourier.out.ignore",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
      },
    ],
  },
  {
    id: "courierReturns",
    weight: 14,
    requires: { sector: [1], flags: { all: ["courierFreed"] } },
    text: "content:events.courierReturns.text",
    options: [
      {
        id: "discount",
        label: "content:events.courierReturns.opt.discount",
        outcomes: [
          {
            text: "content:events.courierReturns.out.discount",
            effects: [{ k: "flag", key: "courierDiscount", value: 2 }],
            consequence: "content:consequence.courierFreed",
          },
        ],
      },
      {
        id: "die",
        label: "content:events.courierReturns.opt.die",
        outcomes: [
          {
            text: "content:events.courierReturns.out.die",
            effects: [{ k: "loot", rarity: "uncommon" }],
            consequence: "content:consequence.courierFreed",
          },
        ],
      },
    ],
  },
  {
    id: "cursedCargo",
    weight: 8,
    requires: S1,
    text: "content:events.cursedCargo.text",
    options: [
      {
        id: "take",
        label: "content:events.cursedCargo.opt.take",
        outcomes: [
          {
            text: "content:events.cursedCargo.out.take",
            effects: [
              { k: "loot", rarity: "rare" },
              { k: "flag", key: "hunterMark" },
            ],
          },
        ],
      },
      {
        id: "jettison",
        label: "content:events.cursedCargo.opt.jettison",
        outcomes: [
          {
            text: "content:events.cursedCargo.out.jettison",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
      },
      {
        id: "readGlyphs",
        label: "content:events.cursedCargo.opt.readGlyphs",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.cursedCargo.out.readGlyphsPass",
            effects: [{ k: "loot", rarity: "uncommon" }],
          },
        ],
        onFail: [
          {
            text: "content:events.cursedCargo.out.readGlyphsFail",
            effects: [
              { k: "hull", n: -3 },
              { k: "flag", key: "hunterMark" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "bountyAmbush",
    weight: 16,
    speaker: "bountyHuntress",
    requires: { sector: [1], flags: { all: ["hunterMark"], not: ["hunterEngaged"] } },
    text: "content:events.bountyAmbush.text",
    options: [
      {
        id: "fight",
        label: "content:events.bountyAmbush.opt.fight",
        outcomes: [
          {
            text: "content:events.bountyAmbush.out.fight",
            effects: [{ k: "flag", key: "hunterEngaged" }],
            consequence: "content:consequence.hunterMark",
            follow: {
              enemyIds: ["bountyHuntress"],
              loot: { rarity: "rare" },
              clearFlags: ["hunterMark"],
            },
          },
        ],
      },
      {
        id: "bribe",
        label: "content:events.bountyAmbush.opt.bribe",
        requires: { req: "scrap", n: 30 },
        outcomes: [
          {
            text: "content:events.bountyAmbush.out.bribe",
            effects: [
              { k: "scrap", n: -30 },
              { k: "flag", key: "hunterEngaged" },
            ],
            consequence: "content:consequence.hunterMark",
          },
        ],
      },
    ],
  },
  {
    id: "maraStall",
    weight: 10,
    speaker: "mara",
    requires: S1,
    text: "content:events.maraStall.text",
    options: [
      {
        id: "chat",
        label: "content:events.maraStall.opt.chat",
        outcomes: [
          {
            text: "content:events.maraStall.out.chat",
            effects: [
              { k: "flag", key: "maraFriend" },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
      {
        id: "browse",
        label: "content:events.maraStall.opt.browse",
        requires: { req: "scrap", n: 15 },
        outcomes: [
          {
            text: "content:events.maraStall.out.browse",
            effects: [
              { k: "scrap", n: -15 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
        ],
      },
      {
        id: "rob",
        label: "content:events.maraStall.opt.rob",
        check: { dice: 1, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.maraStall.out.robPass",
            effects: [
              { k: "scrap", n: 40 },
              { k: "flag", key: "maraGrudge" },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.maraStall.out.robFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "flag", key: "maraGrudge" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "maraFavor",
    weight: 15,
    speaker: "mara",
    requires: { sector: [1], flags: { all: ["maraFriend"] } },
    text: "content:events.maraFavor.text",
    options: [
      {
        id: "repair",
        label: "content:events.maraFavor.opt.repair",
        outcomes: [
          {
            text: "content:events.maraFavor.out.repair",
            effects: [{ k: "hull", n: 8 }],
            consequence: "content:consequence.maraFriend",
          },
        ],
      },
      {
        id: "die",
        label: "content:events.maraFavor.opt.die",
        outcomes: [
          {
            text: "content:events.maraFavor.out.die",
            effects: [{ k: "loot", rarity: "uncommon" }],
            consequence: "content:consequence.maraFriend",
          },
        ],
      },
    ],
  },
  {
    id: "maraColdShoulder",
    weight: 15,
    speaker: "mara",
    requires: { sector: [1], flags: { all: ["maraGrudge"] } },
    text: "content:events.maraColdShoulder.text",
    options: [
      {
        id: "apologize",
        label: "content:events.maraColdShoulder.opt.apologize",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.maraColdShoulder.out.apologize",
            effects: [
              { k: "scrap", n: -25 },
              { k: "flag", key: "maraFriend" },
            ],
            consequence: "content:consequence.maraGrudge",
          },
        ],
      },
      {
        id: "walk",
        label: "content:events.maraColdShoulder.opt.walk",
        outcomes: [
          {
            text: "content:events.maraColdShoulder.out.walk",
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.maraGrudge",
          },
        ],
      },
    ],
  },
  {
    id: "derelictReactor",
    weight: 9,
    requires: S1,
    text: "content:events.derelictReactor.text",
    options: [
      {
        id: "attune",
        label: "content:events.derelictReactor.opt.attune",
        requires: { req: "axis", max: -2 },
        outcomes: [
          {
            text: "content:events.derelictReactor.out.attune",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 3, battles: 4 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.reactorAttuned",
          },
        ],
      },
      {
        id: "siphon",
        label: "content:events.derelictReactor.opt.siphon",
        check: { dice: 1, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.derelictReactor.out.siphonPass",
            effects: [
              { k: "battleMod", mod: "startCharge", n: 2, battles: 3 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.derelictReactor.out.siphonFail",
            effects: [{ k: "hull", n: -4 }],
          },
        ],
      },
      {
        id: "salvage",
        label: "content:events.derelictReactor.opt.salvage",
        outcomes: [
          {
            text: "content:events.derelictReactor.out.salvage",
            effects: [{ k: "scrap", n: 18 }],
          },
        ],
      },
    ],
  },
  {
    id: "mineFieldGap",
    weight: 8,
    requires: S1,
    text: "content:events.mineFieldGap.text",
    options: [
      {
        id: "thread",
        label: "content:events.mineFieldGap.opt.thread",
        check: { dice: 3, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.mineFieldGap.out.threadPass",
            effects: [{ k: "tide", n: -1 }],
          },
        ],
        onFail: [
          {
            text: "content:events.mineFieldGap.out.threadFail",
            effects: [{ k: "hull", n: -6 }],
          },
        ],
      },
      {
        id: "around",
        label: "content:events.mineFieldGap.opt.around",
        outcomes: [
          {
            text: "content:events.mineFieldGap.out.around",
            effects: [{ k: "scrap", n: 12 }],
          },
        ],
      },
      {
        id: "defuse",
        label: "content:events.mineFieldGap.opt.defuse",
        check: { dice: 2, pick: "lowest", target: 3, tierAtMost: 4 },
        onPass: [
          {
            text: "content:events.mineFieldGap.out.defusePass",
            effects: [{ k: "scrap", n: 25 }],
          },
        ],
        onFail: [
          {
            text: "content:events.mineFieldGap.out.defuseFail",
            effects: [{ k: "hull", n: -6 }],
          },
        ],
      },
    ],
  },
  {
    id: "choirBroadcast",
    weight: 8,
    speaker: "choirPreacher",
    requires: S1,
    codex: "choirSignal",
    text: "content:events.choirBroadcast.text",
    options: [
      {
        id: "listen",
        label: "content:events.choirBroadcast.opt.listen",
        outcomes: [
          {
            text: "content:events.choirBroadcast.out.listen",
            effects: [
              { k: "axis", n: -2 },
              { k: "flag", key: "heardChoir" },
            ],
          },
        ],
      },
      {
        id: "jam",
        label: "content:events.choirBroadcast.opt.jam",
        outcomes: [
          {
            text: "content:events.choirBroadcast.out.jam",
            effects: [
              { k: "axis", n: 1 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "trace",
        label: "content:events.choirBroadcast.opt.trace",
        check: { dice: 3, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.choirBroadcast.out.tracePass",
            effects: [{ k: "nodeMod", mod: "revealRows", n: 2 }],
          },
        ],
        onFail: [
          {
            text: "content:events.choirBroadcast.out.traceFail",
            effects: [
              { k: "axis", n: -1 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "choirGift",
    weight: 15,
    speaker: "choirPreacher",
    requires: { sector: [1], flags: { all: ["heardChoir"] } },
    text: "content:events.choirGift.text",
    options: [
      {
        id: "accept",
        label: "content:events.choirGift.opt.accept",
        outcomes: [
          {
            text: "content:events.choirGift.out.accept",
            effects: [
              { k: "loot", die: "black-d6" },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.heardChoir",
          },
        ],
      },
      {
        id: "refuse",
        label: "content:events.choirGift.opt.refuse",
        outcomes: [
          {
            text: "content:events.choirGift.out.refuse",
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.heardChoir",
          },
        ],
      },
    ],
  },
  {
    id: "scrapAuction",
    weight: 8,
    requires: S1,
    text: "content:events.scrapAuction.text",
    options: [
      {
        id: "bid",
        label: "content:events.scrapAuction.opt.bid",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.scrapAuction.out.bid",
            consequence: "content:consequence.auctionRun",
            effects: [
              { k: "scrap", n: -25 },
              { k: "loot", rarity: "rare" },
            ],
          },
        ],
      },
      {
        id: "watch",
        label: "content:events.scrapAuction.opt.watch",
        outcomes: [
          {
            text: "content:events.scrapAuction.out.watch",
            consequence: "content:consequence.auctionRun",
            effects: [{ k: "scrap", n: 8 }],
          },
        ],
      },
      {
        id: "rig",
        label: "content:events.scrapAuction.opt.rig",
        check: { dice: 1, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.scrapAuction.out.rigPass",
            consequence: "content:consequence.auctionRun",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.scrapAuction.out.rigFail",
            consequence: "content:consequence.auctionRun",
            effects: [{ k: "hull", n: -5 }],
          },
        ],
      },
    ],
  },
  {
    id: "stowaway",
    weight: 8,
    requires: S1,
    text: "content:events.stowaway.text",
    options: [
      {
        id: "keep",
        label: "content:events.stowaway.opt.keep",
        outcomes: [
          {
            text: "content:events.stowaway.out.keep",
            consequence: "content:consequence.stowawayCalled",
            effects: [
              { k: "hullMax", n: -2 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
              { k: "officer", id: "mechanic" },
            ],
          },
        ],
      },
      {
        id: "handOver",
        label: "content:events.stowaway.opt.handOver",
        outcomes: [
          {
            text: "content:events.stowaway.out.handOver",
            consequence: "content:consequence.stowawayCalled",
            effects: [
              { k: "scrap", n: 20 },
              { k: "axis", n: -1 },
            ],
          },
        ],
      },
      {
        id: "dropOff",
        label: "content:events.stowaway.opt.dropOff",
        outcomes: [
          {
            text: "content:events.stowaway.out.dropOff",
            weight: 2,
            consequence: "content:consequence.stowawayCalled",
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: 4 },
            ],
          },
          {
            text: "content:events.stowaway.out.dropOffTools",
            weight: 1,
            consequence: "content:consequence.stowawayCalled",
            effects: [
              { k: "axis", n: 1 },
              { k: "scrap", n: -10 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "oldBeaconEcho",
    weight: 7,
    speaker: "beaconKeeper",
    requires: S1,
    codex: "oldBeacon",
    text: "content:events.oldBeaconEcho.text",
    options: [
      {
        id: "decrypt",
        label: "content:events.oldBeaconEcho.opt.decrypt",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.oldBeaconEcho.out.decryptPass",
            effects: [{ k: "nodeMod", mod: "revealRows", n: 2 }],
          },
        ],
        onFail: [
          {
            text: "content:events.oldBeaconEcho.out.decryptFail",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
      },
      {
        id: "leave",
        label: "content:events.oldBeaconEcho.opt.leave",
        outcomes: [
          {
            text: "content:events.oldBeaconEcho.out.leave",
            effects: [{ k: "scrap", n: 5 }],
          },
        ],
      },
      {
        id: "report",
        label: "content:events.oldBeaconEcho.opt.report",
        outcomes: [
          {
            text: "content:events.oldBeaconEcho.out.report",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "scrap", n: 10 },
            ],
          },
          {
            text: "content:events.oldBeaconEcho.out.reportLoud",
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
    id: "leechNest",
    weight: 7,
    requires: S1,
    text: "content:events.leechNest.text",
    options: [
      {
        id: "burn",
        label: "content:events.leechNest.opt.burn",
        outcomes: [
          {
            text: "content:events.leechNest.out.burn",
            effects: [],
            follow: {
              enemyIds: ["leechSkiff", "leechSkiff"],
              loot: { rarity: "uncommon" },
            },
          },
        ],
      },
      {
        id: "avoid",
        label: "content:events.leechNest.opt.avoid",
        outcomes: [
          {
            text: "content:events.leechNest.out.avoid",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
      },
      {
        id: "lure",
        label: "content:events.leechNest.opt.lure",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.leechNest.out.lurePass",
            effects: [{ k: "scrap", n: 30 }],
          },
        ],
        onFail: [
          {
            text: "content:events.leechNest.out.lureFail",
            effects: [],
            follow: {
              enemyIds: ["leechSkiff"],
            },
          },
        ],
      },
    ],
  },
  {
    id: "driftMerchant",
    weight: 8,
    requires: S1,
    text: "content:events.driftMerchant.text",
    options: [
      {
        id: "swap",
        label: "content:events.driftMerchant.opt.swap",
        outcomes: [
          {
            text: "content:events.driftMerchant.out.swap",
            consequence: "content:consequence.merchantSwap",
            effects: [{ k: "swapLowestDie" }],
          },
        ],
      },
      {
        id: "decline",
        label: "content:events.driftMerchant.opt.decline",
        outcomes: [
          {
            text: "content:events.driftMerchant.out.decline",
            consequence: "content:consequence.merchantSwap",
            effects: [{ k: "scrap", n: 6 }],
          },
        ],
      },
      {
        id: "buyOne",
        label: "content:events.driftMerchant.opt.buyOne",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.driftMerchant.out.buyOne",
            weight: 3,
            consequence: "content:consequence.merchantSwap",
            effects: [
              { k: "scrap", n: -20 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
          {
            text: "content:events.driftMerchant.out.buyOneRare",
            weight: 1,
            consequence: "content:consequence.merchantSwap",
            effects: [
              { k: "scrap", n: -20 },
              { k: "loot", rarity: "rare" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "radiationPocket",
    weight: 8,
    requires: S1,
    text: "content:events.radiationPocket.text",
    options: [
      {
        id: "push",
        label: "content:events.radiationPocket.opt.push",
        outcomes: [
          {
            text: "content:events.radiationPocket.out.push",
            consequence: "content:consequence.pocketCrossed",
            effects: [
              { k: "hull", n: -3 },
              { k: "tide", n: -1 },
            ],
          },
        ],
      },
      {
        id: "detour",
        label: "content:events.radiationPocket.opt.detour",
        outcomes: [
          {
            text: "content:events.radiationPocket.out.detour",
            consequence: "content:consequence.pocketCrossed",
            effects: [{ k: "scrap", n: 8 }],
          },
        ],
      },
      {
        id: "skim",
        label: "content:events.radiationPocket.opt.skim",
        check: { dice: 2, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.radiationPocket.out.skimPass",
            consequence: "content:consequence.pocketCrossed",
            effects: [
              { k: "tide", n: -1 },
              { k: "scrap", n: 8 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.radiationPocket.out.skimFail",
            consequence: "content:consequence.pocketCrossed",
            effects: [{ k: "hull", n: -5 }],
          },
        ],
      },
    ],
  },
  {
    id: "wardenCache",
    weight: 8,
    speaker: "warden",
    requires: S1,
    text: "content:events.wardenCache.text",
    options: [
      {
        id: "crack",
        label: "content:events.wardenCache.opt.crack",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.wardenCache.out.crackPass",
            effects: [
              { k: "nodeMod", mod: "shipyardDiscount", n: 30 },
              { k: "flag", key: "cacheCracked" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.wardenCache.out.crackFail",
            effects: [
              { k: "flag", key: "alerted" },
              { k: "hull", n: -4 },
            ],
          },
        ],
      },
      {
        id: "leave",
        label: "content:events.wardenCache.opt.leave",
        outcomes: [
          {
            text: "content:events.wardenCache.out.leave",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "cacheLeft" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "alertedPatrol",
    weight: 16,
    speaker: "warden",
    requires: {
      sector: [1],
      flags: { all: ["alerted"], not: ["patrolCleared"] },
    },
    text: "content:events.alertedPatrol.text",
    options: [
      {
        id: "engage",
        label: "content:events.alertedPatrol.opt.engage",
        outcomes: [
          {
            text: "content:events.alertedPatrol.out.engage",
            effects: [{ k: "flag", key: "patrolCleared" }],
            consequence: "content:consequence.alerted",
            follow: {
              enemyIds: ["raiderAlpha", "scavDrone"],
              loot: { rarity: "rare" },
            },
          },
        ],
      },
      {
        id: "evade",
        label: "content:events.alertedPatrol.opt.evade",
        check: { dice: 1, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.alertedPatrol.out.evadePass",
            effects: [
              { k: "scrap", n: 12 },
              { k: "flag", key: "patrolCleared" },
            ],
            consequence: "content:consequence.alerted",
          },
        ],
        onFail: [
          {
            text: "content:events.alertedPatrol.out.evadeFail",
            effects: [
              { k: "hull", n: -6 },
              { k: "flag", key: "patrolCleared" },
            ],
            consequence: "content:consequence.alerted",
          },
        ],
      },
    ],
  },
  {
    id: "gamblersWreck",
    weight: 8,
    requires: S1,
    text: "content:events.gamblersWreck.text",
    options: [
      {
        id: "roll",
        label: "content:events.gamblersWreck.opt.roll",
        requires: { req: "scrap", n: 20 },
        check: { dice: 1, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.gamblersWreck.out.rollPass",
            effects: [{ k: "scrap", n: 40 }],
          },
        ],
        onFail: [
          {
            text: "content:events.gamblersWreck.out.rollFail",
            effects: [{ k: "scrap", n: -20 }],
          },
        ],
      },
      {
        id: "scavenge",
        label: "content:events.gamblersWreck.opt.scavenge",
        outcomes: [
          {
            text: "content:events.gamblersWreck.out.scavenge",
            effects: [{ k: "scrap", n: 12 }],
          },
        ],
      },
      {
        id: "hack",
        label: "content:events.gamblersWreck.opt.hack",
        check: { dice: 3, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.gamblersWreck.out.hackPass",
            effects: [
              { k: "scrap", n: 35 },
              { k: "axis", n: -1 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.gamblersWreck.out.hackFail",
            effects: [
              { k: "hull", n: -4 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "frozenCrew",
    weight: 8,
    requires: S1,
    text: "content:events.frozenCrew.text",
    options: [
      {
        id: "thaw",
        label: "content:events.frozenCrew.opt.thaw",
        requires: { req: "scrap", n: 15 },
        outcomes: [
          {
            text: "content:events.frozenCrew.out.thaw",
            effects: [
              { k: "scrap", n: -15 },
              { k: "hull", n: 4 },
              { k: "flag", key: "crewSaved" },
            ],
          },
        ],
      },
      {
        id: "leave",
        label: "content:events.frozenCrew.opt.leave",
        outcomes: [
          {
            text: "content:events.frozenCrew.out.leave",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
      },
      {
        id: "wakePilot",
        label: "content:events.frozenCrew.opt.wakePilot",
        outcomes: [
          {
            text: "content:events.frozenCrew.out.wakePilot",
            weight: 2,
            effects: [{ k: "nodeMod", mod: "revealRows", n: 2 }],
          },
          {
            text: "content:events.frozenCrew.out.wakePilotBad",
            weight: 1,
            effects: [{ k: "scrap", n: -8 }],
          },
        ],
      },
    ],
  },
  {
    id: "crewGratitude",
    weight: 15,
    requires: { sector: [1], flags: { all: ["crewSaved"] } },
    text: "content:events.crewGratitude.text",
    options: [
      {
        id: "crew",
        label: "content:events.crewGratitude.opt.crew",
        outcomes: [
          {
            text: "content:events.crewGratitude.out.crew",
            effects: [{ k: "nodeMod", mod: "rerollSize", n: 1 }],
            consequence: "content:consequence.crewSaved",
          },
        ],
      },
      {
        id: "pay",
        label: "content:events.crewGratitude.opt.pay",
        outcomes: [
          {
            text: "content:events.crewGratitude.out.pay",
            effects: [{ k: "scrap", n: 18 }],
            consequence: "content:consequence.crewSaved",
          },
        ],
      },
    ],
  },
  {
    id: "probCoreLeak",
    weight: 8,
    requires: S1,
    text: "content:events.probCoreLeak.text",
    options: [
      {
        id: "stabilize",
        label: "content:events.probCoreLeak.opt.stabilize",
        requires: { req: "dieSchool", school: "blue" },
        outcomes: [
          {
            text: "content:events.probCoreLeak.out.stabilize",
            consequence: "content:consequence.leakHandled",
            effects: [
              { k: "axis", n: 2 },
              { k: "hull", n: 2 },
            ],
          },
        ],
      },
      {
        id: "harvest",
        label: "content:events.probCoreLeak.opt.harvest",
        requires: { req: "dieSchool", school: "black" },
        outcomes: [
          {
            text: "content:events.probCoreLeak.out.harvest",
            consequence: "content:consequence.leakHandled",
            effects: [
              { k: "axis", n: -2 },
              { k: "loot", die: "black-d6" },
              { k: "hull", n: -2 },
            ],
          },
        ],
      },
      {
        id: "vent",
        label: "content:events.probCoreLeak.opt.vent",
        outcomes: [
          {
            text: "content:events.probCoreLeak.out.vent",
            weight: 3,
            consequence: "content:consequence.leakHandled",
            effects: [
              { k: "hull", n: -2 },
              { k: "scrap", n: 8 },
            ],
          },
          {
            text: "content:events.probCoreLeak.out.ventSpill",
            weight: 1,
            consequence: "content:consequence.leakHandled",
            effects: [
              { k: "hull", n: -2 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "silentField",
    weight: 4,
    requires: S1,
    codex: "silentField",
    text: "content:events.silentField.text",
    options: [
      {
        id: "chart",
        label: "content:events.silentField.opt.chart",
        requires: { req: "axis", min: 2 },
        outcomes: [
          {
            text: "content:events.silentField.out.chart",
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 3 },
              { k: "hullMax", n: 2 },
              { k: "flag", key: "quietCharted" },
            ],
            consequence: "content:consequence.quietCharted",
          },
        ],
      },
      {
        id: "drift",
        label: "content:events.silentField.opt.drift",
        outcomes: [
          {
            text: "content:events.silentField.out.drift",
            effects: [{ k: "scrap", n: 5 }],
          },
        ],
      },
    ],
  },
  {
    id: "tollGate",
    weight: 8,
    requires: S1,
    text: "content:events.tollGate.text",
    options: [
      {
        id: "pay",
        label: "content:events.tollGate.opt.pay",
        requires: { req: "scrap", n: 15 },
        outcomes: [
          {
            text: "content:events.tollGate.out.pay",
            effects: [{ k: "scrap", n: -15 }],
          },
        ],
      },
      {
        id: "fight",
        label: "content:events.tollGate.opt.fight",
        outcomes: [
          {
            text: "content:events.tollGate.out.fight",
            effects: [],
            follow: {
              enemyIds: ["raider"],
              loot: { rarity: "uncommon" },
            },
          },
        ],
      },
      {
        id: "sneak",
        label: "content:events.tollGate.opt.sneak",
        check: { dice: 1, pick: "highest", target: 7 },
        onPass: [
          {
            text: "content:events.tollGate.out.sneakPass",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
        onFail: [
          {
            text: "content:events.tollGate.out.sneakFail",
            effects: [{ k: "hull", n: -5 }],
          },
        ],
      },
    ],
  },
  {
    id: "mirrorFlare",
    weight: 7,
    requires: S1,
    text: "content:events.mirrorFlare.text",
    options: [
      {
        id: "absorb",
        label: "content:events.mirrorFlare.opt.absorb",
        outcomes: [
          {
            text: "content:events.mirrorFlare.out.absorb",
            consequence: "content:consequence.flareMet",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "axis", n: -1 },
            ],
          },
        ],
      },
      {
        id: "lookAway",
        label: "content:events.mirrorFlare.opt.lookAway",
        outcomes: [
          {
            text: "content:events.mirrorFlare.out.lookAway",
            consequence: "content:consequence.flareMet",
            effects: [{ k: "axis", n: 1 }],
          },
        ],
      },
    ],
  },
  {
    id: "driftRace",
    weight: 7,
    speaker: "yusuf",
    requires: S1,
    text: "content:events.driftRace.text",
    options: [
      {
        id: "race",
        label: "content:events.driftRace.opt.race",
        requires: { req: "mk", slot: "engines", mk: 2 },
        outcomes: [
          {
            text: "content:events.driftRace.out.race",
            consequence: "content:consequence.runnersRaced",
            effects: [{ k: "scrap", n: 35 }],
          },
        ],
      },
      {
        id: "decline",
        label: "content:events.driftRace.opt.decline",
        outcomes: [
          {
            text: "content:events.driftRace.out.decline",
            consequence: "content:consequence.runnersRaced",
            effects: [{ k: "scrap", n: 5 }],
          },
        ],
      },
      {
        id: "bet",
        label: "content:events.driftRace.opt.bet",
        requires: { req: "scrap", n: 15 },
        outcomes: [
          {
            text: "content:events.driftRace.out.bet",
            weight: 2,
            consequence: "content:consequence.runnersRaced",
            effects: [{ k: "scrap", n: -15 }],
          },
          {
            text: "content:events.driftRace.out.betWon",
            weight: 1,
            consequence: "content:consequence.runnersRaced",
            effects: [{ k: "scrap", n: 35 }],
          },
        ],
      },
    ],
  },
  {
    id: "sensorGhost",
    weight: 7,
    requires: S1,
    text: "content:events.sensorGhost.text",
    options: [
      {
        id: "reveal",
        label: "content:events.sensorGhost.opt.reveal",
        requires: { req: "mk", slot: "sensors", mk: 2 },
        outcomes: [
          {
            text: "content:events.sensorGhost.out.reveal",
            consequence: "content:consequence.ghostResolved",
            effects: [{ k: "nodeMod", mod: "revealRows", n: 2 }],
          },
        ],
      },
      {
        id: "fire",
        label: "content:events.sensorGhost.opt.fire",
        outcomes: [
          {
            text: "content:events.sensorGhost.out.fire",
            consequence: "content:consequence.ghostResolved",
            effects: [
              { k: "hull", n: -2 },
              { k: "scrap", n: 8 },
            ],
          },
        ],
      },
      {
        id: "hail",
        label: "content:events.sensorGhost.opt.hail",
        outcomes: [
          {
            text: "content:events.sensorGhost.out.hail",
            weight: 2,
            consequence: "content:consequence.ghostResolved",
            effects: [{ k: "scrap", n: 15 }],
          },
          {
            text: "content:events.sensorGhost.out.hailTrap",
            weight: 1,
            consequence: "content:consequence.ghostResolved",
            effects: [],
            follow: {
              enemyIds: ["jammerCorvette"],
              loot: { rarity: "uncommon" },
            },
          },
        ],
      },
    ],
  },
  {
    id: "yusufConvoy",
    weight: 8,
    speaker: "yusuf",
    requires: S1,
    text: "content:events.yusufConvoy.text",
    options: [
      {
        id: "escort",
        label: "content:events.yusufConvoy.opt.escort",
        outcomes: [
          {
            text: "content:events.yusufConvoy.out.escort",
            effects: [{ k: "flag", key: "yusufFriend" }],
            follow: {
              enemyIds: ["scavDrone", "scavDrone"],
              scrap: 40,
              setFlags: [["yusufFriend", true]],
            },
          },
        ],
      },
      {
        id: "tax",
        label: "content:events.yusufConvoy.opt.tax",
        outcomes: [
          {
            text: "content:events.yusufConvoy.out.tax",
            effects: [
              { k: "scrap", n: 15 },
              { k: "flag", key: "yusufGrudge" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "yusufEscortPaid",
    weight: 15,
    speaker: "yusuf",
    requires: { sector: [1], flags: { all: ["yusufFriend"] } },
    text: "content:events.yusufEscortPaid.text",
    options: [
      {
        id: "bonus",
        label: "content:events.yusufEscortPaid.opt.bonus",
        outcomes: [
          {
            text: "content:events.yusufEscortPaid.out.bonus",
            effects: [
              { k: "scrap", n: 25 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.yusufFriend",
          },
        ],
      },
      {
        id: "wave",
        label: "content:events.yusufEscortPaid.opt.wave",
        outcomes: [
          {
            text: "content:events.yusufEscortPaid.out.wave",
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.yusufFriend",
          },
        ],
      },
    ],
  },
  {
    id: "rimNoticeboard",
    weight: 14,
    requires: { sector: [1] },
    text: "content:events.rimNoticeboard.text",
    options: [
      {
        id: "readIt",
        label: "content:events.rimNoticeboard.opt.readIt",
        outcomes: [
          {
            text: "content:events.rimNoticeboard.out.readIt",
            weight: 3,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "flag", key: "boardRead" }
            ],
            consequence: "content:consequence.rimBoardRead",
          },
          {
            text: "content:events.rimNoticeboard.out.readItOld",
            weight: 2,
            effects: [
              { k: "scrap", n: 25 },
              { k: "flag", key: "boardRead" }
            ],
            consequence: "content:consequence.rimBoardRead",
          },
        ],
      },
      {
        id: "postYours",
        label: "content:events.rimNoticeboard.opt.postYours",
        outcomes: [
          {
            text: "content:events.rimNoticeboard.out.postYours",
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "boardPosted" },
              { k: "nodeMod", mod: "endHeal", n: 1 }
            ],
            consequence: "content:consequence.rimBoardPosted",
          },
        ],
      },
      {
        id: "stripBoard",
        label: "content:events.rimNoticeboard.opt.stripBoard",
        outcomes: [
          {
            text: "content:events.rimNoticeboard.out.stripBoard",
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: -2 },
              { k: "flag", key: "boardTaken" }
            ],
            consequence: "content:consequence.rimBoardTaken",
          },
        ],
      },
      {
        id: "haul",
        label: "content:events.rimNoticeboard.opt.haul",
        requires: { req: "cargo", id: "leadBallast" },
        outcomes: [
          {
            text: "content:events.rimNoticeboard.out.haul",
            effects: [{ k: "cargo", id: "leadBallast" }],
            consequence: "content:consequence.cargoTaken",
          },
        ],
      },
    ],
  },
  {
    id: "wardenInspector",
    weight: 9,
    speaker: "warden",
    requires: S1,
    text: "content:events.wardenInspector.text",
    dialogue: [
      { who: "warden", line: "content:events.wardenInspector.dia.l1" },
      { who: "echo", line: "content:events.wardenInspector.dia.l2" },
    ],
    options: [
      {
        id: "declare",
        label: "content:events.wardenInspector.opt.declare",
        outcomes: [
          {
            text: "content:events.wardenInspector.out.declare",
            weight: 2,
            effects: [
              { k: "swapLowestDie" },
              { k: "flag", key: "inspectionStamped" },
            ],
          },
          {
            text: "content:events.wardenInspector.out.declareFined",
            weight: 1,
            effects: [
              { k: "scrap", n: -10 },
              { k: "flag", key: "inspectionStamped" },
            ],
          },
        ],
      },
      {
        id: "hide",
        label: "content:events.wardenInspector.opt.hide",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.wardenInspector.out.hidePass",
            effects: [
              { k: "tide", n: -1 },
              { k: "flag", key: "inspectionStamped" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.wardenInspector.out.hideFail",
            effects: [
              { k: "hull", n: -3 },
              { k: "flag", key: "alerted" },
            ],
          },
        ],
      },
      {
        id: "burnOff",
        label: "content:events.wardenInspector.opt.burnOff",
        outcomes: [
          {
            text: "content:events.wardenInspector.out.burnOff",
            weight: 2,
            effects: [
              { k: "hull", n: -3 },
              { k: "scrap", n: 20 },
            ],
          },
          {
            text: "content:events.wardenInspector.out.burnOffSignal",
            weight: 1,
            effects: [
              { k: "hull", n: -3 },
              { k: "scrap", n: 20 },
              { k: "flag", key: "alerted" },
            ],
          },
        ],
      },
      {
        id: "rewire",
        label: "content:events.wardenInspector.opt.rewire",
        check: { dice: 1, pick: "highest", target: 4 },
        onPass: [
          {
            text: "content:events.wardenInspector.out.rewirePass",
            effects: [{ k: "nodeMod", mod: "revealRows", n: 2 }],
          },
        ],
        onFail: [
          {
            text: "content:events.wardenInspector.out.rewireFail",
            effects: [{ k: "hull", n: -4 }],
          },
        ],
      },
    ],
  },
  {
    id: "wardenPicket",
    weight: 14,
    speaker: "warden",
    requires: { sector: [1], flags: { all: ["inspectionStamped"] } },
    text: "content:events.wardenPicket.text",
    dialogue: [
      { who: "warden", line: "content:events.wardenPicket.dia.l1" },
      { who: "echo", line: "content:events.wardenPicket.dia.l2" },
    ],
    options: [
      {
        id: "submit",
        label: "content:events.wardenPicket.opt.submit",
        outcomes: [
          {
            text: "content:events.wardenPicket.out.submit",
            weight: 3,
            effects: [
              { k: "flag", key: "patrolCleared" },
              { k: "hull", n: 4 },
            ],
            consequence: "content:consequence.inspectionStamped",
          },
          {
            text: "content:events.wardenPicket.out.submitFined",
            weight: 1,
            effects: [
              { k: "flag", key: "patrolCleared" },
              { k: "scrap", n: -15 },
            ],
            consequence: "content:consequence.inspectionStamped",
          },
        ],
      },
      {
        id: "fee",
        label: "content:events.wardenPicket.opt.fee",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.wardenPicket.out.fee",
            weight: 3,
            effects: [
              { k: "scrap", n: -20 },
              { k: "flag", key: "patrolCleared" },
              { k: "tide", n: -1 },
            ],
            consequence: "content:consequence.inspectionStamped",
          },
          {
            text: "content:events.wardenPicket.out.feeLogged",
            weight: 1,
            effects: [
              { k: "scrap", n: -20 },
              { k: "flag", key: "patrolCleared" },
            ],
            consequence: "content:consequence.inspectionStamped",
          },
        ],
      },
      {
        id: "forge",
        label: "content:events.wardenPicket.opt.forge",
        check: { dice: 2, pick: "sum", target: 8 },
        onPass: [
          {
            text: "content:events.wardenPicket.out.forgePass",
            effects: [
              { k: "flag", key: "patrolCleared" },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.inspectionStamped",
          },
        ],
        onFail: [
          {
            text: "content:events.wardenPicket.out.forgeFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "flag", key: "alerted" },
            ],
            consequence: "content:consequence.inspectionStamped",
          },
        ],
      },
      {
        id: "seize",
        label: "content:events.wardenPicket.opt.seize",
        outcomes: [
          {
            text: "content:events.wardenPicket.out.seize",
            weight: 3,
            effects: [
              { k: "axis", n: -1 },
              { k: "flag", key: "patrolCleared" },
            ],
            consequence: "content:consequence.inspectionStamped",
            follow: {
              enemyIds: ["shieldWarden", "scavDrone"],
              scrap: 20,
              loot: { rarity: "uncommon" },
            },
          },
          {
            text: "content:events.wardenPicket.out.seizeYield",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "scrap", n: 30 },
              { k: "flag", key: "patrolCleared" },
            ],
            consequence: "content:consequence.inspectionStamped",
          },
        ],
      },
    ],
  },
  {
    id: "twelfthHull",
    weight: 7,
    requires: S1,
    text: "content:events.twelfthHull.text",
    dialogue: [
      { who: "echo", line: "content:events.twelfthHull.dia.l1" },
      { who: "echo", line: "content:events.twelfthHull.dia.l2" },
      { who: "narration", line: "content:events.twelfthHull.dia.l3" },
    ],
    options: [
      {
        id: "board",
        label: "content:events.twelfthHull.opt.board",
        check: { dice: 2, pick: "sum", target: 7 },
        onPass: [
          {
            text: "content:events.twelfthHull.out.boardPass",
            effects: [
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "twelfthBoarded" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.twelfthHull.out.boardFail",
            effects: [
              { k: "hull", n: -5 },
              { k: "flag", key: "twelfthBoarded" },
            ],
          },
        ],
      },
      {
        id: "hail",
        label: "content:events.twelfthHull.opt.hail",
        outcomes: [
          {
            text: "content:events.twelfthHull.out.hail",
            weight: 2,
            effects: [
              { k: "nodeMod", mod: "revealRows", n: 2 },
              { k: "flag", key: "twelfthHailed" },
            ],
          },
          {
            text: "content:events.twelfthHull.out.hailSelf",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "flag", key: "twelfthHailed" },
            ],
          },
        ],
      },
      {
        id: "strip",
        label: "content:events.twelfthHull.opt.strip",
        outcomes: [
          {
            text: "content:events.twelfthHull.out.strip",
            weight: 3,
            effects: [{ k: "scrap", n: 30 }],
          },
          {
            text: "content:events.twelfthHull.out.stripBit",
            weight: 1,
            effects: [
              { k: "scrap", n: 30 },
              { k: "hull", n: -4 },
            ],
          },
        ],
      },
      {
        id: "mark",
        label: "content:events.twelfthHull.opt.mark",
        outcomes: [
          {
            text: "content:events.twelfthHull.out.mark",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "flag", key: "twelfthTagged" },
            ],
          },
          {
            text: "content:events.twelfthHull.out.markLit",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "tide", n: 1 },
              { k: "flag", key: "twelfthTagged" },
            ],
          },
        ],
      },
      {
        id: "scuttle",
        label: "content:events.twelfthHull.opt.scuttle",
        outcomes: [
          {
            text: "content:events.twelfthHull.out.scuttle",
            weight: 2,
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: -1 },
            ],
          },
          {
            text: "content:events.twelfthHull.out.scuttleTwin",
            weight: 1,
            effects: [
              { k: "tide", n: 1 },
              { k: "axis", n: -1 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "twelfthWake",
    weight: 14,
    requires: {
      sector: [1],
      flags: { any: ["twelfthBoarded", "twelfthHailed", "twelfthTagged"] },
    },
    text: "content:events.twelfthWake.text",
    dialogue: [
      { who: "echo", line: "content:events.twelfthWake.dia.l1" },
      { who: "echo", line: "content:events.twelfthWake.dia.l2" },
    ],
    options: [
      {
        id: "escort",
        label: "content:events.twelfthWake.opt.escort",
        outcomes: [
          {
            text: "content:events.twelfthWake.out.escort",
            weight: 2,
            effects: [{ k: "battleMod", mod: "startCharge", n: 2, battles: 2 }],
            consequence: "content:consequence.twelfthHull",
          },
          {
            text: "content:events.twelfthWake.out.escortBrief",
            weight: 1,
            effects: [
              { k: "battleMod", mod: "startCharge", n: 2, battles: 1 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.twelfthHull",
          },
        ],
      },
      {
        id: "answer",
        label: "content:events.twelfthWake.opt.answer",
        requires: { req: "flag", key: "twelfthHailed" },
        outcomes: [
          {
            text: "content:events.twelfthWake.out.answer",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "sectorReveal", n: 1 },
            ],
            consequence: "content:consequence.twelfthHull",
          },
          {
            text: "content:events.twelfthWake.out.answerGift",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.twelfthHull",
          },
        ],
      },
      {
        id: "shake",
        label: "content:events.twelfthWake.opt.shake",
        check: { dice: 3, pick: "sum", target: 11 },
        onPass: [
          {
            text: "content:events.twelfthWake.out.shakePass",
            effects: [{ k: "tide", n: -1 }],
            consequence: "content:consequence.twelfthHull",
          },
        ],
        onFail: [
          {
            text: "content:events.twelfthWake.out.shakeFail",
            effects: [{ k: "hull", n: -5 }],
            consequence: "content:consequence.twelfthHull",
          },
        ],
      },
      {
        id: "fire",
        label: "content:events.twelfthWake.opt.fire",
        outcomes: [
          {
            text: "content:events.twelfthWake.out.fire",
            weight: 2,
            effects: [],
            consequence: "content:consequence.twelfthHull",
            follow: {
              enemyIds: ["anchorHulk"],
              loot: { rarity: "uncommon" },
            },
          },
          {
            text: "content:events.twelfthWake.out.fireBreak",
            weight: 1,
            effects: [
              { k: "scrap", n: 25 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.twelfthHull",
          },
        ],
      },
    ],
  },
  {
    id: "salvageClaim",
    weight: 8,
    requires: S1,
    text: "content:events.salvageClaim.text",
    options: [
      {
        id: "cutFirst",
        label: "content:events.salvageClaim.opt.cutFirst",
        check: { dice: 2, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.salvageClaim.out.cutPass",
            effects: [
              { k: "scrap", n: 30 },
              { k: "flag", key: "claimJumped" },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.salvageClaim.out.cutFail",
            effects: [{ k: "hull", n: -4 }],
          },
        ],
      },
      {
        id: "split",
        label: "content:events.salvageClaim.opt.split",
        outcomes: [
          {
            text: "content:events.salvageClaim.out.split",
            weight: 3,
            effects: [
              { k: "scrap", n: 15 },
              { k: "axis", n: 1 },
            ],
          },
          {
            text: "content:events.salvageClaim.out.splitShort",
            weight: 1,
            effects: [
              { k: "scrap", n: 5 },
              { k: "axis", n: 1 },
            ],
          },
        ],
      },
      {
        id: "buyOut",
        label: "content:events.salvageClaim.opt.buyOut",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.salvageClaim.out.buyOut",
            weight: 2,
            effects: [
              { k: "scrap", n: -20 },
              { k: "loot", rarity: "uncommon" },
            ],
          },
          {
            text: "content:events.salvageClaim.out.buyOutPlate",
            weight: 1,
            effects: [
              { k: "scrap", n: -20 },
              { k: "hullMax", n: 2 },
            ],
          },
        ],
      },
      {
        id: "maraName",
        label: "content:events.salvageClaim.opt.maraName",
        requires: { req: "flag", key: "maraFriend" },
        outcomes: [
          {
            text: "content:events.salvageClaim.out.maraName",
            weight: 2,
            effects: [{ k: "scrap", n: 25 }],
          },
          {
            text: "content:events.salvageClaim.out.maraNameCore",
            weight: 1,
            effects: [{ k: "loot", rarity: "uncommon" }],
          },
        ],
      },
    ],
  },
  {
    id: "claimFeud",
    weight: 14,
    requires: { sector: [1], flags: { all: ["claimJumped"] } },
    text: "content:events.claimFeud.text",
    dialogue: [
      { who: "narration", line: "content:events.claimFeud.dia.l1" },
      { who: "echo", line: "content:events.claimFeud.dia.l2" },
    ],
    options: [
      {
        id: "fight",
        label: "content:events.claimFeud.opt.fight",
        outcomes: [
          {
            text: "content:events.claimFeud.out.fight",
            weight: 3,
            effects: [],
            consequence: "content:consequence.claimJumped",
            follow: {
              enemyIds: ["raider", "scavDrone"],
              scrap: 30,
            },
          },
          {
            text: "content:events.claimFeud.out.fightFold",
            weight: 1,
            effects: [{ k: "scrap", n: 20 }],
            consequence: "content:consequence.claimJumped",
          },
        ],
      },
      {
        id: "payShare",
        label: "content:events.claimFeud.opt.payShare",
        requires: { req: "scrap", n: 25 },
        outcomes: [
          {
            text: "content:events.claimFeud.out.payShare",
            weight: 2,
            effects: [
              { k: "scrap", n: -25 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.claimJumped",
          },
          {
            text: "content:events.claimFeud.out.payShareTip",
            weight: 1,
            effects: [
              { k: "scrap", n: -25 },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.claimJumped",
          },
        ],
      },
      {
        id: "outrun",
        label: "content:events.claimFeud.opt.outrun",
        check: { dice: 3, pick: "sum", target: 12 },
        onPass: [
          {
            text: "content:events.claimFeud.out.outrunPass",
            effects: [{ k: "tide", n: -1 }],
            consequence: "content:consequence.claimJumped",
          },
        ],
        onFail: [
          {
            text: "content:events.claimFeud.out.outrunFail",
            effects: [{ k: "hull", n: -6 }],
            consequence: "content:consequence.claimJumped",
          },
        ],
      },
      {
        id: "pageTwo",
        label: "content:events.claimFeud.opt.pageTwo",
        check: { dice: 1, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.claimFeud.out.pageTwoPass",
            effects: [{ k: "scrap", n: 15 }],
            consequence: "content:consequence.claimJumped",
          },
        ],
        onFail: [
          {
            text: "content:events.claimFeud.out.pageTwoFail",
            effects: [{ k: "hull", n: -4 }],
            consequence: "content:consequence.claimJumped",
          },
        ],
      },
    ],
  },
  {
    id: "choirCountdown",
    weight: 8,
    speaker: "choirPreacher",
    requires: S1,
    text: "content:events.choirCountdown.text",
    dialogue: [
      { who: "choirPreacher", line: "content:events.choirCountdown.dia.l1" },
      { who: "echo", line: "content:events.choirCountdown.dia.l2" },
    ],
    options: [
      {
        id: "countAlong",
        label: "content:events.choirCountdown.opt.countAlong",
        outcomes: [
          {
            text: "content:events.choirCountdown.out.countAlong",
            weight: 2,
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "startCharge", n: 2, battles: 2 },
              { k: "flag", key: "countJoined" },
            ],
          },
          {
            text: "content:events.choirCountdown.out.countAlongCalm",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "hull", n: 3 },
              { k: "flag", key: "countJoined" },
            ],
          },
        ],
      },
      {
        id: "retune",
        label: "content:events.choirCountdown.opt.retune",
        check: { dice: 2, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.choirCountdown.out.retunePass",
            effects: [
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.choirCountdown.out.retuneFail",
            effects: [
              { k: "axis", n: -1 },
              { k: "hull", n: -3 },
            ],
          },
        ],
      },
      {
        id: "cutLoose",
        label: "content:events.choirCountdown.opt.cutLoose",
        outcomes: [
          {
            text: "content:events.choirCountdown.out.cutLoose",
            weight: 3,
            effects: [
              { k: "scrap", n: 20 },
              { k: "axis", n: 1 },
            ],
          },
          {
            text: "content:events.choirCountdown.out.cutLooseHeard",
            weight: 1,
            effects: [
              { k: "scrap", n: 20 },
              { k: "axis", n: 1 },
              { k: "tide", n: 1 },
            ],
          },
        ],
      },
      {
        id: "giveNumber",
        label: "content:events.choirCountdown.opt.giveNumber",
        requires: { req: "flag", key: "heardChoir" },
        outcomes: [
          {
            text: "content:events.choirCountdown.out.giveNumber",
            weight: 2,
            effects: [
              { k: "axis", n: -1 },
              { k: "loot", rarity: "uncommon" },
              { k: "flag", key: "countJoined" },
            ],
          },
          {
            text: "content:events.choirCountdown.out.giveNumberBlack",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "loot", die: "black-d6" },
              { k: "flag", key: "countJoined" },
            ],
          },
        ],
      },
      {
        id: "record",
        label: "content:events.choirCountdown.opt.record",
        check: { dice: 1, pick: "lowest", target: 3 },
        onPass: [
          {
            text: "content:events.choirCountdown.out.recordPass",
            effects: [{ k: "nodeMod", mod: "sectorReveal", n: 1 }],
          },
        ],
        onFail: [
          {
            text: "content:events.choirCountdown.out.recordFail",
            effects: [{ k: "tide", n: 1 }],
          },
        ],
      },
    ],
  },
  {
    id: "countCollector",
    weight: 13,
    speaker: "choirPreacher",
    requires: { sector: [1], flags: { all: ["countJoined"] } },
    text: "content:events.countCollector.text",
    dialogue: [
      { who: "choirPreacher", line: "content:events.countCollector.dia.l1" },
      { who: "echo", line: "content:events.countCollector.dia.l2" },
    ],
    options: [
      {
        id: "takeNumber",
        label: "content:events.countCollector.opt.takeNumber",
        outcomes: [
          {
            text: "content:events.countCollector.out.takeNumber",
            weight: 2,
            effects: [
              { k: "axis", n: -1 },
              { k: "loot", die: "black-d6" },
            ],
            consequence: "content:consequence.countJoined",
          },
          {
            text: "content:events.countCollector.out.takeNumberCharge",
            weight: 1,
            effects: [
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 2 },
            ],
            consequence: "content:consequence.countJoined",
          },
        ],
      },
      {
        id: "refuse",
        label: "content:events.countCollector.opt.refuse",
        outcomes: [
          {
            text: "content:events.countCollector.out.refuse",
            weight: 2,
            effects: [{ k: "axis", n: 1 }],
            consequence: "content:consequence.countJoined",
            follow: {
              enemyIds: ["choirZealot", "choirZealot"],
              loot: { rarity: "uncommon" },
            },
          },
          {
            text: "content:events.countCollector.out.refuseMarked",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "tide", n: 1 },
            ],
            consequence: "content:consequence.countJoined",
          },
        ],
      },
      {
        id: "paintZero",
        label: "content:events.countCollector.opt.paintZero",
        check: { dice: 1, pick: "highest", target: 5 },
        onPass: [
          {
            text: "content:events.countCollector.out.paintPass",
            effects: [
              { k: "axis", n: 1 },
              { k: "scrap", n: 15 },
            ],
            consequence: "content:consequence.countJoined",
          },
        ],
        onFail: [
          {
            text: "content:events.countCollector.out.paintFail",
            effects: [
              { k: "axis", n: -1 },
              { k: "hull", n: -3 },
            ],
            consequence: "content:consequence.countJoined",
          },
        ],
      },
    ],
  },
  {
    id: "coreSplinter",
    weight: 7,
    requires: S1,
    text: "content:events.coreSplinter.text",
    dialogue: [
      { who: "echo", line: "content:events.coreSplinter.dia.l1" },
      { who: "echo", line: "content:events.coreSplinter.dia.l2" },
    ],
    options: [
      {
        id: "pry",
        label: "content:events.coreSplinter.opt.pry",
        check: { dice: 2, pick: "sum", target: 7 },
        onPass: [
          {
            text: "content:events.coreSplinter.out.pryPass",
            effects: [{ k: "shards", n: 10 }],
          },
        ],
        onFail: [
          {
            text: "content:events.coreSplinter.out.pryFail",
            effects: [{ k: "hull", n: -4 }],
          },
        ],
      },
      {
        id: "feed",
        label: "content:events.coreSplinter.opt.feed",
        outcomes: [
          {
            text: "content:events.coreSplinter.out.feed",
            weight: 2,
            effects: [{ k: "battleMod", mod: "startCharge", n: 2, battles: 3 }],
          },
          {
            text: "content:events.coreSplinter.out.feedChoke",
            weight: 1,
            effects: [
              { k: "battleMod", mod: "startCharge", n: 2, battles: 1 },
              { k: "hull", n: -3 },
            ],
          },
        ],
      },
      {
        id: "graft",
        label: "content:events.coreSplinter.opt.graft",
        check: { dice: 1, pick: "highest", target: 3, school: "green" },
        onPass: [
          {
            text: "content:events.coreSplinter.out.graftPass",
            effects: [
              { k: "hullMax", n: 2 },
              { k: "hull", n: 2 },
            ],
          },
        ],
        onFail: [
          {
            text: "content:events.coreSplinter.out.graftFail",
            effects: [{ k: "hull", n: -3 }],
          },
        ],
      },
      {
        id: "sell",
        label: "content:events.coreSplinter.opt.sell",
        outcomes: [
          {
            text: "content:events.coreSplinter.out.sell",
            weight: 3,
            effects: [{ k: "scrap", n: 20 }],
          },
          {
            text: "content:events.coreSplinter.out.sellHigh",
            weight: 1,
            effects: [{ k: "scrap", n: 35 }],
          },
        ],
      },
    ],
  },
  {
    id: "yusufTariff",
    weight: 14,
    speaker: "yusuf",
    requires: { sector: [1], flags: { all: ["yusufGrudge"] } },
    text: "content:events.yusufTariff.text",
    dialogue: [
      { who: "yusuf", line: "content:events.yusufTariff.dia.l1" },
      { who: "echo", line: "content:events.yusufTariff.dia.l2" },
    ],
    options: [
      {
        id: "pay",
        label: "content:events.yusufTariff.opt.pay",
        requires: { req: "scrap", n: 20 },
        outcomes: [
          {
            text: "content:events.yusufTariff.out.pay",
            weight: 2,
            effects: [
              { k: "scrap", n: -20 },
              { k: "axis", n: 1 },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
          {
            text: "content:events.yusufTariff.out.payTip",
            weight: 1,
            effects: [
              { k: "scrap", n: -20 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
        ],
      },
      {
        id: "holdLane",
        label: "content:events.yusufTariff.opt.holdLane",
        check: { dice: 3, pick: "highest", target: 6 },
        onPass: [
          {
            text: "content:events.yusufTariff.out.holdPass",
            effects: [{ k: "scrap", n: 15 }],
            consequence: "content:consequence.yusufGrudge",
          },
        ],
        onFail: [
          {
            text: "content:events.yusufTariff.out.holdFail",
            effects: [
              { k: "hull", n: -4 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 1 },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
        ],
      },
      {
        id: "apologize",
        label: "content:events.yusufTariff.opt.apologize",
        outcomes: [
          {
            text: "content:events.yusufTariff.out.apologize",
            weight: 2,
            effects: [
              { k: "axis", n: 1 },
              { k: "hull", n: 3 },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
          {
            text: "content:events.yusufTariff.out.apologizeCore",
            weight: 1,
            effects: [
              { k: "axis", n: 1 },
              { k: "loot", rarity: "uncommon" },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
        ],
      },
      {
        id: "taxAgain",
        label: "content:events.yusufTariff.opt.taxAgain",
        outcomes: [
          {
            text: "content:events.yusufTariff.out.taxAgain",
            weight: 2,
            effects: [
              { k: "scrap", n: 25 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.yusufGrudge",
          },
          {
            text: "content:events.yusufTariff.out.taxAgainFight",
            weight: 1,
            effects: [{ k: "axis", n: -1 }],
            consequence: "content:consequence.yusufGrudge",
            follow: {
              enemyIds: ["jammerCorvette", "scavDrone"],
              scrap: 20,
            },
          },
        ],
      },
    ],
  },
];
