import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import process from "node:process";
import {
  MUSIC_IDS,
  MUSIC_SECONDS,
  SFX_IDS,
  SFX_VARIANTS,
  variantId,
} from "../src/data/audio";
import { fnv1a, mulberry32 } from "../src/services/rng";

const SFX_RATE = 22050;
const MUSIC_RATE = 16000;
const PEAK = 0.71;

type Wave = "sine" | "saw" | "square" | "tri" | "noise";
type FreqFn = (t: number) => number;
type Rand = () => number;

const toWav = (samples: Float64Array, rate: number): Buffer => {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i] ?? 0));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
};

const cst =
  (f: number): FreqFn =>
  () =>
    f;

const swp =
  (f0: number, f1: number, ms: number, curve = 1): FreqFn =>
  (t) =>
    f0 + (f1 - f0) * Math.min(1, (t * 1000) / ms) ** curve;

const vib =
  (base: FreqFn, hz: number, depth: number): FreqFn =>
  (t) =>
    base(t) * (1 + Math.sin(2 * Math.PI * hz * t) * depth);

interface ToneOpts {
  wave: Wave;
  freq: FreqFn;
  ms: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  gain?: number;
  rate?: number;
}

const oscillate = (wave: Wave, phase: number, rand: Rand): number => {
  switch (wave) {
    case "sine":
      return Math.sin(phase);
    case "saw":
      return 1 - ((phase / Math.PI) % 2);
    case "square":
      return Math.sin(phase) >= 0 ? 1 : -1;
    case "tri":
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case "noise":
      return rand() * 2 - 1;
  }
};

const envelope = (
  i: number,
  total: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
): number => {
  const a = Math.max(1, attack * total);
  const d = Math.max(1, decay * total);
  const r = Math.max(1, release * total);
  if (i < a) return i / a;
  if (i < a + d) return 1 - (1 - sustain) * ((i - a) / d);
  if (i > total - r) return sustain * Math.max(0, (total - i) / r);
  return sustain;
};

const tone = (o: ToneOpts, rand: Rand): Float64Array => {
  const rate = o.rate ?? SFX_RATE;
  const total = Math.max(1, Math.floor((o.ms / 1000) * rate));
  const out = new Float64Array(total);
  const gain = o.gain ?? 1;
  let phase = 0;
  for (let i = 0; i < total; i += 1) {
    const t = i / rate;
    phase += (2 * Math.PI * o.freq(t)) / rate;
    const env = envelope(
      i,
      total,
      o.attack ?? 0.02,
      o.decay ?? 0.2,
      o.sustain ?? 0.7,
      o.release ?? 0.4,
    );
    out[i] = oscillate(o.wave, phase, rand) * env * gain;
  }
  return out;
};

interface Part {
  buf: Float64Array;
  atMs?: number;
  gain?: number;
  rate?: number;
}

const mix = (parts: readonly Part[], rate = SFX_RATE): Float64Array => {
  let length = 0;
  for (const part of parts) {
    const offset = Math.floor(((part.atMs ?? 0) / 1000) * rate);
    length = Math.max(length, offset + part.buf.length);
  }
  const out = new Float64Array(length);
  for (const part of parts) {
    const offset = Math.floor(((part.atMs ?? 0) / 1000) * rate);
    const gain = part.gain ?? 1;
    for (let i = 0; i < part.buf.length; i += 1) {
      out[offset + i] = (out[offset + i] ?? 0) + (part.buf[i] ?? 0) * gain;
    }
  }
  return out;
};

const trim = (buf: Float64Array, threshold = 0.002): Float64Array => {
  let start = 0;
  let end = buf.length - 1;
  while (start < buf.length && Math.abs(buf[start] ?? 0) < threshold) start += 1;
  while (end > start && Math.abs(buf[end] ?? 0) < threshold) end -= 1;
  return buf.slice(start, end + 1);
};

const normalize = (buf: Float64Array, peak = PEAK): Float64Array => {
  let max = 0;
  for (const v of buf) max = Math.max(max, Math.abs(v));
  if (max === 0) return buf;
  const k = peak / max;
  const out = new Float64Array(buf.length);
  for (let i = 0; i < buf.length; i += 1) out[i] = (buf[i] ?? 0) * k;
  return out;
};

// A short fade at both ends keeps every clip click-free after trimming.
const deClick = (buf: Float64Array, rate: number): Float64Array => {
  const fade = Math.min(Math.floor(rate * 0.004), Math.floor(buf.length / 4));
  if (fade <= 1) return buf;
  const out = Float64Array.from(buf);
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade;
    out[i] = (out[i] ?? 0) * k;
    out[buf.length - 1 - i] = (out[buf.length - 1 - i] ?? 0) * k;
  }
  return out;
};

type Build = (rand: Rand, variant: number) => Float64Array;

// Round-robin variants are authored, not resampled: each one shifts pitch and
// length by different amounts, so a variant never sounds like the runtime rate
// jitter applied twice.
const DETUNE = [1, 1.038, 0.966];
const STRETCH = [1, 0.92, 1.07];

