import { describe, expect, it } from "vitest";
import { harnessEnemy, harnessSnap } from "@/game/battle/battleHarness";
import { evasionFor, intentHits } from "@/game/battle/resolver";
import { expectedHit, mitigationOf } from "@/game/battle/view/forecast";
import { createStream } from "@/services/rng";
import { INTENT_KINDS, type Intent } from "@/types/content";

const SAMPLES: readonly Intent[] = [
  { t: "attack", n: 5 },
  { t: "attack", n: 9, self: 2 },
  { t: "multi", n: 3, k: 2 },
  { t: "multi", n: 2, k: 4 },
  { t: "shield", n: 4 },
  { t: "shieldAll", n: 3 },
  { t: "charge" },
  { t: "jamSlot" },
  { t: "lockDie" },
  { t: "summon", id: "choirAcolyte" },
  { t: "healAllies", n: 4 },
  { t: "mirrorHalf" },
  { t: "stealScrap", n: 6 },
  { t: "capShrink" },
  { t: "twistDie" },
  { t: "swapValues" },
  { t: "storm" },
  { t: "curseDie", n: 2 },
  { t: "shieldGate", n: 6 },
  { t: "mirrorSchool" },
  { t: "drainCharge", n: 3 },
  { t: "siphonShield", n: 4 },
  { t: "bargain", n: 10, heal: 6 },
  { t: "enrage", n: 2 },
  { t: "hijack" },
  { t: "echoTotal", cap: 14 },
  { t: "foldOrder" },
  { t: "devourDie" },
];

const snapFor = (intent: Intent, seed: number) => {
  const stream = createStream(seed);
  const shield = stream.int(0, 12);
  const tide = stream.int(0, 3);
  const engineValue = stream.int(0, 9);
  return harnessSnap([], {
    tide,
    hull: 30,
    hullMax: 30,
    shield,
    lastPlayerDamage: stream.int(0, 20),
    evasion: engineValue === 0 ? null : evasionFor(engineValue),
    enemies: [harnessEnemy({ nextIntent: intent })],
  });
};

describe("mitigation view", () => {
  it("covers every intent kind", () => {
    expect(new Set(SAMPLES.map((intent) => intent.t)).size).toBe(
      INTENT_KINDS.length,
    );
  });

  it("splits the expected hit into shield and hull across 20 seeded intents", () => {
    let checked = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const intent = SAMPLES[seed % SAMPLES.length];
      if (intent === undefined) continue;
      const snapshot = snapFor(intent, seed * 977);
      const enemy = snapshot.enemies[0];
      if (enemy === undefined) continue;
      const view = mitigationOf(snapshot, enemy);

      const hits = intentHits(snapshot, enemy, intent);
      const raw = hits.reduce((sum, hit) => sum + hit, 0);
      const expected = hits.reduce(
        (sum, hit) => sum + expectedHit(hit, snapshot.evasion),
        0,
      );

      expect(view.raw).toBe(raw);
      expect(view.expected).toBe(Math.round(expected));
      expect(view.shield).toBe(Math.round(Math.min(snapshot.shield, expected)));
      expect(view.shield + view.hull).toBe(
        Math.round(Math.min(snapshot.shield, expected)) +
          Math.round(expected - Math.min(snapshot.shield, expected)),
      );
      expect(view.expected).toBeLessThanOrEqual(view.raw);
      expect(view.hull).toBeGreaterThanOrEqual(0);
      expect(view.shield).toBeLessThanOrEqual(snapshot.shield);
      checked += 1;
    }
    expect(checked).toBe(20);
  });

  it("reports nothing for an intent that never lands a hit", () => {
    const snapshot = snapFor({ t: "charge" }, 3);
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("no enemy");
    expect(mitigationOf(snapshot, enemy).raw).toBe(0);
  });
});
