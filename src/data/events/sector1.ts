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
            effects: [{ k: "scrap", n: 22 }],
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
            effects: [],
            consequence: "content:consequence.hunterMark",
            follow: {
              enemyIds: ["bountyHuntress"],
              loot: { rarity: "rare" },
              setFlags: [["hunterEngaged", true]],
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
            effects: [{ k: "scrap", n: 8 }],
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
            effects: [
              { k: "hullMax", n: -2 },
              { k: "nodeMod", mod: "endHeal", n: 1 },
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
            effects: [
              { k: "scrap", n: 20 },
              { k: "axis", n: -1 },
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
            effects: [{ k: "scrap", n: 6 }],
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
            effects: [{ k: "scrap", n: 8 }],
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
            effects: [{ k: "nodeMod", mod: "shipyardDiscount", n: 30 }],
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
            effects: [{ k: "axis", n: 1 }],
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
            effects: [],
            consequence: "content:consequence.alerted",
            follow: {
              enemyIds: ["raiderAlpha", "scavDrone"],
              loot: { rarity: "rare" },
              setFlags: [["patrolCleared", true]],
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
            effects: [
              { k: "axis", n: -2 },
              { k: "loot", die: "black-d6" },
              { k: "hull", n: -2 },
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
            effects: [{ k: "scrap", n: 5 }],
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
            effects: [
              { k: "hull", n: -2 },
              { k: "scrap", n: 8 },
            ],
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
];