const det = (variant: number): number => DETUNE[variant] ?? 1;
const dur = (variant: number): number => STRETCH[variant] ?? 1;

const clip = (id: string, variant: number, build: Build): Float64Array => {
  const seed = variant <= 0 ? `sfx:${id}` : `sfx:${id}#${String(variant)}`;
  const rand = mulberry32(fnv1a(seed));
  return deClick(normalize(trim(build(rand, variant))), SFX_RATE);
};

const rattle = (rand: Rand, hits: number, spreadMs: number): Float64Array => {
  const parts: Part[] = [];
  for (let i = 0; i < hits; i += 1) {
    parts.push({
      buf: tone(
        {
          wave: "noise",
          freq: cst(1),
          ms: 34 + rand() * 26,
          attack: 0.01,
          decay: 0.4,
          sustain: 0.18,
          release: 0.5,
          gain: 0.5 + rand() * 0.5,
        },
        rand,
      ),
      atMs: (i / hits) * spreadMs + rand() * 12,
    });
    parts.push({
      buf: tone(
        {
          wave: "tri",
          freq: swp(320 + rand() * 260, 150 + rand() * 90, 60),
          ms: 60,
          attack: 0.01,
          decay: 0.5,
          sustain: 0.1,
          release: 0.5,
          gain: 0.35,
        },
        rand,
      ),
      atMs: (i / hits) * spreadMs + rand() * 12,
    });
  }
  return mix(parts);
};

const blip = (
  rand: Rand,
  freq: number,
  ms: number,
  wave: Wave = "sine",
): Float64Array =>
  mix([
    {
      buf: tone(
        {
          wave,
          freq: cst(freq),
          ms,
          attack: 0.04,
          decay: 0.3,
          sustain: 0.55,
          release: 0.55,
        },
        rand,
      ),
    },
    {
      buf: tone(
        {
          wave: "sine",
          freq: cst(freq * 2),
          ms: ms * 0.6,
          attack: 0.02,
          decay: 0.4,
          sustain: 0.2,
          release: 0.6,
          gain: 0.28,
        },
        rand,
      ),
    },
  ]);

const arpeggio = (
  rand: Rand,
  freqs: readonly number[],
  stepMs: number,
  wave: Wave = "sine",
): Float64Array =>
  mix(
    freqs.map((f, i) => ({
      buf: tone(
        {
          wave,
          freq: cst(f),
          ms: stepMs * 2.2,
          attack: 0.03,
          decay: 0.3,
          sustain: 0.45,
          release: 0.6,
          gain: 0.8,
        },
        rand,
      ),
      atMs: i * stepMs,
    })),
  );

const impact = (rand: Rand, low: number, ms: number): Float64Array =>
  mix([
    {
      buf: tone(
        {
          wave: "noise",
          freq: cst(1),
          ms: ms * 0.5,
          attack: 0.005,
          decay: 0.5,
          sustain: 0.1,
          release: 0.5,
          gain: 0.55,
        },
        rand,
      ),
    },
    {
      buf: tone(
        {
          wave: "sine",
          freq: swp(low * 2.4, low, ms, 0.6),
          ms,
          attack: 0.005,
          decay: 0.45,
          sustain: 0.2,
          release: 0.55,
          gain: 0.9,
        },
        rand,
      ),
    },
  ]);

const noiseBreath = (
  rand: Rand,
  ms: number,
  gain: number,
  attack = 0.3,
): Float64Array =>
  tone(
    {
      wave: "noise",
      freq: cst(1),
      ms,
      attack,
      decay: 0.35,
      sustain: 0.45,
      release: 0.5,
      gain,
    },
    rand,
  );

const drone = (
  rand: Rand,
  freq: number,
  ms: number,
  gain: number,
): Float64Array =>
  tone(
    {
      wave: "sine",
      freq: vib(cst(freq), 0.9, 0.012),
      ms,
      attack: 0.18,
      decay: 0.25,
      sustain: 0.8,
      release: 0.4,
      gain,
    },
    rand,
  );

