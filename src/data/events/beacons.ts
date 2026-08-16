import type { EventDef } from "@/types/events";

// ── Beacon flag graph (Task 5) ────────────────────────────────────────────────
//
//  S1 beaconKeeperIntro ──┬─ take   → beaconKey1, axis +1
//                         ├─ sell   → scrap,      axis −1, keeperSlighted
//                         └─ smash  → tide −1,    axis −2, keeperSlighted, beaconBroken
//
//  S2 fleetBlackbox ──────┬─ share (needs yusufFriend) → fleetTruthShared, yusufFriend↑
//                         ├─ keep   → fleetTruthKept, axis −1
//                         └─ wipe   → axis +1, fleetTruthLost
//
//  S3 choirInvitation ────┬─ accept → pactStep1, axis −2
//                         ├─ refuse → refusedChoir, axis +2
//                         └─ probe (check) → pass: choirDoctrine codex + refusedChoir
//                                            fail: hull loss, pactStep1
//
//  S4 pactSeal (requires pactStep1) ─┬─ complete → pactSealed  (unlocks Choir Bargain)
//                                    └─ betray   → choirEnemy + elite fight
//
//  S5 coreThreshold ──────┬─ listen  → silentReady when all five beacons resolved
//                         ├─ answer  → axis −1, coreAnswered
//                         └─ silence → axis +1, coreSilenced
//
//  Endings read: axis (Seal/Merge), pactSealed (Bargain),
//  silentReady + beaconsResolved≥5 + (crewSaved|courierFreed) (Silent Fleet).
//
//  Cross-references wired into earlier content: keeperSlighted (Mara's stock line),
//  fleetTruthShared (Yusuf callback), refusedChoir (Preacher callback).
// ──────────────────────────────────────────────────────────────────────────────