const SFX: Record<string, Build> = {
  rollTumble: (r, v) => rattle(r, 9, 420 * dur(v)),
  place: (r, v) => blip(r, 620 * det(v), 90 * dur(v), "tri"),
  invalid: (r) =>
    mix([
      { buf: tone({ wave: "square", freq: cst(150), ms: 90, gain: 0.5 }, r) },
      {
        buf: tone({ wave: "square", freq: cst(112), ms: 130, gain: 0.5 }, r),
        atMs: 90,
      },
    ]),
  reroll: (r) =>
    mix([
      { buf: rattle(r, 4, 160), gain: 0.7 },
      { buf: blip(r, 880, 120), atMs: 150, gain: 0.6 },
    ]),
  nudge: (r) => blip(r, 1180, 60, "sine"),
  surge: (r) =>
    mix([
      {
        buf: tone(
          { wave: "saw", freq: swp(180, 900, 260, 1.6), ms: 300, gain: 0.5 },
          r,
        ),
      },
      { buf: blip(r, 1320, 180), atMs: 220, gain: 0.55 },
    ]),
  charge: (r) => blip(r, 780, 70, "sine"),
  weapons: (r, v) =>
    mix([
      {
        buf: tone(
          {
            wave: "saw",
            freq: swp(760 * det(v), 210 * det(v), 150, 1.4),
            ms: 170 * dur(v),
            attack: 0.005,
            decay: 0.5,
            sustain: 0.15,
            release: 0.5,
            gain: 0.7,
          },
          r,
        ),
      },
      { buf: impact(r, 120, 150), gain: 0.55 },
    ]),
  spinalFire: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "saw",
            freq: swp(120, 46, 420, 0.8),
            ms: 460,
            attack: 0.02,
            decay: 0.5,
            sustain: 0.35,
            release: 0.4,
            gain: 0.85,
          },
          r,
        ),
      },
      { buf: impact(r, 70, 320), gain: 0.7 },
      { buf: rattle(r, 3, 120), gain: 0.3, atMs: 60 },
    ]),
  spinalJam: (r) =>
    mix([
      {
        buf: tone(
          { wave: "square", freq: swp(300, 90, 260), ms: 280, gain: 0.55 },
          r,
        ),
      },
      { buf: rattle(r, 3, 90), gain: 0.5, atMs: 40 },
    ]),
  shields: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "sine",
            freq: swp(300, 760, 240),
            ms: 280,
            attack: 0.1,
            decay: 0.3,
            sustain: 0.6,
            release: 0.5,
            gain: 0.7,
          },
          r,
        ),
      },
      { buf: blip(r, 1560, 120), atMs: 140, gain: 0.3 },
    ]),
  shieldHit: (r, v) =>
    mix([
      { buf: blip(r, 420 * det(v), 130 * dur(v), "tri"), gain: 0.7 },
      { buf: tone({ wave: "noise", freq: cst(1), ms: 90, gain: 0.3 }, r) },
    ]),
  shieldBreak: (r) =>
    mix([
      {
        buf: tone(
          { wave: "square", freq: swp(760, 180, 280, 1.4), ms: 320, gain: 0.55 },
          r,
        ),
      },
      { buf: rattle(r, 5, 200), gain: 0.55 },
    ]),
  engines: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 320,
            attack: 0.15,
            decay: 0.3,
            sustain: 0.55,
            release: 0.5,
            gain: 0.5,
          },
          r,
        ),
      },
      {
        buf: tone(
          { wave: "tri", freq: swp(180, 420, 300), ms: 320, gain: 0.4 },
          r,
        ),
      },
    ]),
  sensors: (r) =>
    mix([
      { buf: blip(r, 1480, 70), gain: 0.6 },
      { buf: blip(r, 1980, 90), atMs: 90, gain: 0.5 },
    ]),
  reactor: (r) =>
    mix([
      {
        buf: tone(
          { wave: "sine", freq: swp(220, 520, 200), ms: 240, gain: 0.7 },
          r,
        ),
      },
      { buf: blip(r, 1040, 110), atMs: 120, gain: 0.35 },
    ]),
  repair: (r) => arpeggio(r, [523, 659, 784], 90),
  hullHit: (r, v) => impact(r, 96 * det(v), 260 * dur(v)),
  dodge: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 200,
            attack: 0.05,
            decay: 0.4,
            sustain: 0.25,
            release: 0.6,
            gain: 0.45,
          },
          r,
        ),
      },
      {
        buf: tone(
          { wave: "sine", freq: swp(880, 1560, 180), ms: 200, gain: 0.35 },
          r,
        ),
      },
    ]),
  burnTick: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 150,
            attack: 0.02,
            decay: 0.5,
            sustain: 0.2,
            release: 0.5,
            gain: 0.4,
          },
          r,
        ),
      },
      { buf: blip(r, 340, 120, "saw"), gain: 0.45 },
    ]),
  summon: (r) => arpeggio(r, [196, 262, 330], 110, "saw"),
  setComplete: (r) => arpeggio(r, [659, 880, 1175, 1568], 80),
  win: (r) => arpeggio(r, [523, 659, 784, 1047], 130),
  lose: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "saw",
            freq: swp(420, 96, 620, 0.8),
            ms: 700,
            attack: 0.02,
            decay: 0.4,
            sustain: 0.45,
            release: 0.5,
            gain: 0.7,
          },
          r,
        ),
      },
      { buf: impact(r, 70, 400), atMs: 240, gain: 0.5 },
    ]),
  lootCommon: (r) => blip(r, 660, 140),
  lootUncommon: (r) => arpeggio(r, [660, 880], 100),
  lootRare: (r) => arpeggio(r, [660, 880, 1175], 100),
  lootLegendary: (r) =>
    mix([
      { buf: arpeggio(r, [660, 880, 1175, 1568, 2093], 110) },
      {
        buf: tone(
          { wave: "sine", freq: vib(cst(2637), 6, 0.01), ms: 700, gain: 0.3 },
          r,
        ),
        atMs: 440,
      },
    ]),
  levelUp: (r) =>
    mix([
      { buf: arpeggio(r, [392, 523, 659, 784, 1047], 120) },
      {
        buf: tone(
          { wave: "sine", freq: cst(1568), ms: 520, gain: 0.28 },
          r,
        ),
        atMs: 480,
      },
    ]),
  chartAllocate: (r) => arpeggio(r, [880, 1175], 80),
  jump: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 620,
            attack: 0.25,
            decay: 0.3,
            sustain: 0.6,
            release: 0.4,
            gain: 0.45,
          },
          r,
        ),
      },
      {
        buf: tone(
          { wave: "saw", freq: swp(120, 980, 560, 1.8), ms: 620, gain: 0.5 },
          r,
        ),
      },
    ]),
  fogReveal: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 420,
            attack: 0.3,
            decay: 0.3,
            sustain: 0.5,
            release: 0.5,
            gain: 0.35,
          },
          r,
        ),
      },
      { buf: blip(r, 1320, 220), atMs: 160, gain: 0.4 },
    ]),
  bossIntro: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "saw",
            freq: swp(44, 88, 900, 0.7),
            ms: 1000,
            attack: 0.12,
            decay: 0.3,
            sustain: 0.7,
            release: 0.35,
            gain: 0.8,
          },
          r,
        ),
      },
      { buf: impact(r, 60, 500), atMs: 60, gain: 0.7 },
      { buf: rattle(r, 4, 400), gain: 0.25, atMs: 300 },
    ]),
  bossPhase: (r) =>
    mix([
      { buf: impact(r, 80, 420), gain: 0.8 },
      {
        buf: tone(
          { wave: "square", freq: swp(220, 70, 380), ms: 420, gain: 0.45 },
          r,
        ),
      },
    ]),
  endingSting: (r) =>
    mix([
      { buf: arpeggio(r, [262, 330, 392, 523], 220) },
      {
        buf: tone(
          { wave: "sine", freq: cst(131), ms: 1400, gain: 0.35 },
          r,
        ),
      },
    ]),
  buy: (r) => arpeggio(r, [784, 1047], 70),

  eventOpen: (r) =>
    mix([
      { buf: noiseBreath(r, 320, 0.22), gain: 0.8 },
      {
        buf: tone(
          { wave: "tri", freq: swp(196, 294, 240), ms: 300, gain: 0.5 },
          r,
        ),
      },
      { buf: blip(r, 587, 200, "sine"), atMs: 130, gain: 0.4 },
    ]),
  optionTick: (r, v) => blip(r, 900 * det(v), 42 * dur(v), "tri"),
  checkDrum: (r) =>
    mix([
      { buf: rattle(r, 6, 340), gain: 0.5 },
      {
        buf: tone(
          {
            wave: "sine",
            freq: swp(140, 84, 420, 0.7),
            ms: 460,
            attack: 0.06,
            decay: 0.4,
            sustain: 0.5,
            release: 0.4,
            gain: 0.75,
          },
          r,
        ),
      },
    ]),
  checkPass: (r) => arpeggio(r, [523, 784, 1047], 70),
  checkFail: (r) => arpeggio(r, [440, 349, 262], 95, "saw"),
  consequenceChime: (r) =>
    mix([
      { buf: blip(r, 1046, 180), gain: 0.6 },
      { buf: blip(r, 1568, 140), atMs: 90, gain: 0.35 },
    ]),

  puzzlePlace: (r, v) => blip(r, 494 * det(v), 84 * dur(v), "tri"),
  ruleTick: (r, v) => blip(r, 1396 * det(v), 34 * dur(v), "sine"),
  solveT13: (r) => arpeggio(r, [659, 880, 1175], 85),
  solveT45: (r) =>
    mix([
      { buf: arpeggio(r, [523, 659, 784, 1047, 1319], 110) },
      {
        buf: tone(
          { wave: "sine", freq: vib(cst(1568), 5, 0.008), ms: 900, gain: 0.26 },
          r,
        ),
        atMs: 520,
      },
      { buf: drone(r, 131, 1100, 0.22) },
    ]),
  puzzleFail: (r) =>
    mix([
      { buf: tone({ wave: "tri", freq: cst(233), ms: 150, gain: 0.5 }, r) },
      {
        buf: tone({ wave: "tri", freq: cst(175), ms: 220, gain: 0.45 }, r),
        atMs: 140,
      },
    ]),
  attemptSpent: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 70,
            attack: 0.02,
            decay: 0.5,
            sustain: 0.15,
            release: 0.5,
            gain: 0.3,
          },
          r,
        ),
      },
      { buf: blip(r, 262, 130, "tri"), gain: 0.45 },
    ]),

  navTick: (r, v) => blip(r, 1180 * det(v), 26 * dur(v), "sine"),
  barkChime: (r) =>
    mix([
      { buf: blip(r, 1760, 80), gain: 0.5 },
      { buf: blip(r, 2637, 60), atMs: 40, gain: 0.22 },
    ]),
  mkSweep: (r) =>
    mix([
      { buf: noiseBreath(r, 420, 0.3, 0.4), gain: 0.7 },
      {
        buf: tone(
          { wave: "saw", freq: swp(220, 940, 380, 1.5), ms: 420, gain: 0.42 },
          r,
        ),
      },
      { buf: blip(r, 1568, 200), atMs: 300, gain: 0.35 },
    ]),

  tideUp: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "saw",
            freq: swp(66, 128, 660, 0.9),
            ms: 760,
            attack: 0.2,
            decay: 0.3,
            sustain: 0.7,
            release: 0.35,
            gain: 0.7,
          },
          r,
        ),
      },
      { buf: rattle(r, 3, 260), gain: 0.22, atMs: 260 },
    ]),
  cacheClaim: (r) =>
    mix([
      { buf: arpeggio(r, [784, 1047], 65) },
      { buf: blip(r, 1319, 110), atMs: 130, gain: 0.3 },
    ]),
  detourEntry: (r) =>
    mix([
      { buf: noiseBreath(r, 320, 0.24, 0.12), gain: 0.7 },
      {
        buf: tone(
          { wave: "tri", freq: swp(523, 311, 300, 1.2), ms: 340, gain: 0.55 },
          r,
        ),
      },
    ]),
  laneMotif: (r) => arpeggio(r, [659, 494], 120, "tri"),

  bossDown: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "saw",
            freq: swp(176, 41, 900, 0.75),
            ms: 1000,
            attack: 0.02,
            decay: 0.4,
            sustain: 0.5,
            release: 0.4,
            gain: 0.8,
          },
          r,
        ),
      },
      { buf: impact(r, 58, 520), atMs: 120, gain: 0.75 },
      { buf: rattle(r, 5, 420), gain: 0.3, atMs: 220 },
      { buf: arpeggio(r, [131, 196], 260), atMs: 700, gain: 0.5 },
    ]),
  eliteIntro: (r) =>
    mix([
      { buf: impact(r, 130, 200), gain: 0.5 },
      { buf: arpeggio(r, [330, 494], 90, "square"), gain: 0.55 },
    ]),

  journalStamp: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 44,
            attack: 0.02,
            decay: 0.6,
            sustain: 0.1,
            release: 0.4,
            gain: 0.32,
          },
          r,
        ),
      },
      { buf: blip(r, 233, 70, "tri"), gain: 0.4 },
    ]),
  memoryReveal: (r) =>
    mix([
      { buf: arpeggio(r, [392, 523, 659], 155) },
      {
        buf: tone(
          { wave: "sine", freq: vib(cst(784), 4.5, 0.01), ms: 900, gain: 0.3 },
          r,
        ),
        atMs: 420,
      },
      { buf: drone(r, 98, 1100, 0.2) },
    ]),
  axisTick: (r, v) => blip(r, 880 * det(v), 52 * dur(v), "tri"),
  epilogueSting: (r) =>
    mix([
      { buf: arpeggio(r, [131, 165, 196], 300, "tri") },
      { buf: drone(r, 65.4, 1600, 0.4) },
    ]),
  beaconEntry: (r) =>
    mix([
      { buf: arpeggio(r, [262, 392, 523], 175) },
      {
        buf: tone(
          { wave: "sine", freq: cst(1046), ms: 620, gain: 0.24 },
          r,
        ),
        atMs: 420,
      },
    ]),
  chainStep: (r, v) => arpeggio(r, [698 * det(v), 880 * det(v)], 105),

  achievement: (r) =>
    mix([
      { buf: arpeggio(r, [1047, 1319], 68) },
      {
        buf: tone({ wave: "sine", freq: cst(2093), ms: 420, gain: 0.22 }, r),
        atMs: 150,
      },
    ]),
  unlockCard: (r) =>
    mix([
      { buf: noiseBreath(r, 220, 0.2, 0.35), gain: 0.6 },
      { buf: blip(r, 880, 140), atMs: 70, gain: 0.5 },
    ]),
  respecConfirm: (r) =>
    mix([
      { buf: impact(r, 110, 220), gain: 0.7 },
      { buf: impact(r, 88, 260), atMs: 170, gain: 0.6 },
    ]),

  banish: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "noise",
            freq: cst(1),
            ms: 240,
            attack: 0.01,
            decay: 0.55,
            sustain: 0.2,
            release: 0.6,
            gain: 0.45,
          },
          r,
        ),
      },
      {
        buf: tone(
          { wave: "saw", freq: swp(311, 78, 320, 1.3), ms: 360, gain: 0.5 },
          r,
        ),
        atMs: 60,
      },
    ]),
  draftReroll: (r) =>
    mix([
      { buf: noiseBreath(r, 300, 0.28, 0.2), gain: 0.7 },
      {
        buf: tone(
          { wave: "tri", freq: swp(392, 988, 260, 1.4), ms: 300, gain: 0.45 },
          r,
        ),
      },
      { buf: rattle(r, 3, 140), gain: 0.3, atMs: 180 },
    ]),

  thresholdHold: (r) =>
    mix([
      { buf: drone(r, 55, 1700, 0.62) },
      { buf: drone(r, 82.4, 1700, 0.26) },
      {
        buf: tone({ wave: "sine", freq: cst(880), ms: 900, gain: 0.16 }, r),
        atMs: 700,
      },
    ]),
  inversionCue: (r) => arpeggio(r, [880, 659, 494, 370], 95, "square"),
  stormBeat: (r) =>
    mix([
      { buf: rattle(r, 4, 210), gain: 0.6 },
      {
        buf: tone(
          { wave: "tri", freq: swp(880, 622, 160, 1.6), ms: 200, gain: 0.4 },
          r,
        ),
        atMs: 90,
      },
      { buf: blip(r, 659, 170, "sine"), atMs: 330, gain: 0.55 },
    ]),
  foldBeat: (r) =>
    mix([
      {
        buf: tone(
          { wave: "square", freq: swp(587, 1175, 110, 1.2), ms: 120, gain: 0.4 },
          r,
        ),
      },
      {
        buf: tone(
          { wave: "saw", freq: swp(1175, 294, 220, 0.8), ms: 260, gain: 0.55 },
          r,
        ),
        atMs: 110,
      },
    ]),

  endingSeal: (r) =>
    mix([
      { buf: arpeggio(r, [262, 330, 392, 523], 220) },
      { buf: drone(r, 131, 1500, 0.35) },
    ]),
  endingMerge: (r) =>
    mix([
      { buf: arpeggio(r, [262, 311, 392, 466], 230) },
      { buf: drone(r, 116.5, 1600, 0.36) },
      {
        buf: tone({ wave: "sine", freq: cst(932), ms: 700, gain: 0.18 }, r),
        atMs: 860,
      },
    ]),
  endingBargain: (r) =>
    mix([
      { buf: arpeggio(r, [262, 330, 415, 494], 215) },
      { buf: drone(r, 138.6, 1500, 0.32) },
      { buf: arpeggio(r, [1319, 1760], 90), atMs: 900, gain: 0.3 },
    ]),
  endingSilent: (r) =>
    mix([
      { buf: arpeggio(r, [262, 392], 420, "tri") },
      { buf: drone(r, 87.3, 1900, 0.44) },
    ]),
  endingAnswer: (r) =>
    mix([
      { buf: arpeggio(r, [196, 262, 294, 392, 523, 784], 240) },
      { buf: drone(r, 98, 2200, 0.4) },
      {
        buf: tone(
          { wave: "sine", freq: vib(cst(1568), 3.5, 0.006), ms: 1200, gain: 0.24 },
          r,
        ),
        atMs: 1100,
      },
      { buf: noiseBreath(r, 900, 0.1, 0.5), atMs: 300 },
    ]),

  gateRaise: (r) =>
    mix([
      { buf: impact(r, 92, 280), gain: 0.75 },
      {
        buf: tone(
          { wave: "square", freq: swp(392, 117, 190, 1.3), ms: 220, gain: 0.4 },
          r,
        ),
      },
    ]),
  gateBreak: (r) =>
    mix([
      {
        buf: tone(
          { wave: "square", freq: swp(175, 698, 200, 1.2), ms: 240, gain: 0.45 },
          r,
        ),
      },
      { buf: rattle(r, 4, 180), gain: 0.5, atMs: 60 },
    ]),
  curseTick: (r) =>
    mix([
      {
        buf: tone(
          { wave: "tri", freq: swp(370, 294, 150, 1.1), ms: 180, gain: 0.5 },
          r,
        ),
      },
      {
        buf: tone({ wave: "tri", freq: cst(311), ms: 180, gain: 0.28 }, r),
        atMs: 20,
      },
    ]),
  siphonPull: (r) =>
    mix([
      { buf: noiseBreath(r, 300, 0.24, 0.6), gain: 0.7 },
      {
        buf: tone(
          { wave: "tri", freq: swp(233, 880, 280, 1.6), ms: 320, gain: 0.5 },
          r,
        ),
      },
    ]),
  bargainCoin: (r) =>
    mix([
      { buf: arpeggio(r, [1319, 1760], 60) },
      {
        buf: tone({ wave: "sine", freq: cst(2637), ms: 260, gain: 0.16 }, r),
        atMs: 90,
      },
    ]),
  enrageStep: (r) =>
    mix([
      {
        buf: tone(
          { wave: "saw", freq: swp(196, 330, 200, 1.4), ms: 240, gain: 0.5 },
          r,
        ),
      },
      { buf: impact(r, 110, 160), gain: 0.35 },
    ]),
  hijackDrag: (r) =>
    mix([
      { buf: noiseBreath(r, 280, 0.26, 0.45), gain: 0.65 },
      {
        buf: tone(
          { wave: "saw", freq: swp(147, 262, 260, 1.1), ms: 290, gain: 0.4 },
          r,
        ),
      },
      { buf: blip(r, 494, 70, "tri"), atMs: 280, gain: 0.6 },
    ]),
  wardShift: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "sine",
            freq: vib(cst(660), 7, 0.02),
            ms: 260,
            attack: 0.06,
            decay: 0.3,
            sustain: 0.55,
            release: 0.5,
            gain: 0.55,
          },
          r,
        ),
      },
      { buf: blip(r, 990, 120), atMs: 110, gain: 0.28 },
    ]),
};

// Music loops are built from partials quantised to 1/duration so the waveform
// is exactly periodic — the loop point is inaudible without a crossfade.
interface MusicSpec {
  seconds: number;
  root: number;
  partials: readonly { ratio: number; gain: number; lfoHz: number }[];
  bells: { scale: readonly number[]; count: number; gain: number };
  noiseBed: number;
}

const quantize = (freq: number, seconds: number): number =>
  Math.max(1, Math.round(freq * seconds)) / seconds;

const renderMusic = (id: string, spec: MusicSpec): Float64Array => {
  const rand = mulberry32(fnv1a(`music:${id}`));
  const total = Math.floor(spec.seconds * MUSIC_RATE);
  const out = new Float64Array(total);
  for (const partial of spec.partials) {
    const freq = quantize(spec.root * partial.ratio, spec.seconds);
    const lfo = quantize(partial.lfoHz, spec.seconds);
    for (let i = 0; i < total; i += 1) {
      const t = i / MUSIC_RATE;
      const amp = 0.6 + 0.4 * Math.sin(2 * Math.PI * lfo * t);
      out[i] = (out[i] ?? 0) + Math.sin(2 * Math.PI * freq * t) * partial.gain * amp;
    }
  }
  if (spec.noiseBed > 0) {
    let smooth = 0;
    for (let i = 0; i < total; i += 1) {
      smooth = smooth * 0.995 + (rand() * 2 - 1) * 0.005;
      out[i] = (out[i] ?? 0) + smooth * spec.noiseBed * 12;
    }
  }
  const safeEnd = total - MUSIC_RATE * 2;
  for (let n = 0; n < spec.bells.count; n += 1) {
    const at = Math.floor(rand() * safeEnd);
    const note = spec.bells.scale[Math.floor(rand() * spec.bells.scale.length)] ?? 1;
    const freq = spec.root * note * 4;
    const len = Math.floor(MUSIC_RATE * (1.2 + rand()));
    for (let i = 0; i < len && at + i < total; i += 1) {
      const t = i / MUSIC_RATE;
      const env = Math.exp(-t * 2.4);
      out[at + i] =
        (out[at + i] ?? 0) +
        Math.sin(2 * Math.PI * freq * t) * env * spec.bells.gain;
    }
  }
  return normalize(out, 0.62);
};