export const BEACON_EVENTS: readonly EventDef[] = [
  {
    id: "beaconKeeperIntro",
    kind: "beacon",
    weight: 1,
    speaker: "beaconKeeper",
    requires: { sector: [1] },
    text: "content:events.beaconKeeperIntro.text",
    codex: "keeperCreed",
    options: [
      {
        id: "take",
        label: "content:events.beaconKeeperIntro.take",
        outcomes: [
          {
            text: "content:events.beaconKeeperIntro.takeOut",
            effects: [
              { k: "flag", key: "beaconKey1" },
              { k: "flag", key: "beacon1" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "revealRows", n: 2 },
            ],
            codex: "keeperCreed",
            consequence: "content:consequence.beaconKey",
          },
        ],
      },
      {
        id: "sell",
        label: "content:events.beaconKeeperIntro.sell",
        outcomes: [
          {
            text: "content:events.beaconKeeperIntro.sellOut",
            effects: [
              { k: "scrap", n: 45 },
              { k: "axis", n: -1 },
              { k: "flag", key: "keeperSlighted" },
              { k: "flag", key: "beacon1" },
            ],
            consequence: "content:consequence.keeperSlighted",
          },
        ],
      },
      {
        id: "smash",
        label: "content:events.beaconKeeperIntro.smash",
        outcomes: [
          {
            text: "content:events.beaconKeeperIntro.smashOut",
            effects: [
              { k: "tide", n: -1 },
              { k: "axis", n: -2 },
              { k: "flag", key: "keeperSlighted" },
              { k: "flag", key: "beaconBroken" },
              { k: "flag", key: "beacon1" },
            ],
            consequence: "content:consequence.beaconBroken",
          },
        ],
      },
    ],
  },
  {
    id: "fleetBlackbox",
    kind: "beacon",
    weight: 1,
    speaker: "yusuf",
    requires: { sector: [2] },
    text: "content:events.fleetBlackbox.text",
    codex: "fleetBlackbox",
    options: [
      {
        id: "share",
        label: "content:events.fleetBlackbox.share",
        requires: { req: "flag", key: "yusufFriend" },
        outcomes: [
          {
            text: "content:events.fleetBlackbox.shareOut",
            effects: [
              { k: "flag", key: "fleetTruthShared" },
              { k: "flag", key: "beacon2" },
              { k: "scrap", n: 30 },
              { k: "nodeMod", mod: "shipyardDiscount", n: 40 },
            ],
            codex: "fleetBlackbox",
            consequence: "content:consequence.fleetShared",
          },
        ],
      },
      {
        id: "keep",
        label: "content:events.fleetBlackbox.keep",
        outcomes: [
          {
            text: "content:events.fleetBlackbox.keepOut",
            effects: [
              { k: "flag", key: "fleetTruthKept" },
              { k: "flag", key: "beacon2" },
              { k: "axis", n: -1 },
              { k: "loot", rarity: "uncommon" },
            ],
            codex: "fleetBlackbox",
          },
        ],
      },
      {
        id: "wipe",
        label: "content:events.fleetBlackbox.wipe",
        outcomes: [
          {
            text: "content:events.fleetBlackbox.wipeOut",
            effects: [
              { k: "flag", key: "fleetTruthLost" },
              { k: "flag", key: "beacon2" },
              { k: "axis", n: 1 },
              { k: "hull", n: 4 },
            ],
            consequence: "content:consequence.fleetWiped",
          },
        ],
      },
    ],
  },
  {
    id: "choirInvitation",
    kind: "beacon",
    weight: 1,
    speaker: "choirPreacher",
    requires: { sector: [3] },
    text: "content:events.choirInvitation.text",
    codex: "choirDoctrine",
    options: [
      {
        id: "accept",
        label: "content:events.choirInvitation.accept",
        outcomes: [
          {
            text: "content:events.choirInvitation.acceptOut",
            effects: [
              { k: "flag", key: "pactStep1" },
              { k: "flag", key: "beacon3" },
              { k: "axis", n: -2 },
              { k: "battleMod", mod: "startCharge", n: 3, battles: 3 },
            ],
            codex: "choirDoctrine",
            consequence: "content:consequence.pactStep1",
          },
        ],
      },
      {
        id: "refuse",
        label: "content:events.choirInvitation.refuse",
        outcomes: [
          {
            text: "content:events.choirInvitation.refuseOut",
            effects: [
              { k: "flag", key: "refusedChoir" },
              { k: "flag", key: "beacon3" },
              { k: "axis", n: 2 },
              { k: "hullMax", n: 2 },
            ],
            consequence: "content:consequence.refusedChoir",
          },
        ],
      },
      {
        id: "probe",
        label: "content:events.choirInvitation.probe",
        check: { dice: 2, pick: "sum", target: 9 },
        onPass: [
          {
            text: "content:events.choirInvitation.probePass",
            effects: [
              { k: "flag", key: "refusedChoir" },
              { k: "flag", key: "beacon3" },
              { k: "axis", n: 1 },
              { k: "scrap", n: 25 },
            ],
            codex: "choirDoctrine",
          },
        ],
        onFail: [
          {
            text: "content:events.choirInvitation.probeFail",
            effects: [
              { k: "flag", key: "pactStep1" },
              { k: "flag", key: "beacon3" },
              { k: "hull", n: -5 },
              { k: "axis", n: -1 },
            ],
            consequence: "content:consequence.pactStep1",
          },
        ],
      },
    ],
  },
  {
    id: "pactSeal",
    kind: "beacon",
    weight: 1,
    speaker: "choirPreacher",
    requires: { sector: [4], flags: { all: ["pactStep1"] } },
    text: "content:events.pactSeal.text",
    codex: "pactLedger",
    options: [
      {
        id: "complete",
        label: "content:events.pactSeal.complete",
        outcomes: [
          {
            text: "content:events.pactSeal.completeOut",
            effects: [
              { k: "flag", key: "pactSealed" },
              { k: "flag", key: "beacon4" },
              { k: "axis", n: -2 },
              { k: "loot", rarity: "rare" },
            ],
            codex: "pactLedger",
            consequence: "content:consequence.pactSealed",
          },
        ],
      },
      {
        id: "betray",
        label: "content:events.pactSeal.betray",
        outcomes: [
          {
            text: "content:events.pactSeal.betrayOut",
            effects: [
              { k: "flag", key: "choirEnemy" },
              { k: "flag", key: "beacon4" },
              { k: "axis", n: 2 },
            ],
            consequence: "content:consequence.choirEnemy",
            follow: {
              enemyIds: ["zealotRam", "choirAcolyte"],
              scrap: 40,
              loot: { rarity: "rare" },
              setFlags: [["choirBetrayed", true]],
            },
          },
        ],
      },
    ],
  },
  {
    id: "pactSealSkipped",
    kind: "beacon",
    weight: 1,
    speaker: "choirPreacher",
    requires: { sector: [4], flags: { not: ["pactStep1"] } },
    text: "content:events.pactSealSkipped.text",
    options: [
      {
        id: "watch",
        label: "content:events.pactSealSkipped.watch",
        outcomes: [
          {
            text: "content:events.pactSealSkipped.watchOut",
            effects: [
              { k: "flag", key: "beacon4" },
              { k: "axis", n: 1 },
              { k: "scrap", n: 30 },
            ],
          },
        ],
      },
      {
        id: "burn",
        label: "content:events.pactSealSkipped.burn",
        outcomes: [
          {
            text: "content:events.pactSealSkipped.burnOut",
            effects: [
              { k: "flag", key: "beacon4" },
              { k: "flag", key: "choirEnemy" },
              { k: "axis", n: 2 },
              { k: "battleMod", mod: "enemyPlus", n: 1, battles: 2 },
            ],
            consequence: "content:consequence.choirEnemy",
          },
        ],
      },
    ],
  },
  {
    id: "coreThreshold",
    kind: "beacon",
    weight: 1,
    speaker: "beaconKeeper",
    requires: { sector: [5] },
    text: "content:events.coreThreshold.text",
    codex: "coreThreshold",
    options: [
      {
        id: "listen",
        label: "content:events.coreThreshold.listen",
        outcomes: [
          {
            text: "content:events.coreThreshold.listenOut",
            effects: [
              { k: "flag", key: "silentReady" },
              { k: "flag", key: "beacon5" },
              { k: "hull", n: 6 },
            ],
            codex: "coreThreshold",
            consequence: "content:consequence.silentReady",
          },
        ],
      },
      {
        id: "answer",
        label: "content:events.coreThreshold.answer",
        outcomes: [
          {
            text: "content:events.coreThreshold.answerOut",
            effects: [
              { k: "flag", key: "coreAnswered" },
              { k: "flag", key: "beacon5" },
              { k: "axis", n: -1 },
              { k: "battleMod", mod: "startCharge", n: 4, battles: 2 },
            ],
          },
        ],
      },
      {
        id: "silence",
        label: "content:events.coreThreshold.silence",
        outcomes: [
          {
            text: "content:events.coreThreshold.silenceOut",
            effects: [
              { k: "flag", key: "coreSilenced" },
              { k: "flag", key: "beacon5" },
              { k: "axis", n: 1 },
              { k: "nodeMod", mod: "endHeal", n: 2 },
            ],
          },
        ],
      },
    ],
  },
  // «За Ядром»'s own beacon. It does not add a sixth counter — the five-beacon
  // network is the campaign's — it hands the keeper's last hint to a captain who
  // has already resolved all five, and writes the flag the true ending reads.
  {
    id: "thresholdBeacon",
    kind: "beacon",
    weight: 1,
    speaker: "beaconKeeper",
    requires: { sector: [6] },
    text: "content:events.thresholdBeacon.text",
    codex: "thresholdBeacon",
    options: [
      {
        id: "hold",
        label: "content:events.thresholdBeacon.hold",
        requires: { req: "axis", min: -2, max: 2 },
        outcomes: [
          {
            text: "content:events.thresholdBeacon.holdOut",
            effects: [
              { k: "flag", key: "thresholdHeard" },
              { k: "hull", n: 10 },
            ],
            codex: "thresholdBeacon",
            consequence: "content:consequence.thresholdHeard",
          },
        ],
      },
      {
        id: "commit",
        label: "content:events.thresholdBeacon.commit",
        outcomes: [
          {
            text: "content:events.thresholdBeacon.commitOut",
            effects: [
              { k: "flag", key: "thresholdCommitted" },
              { k: "battleMod", mod: "startCharge", n: 6, battles: 3 },
              { k: "scrap", n: 50 },
            ],
            consequence: "content:consequence.thresholdCommitted",
          },
        ],
      },
      {
        id: "walk",
        label: "content:events.thresholdBeacon.walk",
        outcomes: [
          {
            text: "content:events.thresholdBeacon.walkOut",
            effects: [
              { k: "flag", key: "thresholdWalked" },
              { k: "tide", n: -1 },
              { k: "nodeMod", mod: "revealRows", n: 3 },
            ],
            consequence: "content:consequence.thresholdWalked",
          },
        ],
      },
    ],
  },
];

export const BEACON_FLAGS: readonly string[] = [
  "beacon1",
  "beacon2",
  "beacon3",
  "beacon4",
  "beacon5",
];

export const BEACON_TOTAL = BEACON_FLAGS.length;

export const beaconsResolved = (
  flags: Record<string, unknown>,
): number => BEACON_FLAGS.filter((key) => flags[key] !== undefined).length;