const MUSIC: Record<(typeof MUSIC_IDS)[number], MusicSpec> = {
  menu: {
    seconds: 20,
    root: 55,
    partials: [
      { ratio: 1, gain: 0.5, lfoHz: 0.05 },
      { ratio: 1.5, gain: 0.26, lfoHz: 0.075 },
      { ratio: 2, gain: 0.18, lfoHz: 0.1 },
      { ratio: 3, gain: 0.09, lfoHz: 0.15 },
    ],
    bells: { scale: [1, 1.125, 1.335, 1.5, 1.78], count: 14, gain: 0.16 },
    noiseBed: 0.02,
  },
  map: {
    seconds: 20,
    root: 73.4,
    partials: [
      { ratio: 1, gain: 0.42, lfoHz: 0.05 },
      { ratio: 1.5, gain: 0.2, lfoHz: 0.08 },
      { ratio: 2.24, gain: 0.12, lfoHz: 0.11 },
      { ratio: 4, gain: 0.05, lfoHz: 0.13 },
    ],
    bells: { scale: [1, 1.335, 1.5, 2], count: 8, gain: 0.14 },
    noiseBed: 0.015,
  },
  battle: {
    seconds: 20,
    root: 49,
    partials: [
      { ratio: 1, gain: 0.5, lfoHz: 0.1 },
      { ratio: 1.19, gain: 0.22, lfoHz: 0.15 },
      { ratio: 2, gain: 0.2, lfoHz: 0.2 },
      { ratio: 2.99, gain: 0.11, lfoHz: 0.25 },
    ],
    bells: { scale: [1, 1.19, 1.5, 1.78], count: 20, gain: 0.13 },
    noiseBed: 0.03,
  },
  battleBoss: {
    seconds: 20,
    root: 41,
    partials: [
      { ratio: 1, gain: 0.55, lfoHz: 0.15 },
      { ratio: 1.06, gain: 0.3, lfoHz: 0.2 },
      { ratio: 1.5, gain: 0.22, lfoHz: 0.3 },
      { ratio: 2.06, gain: 0.16, lfoHz: 0.4 },
    ],
    bells: { scale: [1, 1.06, 1.41, 1.5], count: 10, gain: 0.18 },
    noiseBed: 0.05,
  },
};

const writeSet = (
  dir: string,
  rate: number,
  entries: readonly [string, Float64Array][],
): void => {
  mkdirSync(dir, { recursive: true });
  const keep = new Set(entries.flatMap(([id]) => [`${id}.wav`, `${id}.webm`]));
  for (const file of readdirSync(dir)) {
    if ((file.endsWith(".wav") || file.endsWith(".webm")) && !keep.has(file)) {
      rmSync(join(dir, file));
      console.log(`  removed stale ${file}`);
    }
  }
  for (const [id, samples] of entries) {
    writeFileSync(join(dir, `${id}.wav`), toWav(samples, rate));
  }
};

// D7: the encoder is build-time only. `ffmpeg-static` is the dependency that
// makes the step reproducible on a machine with no system ffmpeg; CA_FFMPEG
// overrides it and a system binary is the last fallback.
const ffmpegBinary = (): string | null => {
  const override = process.env.CA_FFMPEG;
  if (override !== undefined && override !== "" && existsSync(override)) {
    return override;
  }
  try {
    const resolved = createRequire(import.meta.url)("ffmpeg-static") as unknown;
    if (typeof resolved === "string" && existsSync(resolved)) return resolved;
  } catch {
    /* not installed */
  }
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return probe.status === 0 ? "ffmpeg" : null;
};

interface EncodeOpts {
  bitrate: string;
  sampleRate?: number;
}

const encodeSet = (
  bin: string,
  dir: string,
  ids: readonly string[],
  opts: EncodeOpts,
): void => {
  for (const id of ids) {
    const args = [
      "-y",
      "-loglevel",
      "error",
      "-i",
      join(dir, `${id}.wav`),
      "-c:a",
      "libopus",
      "-b:a",
      opts.bitrate,
      "-vbr",
      "on",
      "-application",
      "audio",
      "-ac",
      "1",
      "-map_metadata",
      "-1",
      "-fflags",
      "+bitexact",
      "-flags:a",
      "+bitexact",
    ];
    if (opts.sampleRate !== undefined) args.push("-ar", String(opts.sampleRate));
    args.push(join(dir, `${id}.webm`));
    const run = spawnSync(bin, args, { stdio: "inherit" });
    if (run.status !== 0) {
      throw new Error(`genSfx: encoding ${id} failed (exit ${String(run.status)})`);
    }
  }
};

const bytesOf = (dir: string, ids: readonly string[], ext: string): number => {
  let total = 0;
  for (const id of ids) {
    const path = join(dir, `${id}.${ext}`);
    if (existsSync(path)) total += statSync(path).size;
  }
  return total;
};

const generatedIds = new Set(Object.keys(SFX));
const manifestIds = new Set<string>(SFX_IDS);
const missing = [...manifestIds].filter((id) => !generatedIds.has(id));
const extra = [...generatedIds].filter((id) => !manifestIds.has(id));
if (missing.length > 0 || extra.length > 0) {
  console.error(
    `genSfx: manifest drift — missing builders [${missing.join(", ")}], ` +
      `unlisted builders [${extra.join(", ")}]`,
  );
  process.exit(1);
}

const musicDrift = MUSIC_IDS.filter((id) => MUSIC[id].seconds !== MUSIC_SECONDS);
if (musicDrift.length > 0) {
  console.error(
    `genSfx: music beds must all be ${String(MUSIC_SECONDS)} s to stay ` +
      `phase-locked — offenders [${musicDrift.join(", ")}]`,
  );
  process.exit(1);
}

const sfxDir = join(process.cwd(), "public", "audio", "sfx");
const musicDir = join(process.cwd(), "public", "audio", "music");

const sfxFiles: [string, Float64Array][] = [];
for (const id of SFX_IDS) {
  const build = SFX[id];
  if (build === undefined) continue;
  const count = SFX_VARIANTS[id] ?? 1;
  for (let v = 0; v < count; v += 1) {
    sfxFiles.push([variantId(id, v), clip(id, v, build)]);
  }
}
const musicFiles: [string, Float64Array][] = MUSIC_IDS.map((id) => [
  id,
  renderMusic(id, MUSIC[id]),
]);

writeSet(sfxDir, SFX_RATE, sfxFiles);
writeSet(musicDir, MUSIC_RATE, musicFiles);

const sfxNames = sfxFiles.map(([id]) => id);
const musicNames = musicFiles.map(([id]) => id);

const bin = ffmpegBinary();
if (bin === null) {
  for (const dir of [sfxDir, musicDir]) {
    for (const file of readdirSync(dir)) {
      if (file.endsWith(".webm")) rmSync(join(dir, file));
    }
  }
  console.warn(
    "genSfx: no ffmpeg (install devDependency `ffmpeg-static` or set CA_FFMPEG) " +
      "— WebM/Opus sources skipped, the build falls back to WAV",
  );
  if (process.argv.includes("--strict")) process.exit(1);
} else {
  encodeSet(bin, sfxDir, sfxNames, { bitrate: "24k" });
  encodeSet(bin, musicDir, musicNames, { bitrate: "12k", sampleRate: 24000 });
}

const kb = (bytes: number): string => `${String(Math.round(bytes / 1024))} KB`;
const wavBytes =
  bytesOf(sfxDir, sfxNames, "wav") + bytesOf(musicDir, musicNames, "wav");
const webmBytes =
  bytesOf(sfxDir, sfxNames, "webm") + bytesOf(musicDir, musicNames, "webm");
console.log(
  `genSfx: ${String(SFX_IDS.length)} sfx ids in ${String(sfxNames.length)} renders + ` +
    `${String(musicNames.length)} music beds`,
);
console.log(`  wav masters ${kb(wavBytes)} · shipped webm ${kb(webmBytes)}`);
