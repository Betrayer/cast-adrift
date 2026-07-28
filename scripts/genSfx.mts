import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

const clip = (id: string, build: (rand: Rand) => Float64Array): Float64Array => {
  const rand = mulberry32(fnv1a(`sfx:${id}`));
  return deClick(normalize(trim(build(rand))), SFX_RATE);
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

const SFX: Record<string, (rand: Rand) => Float64Array> = {
  rollTumble: (r) => rattle(r, 9, 420),
  place: (r) => blip(r, 620, 90, "tri"),
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
  weapons: (r) =>
    mix([
      {
        buf: tone(
          {
            wave: "saw",
            freq: swp(760, 210, 150, 1.4),
            ms: 170,
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
  shieldHit: (r) =>
    mix([
      { buf: blip(r, 420, 130, "tri"), gain: 0.7 },
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
  hullHit: (r) => impact(r, 96, 260),
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

const MUSIC: Record<string, MusicSpec> = {
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
): number => {
  mkdirSync(dir, { recursive: true });
  const keep = new Set(entries.map(([id]) => `${id}.wav`));
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".wav") && !keep.has(file)) {
      rmSync(join(dir, file));
      console.log(`  removed stale ${file}`);
    }
  }
  let bytes = 0;
  for (const [id, samples] of entries) {
    const data = toWav(samples, rate);
    bytes += data.length;
    writeFileSync(join(dir, `${id}.wav`), data);
  }
  return bytes;
};

const sfxDir = join(process.cwd(), "public", "audio", "sfx");
const musicDir = join(process.cwd(), "public", "audio", "music");

const sfxBytes = writeSet(
  sfxDir,
  SFX_RATE,
  Object.entries(SFX).map(([id, build]) => [id, clip(id, build)]),
);
const musicBytes = writeSet(
  musicDir,
  MUSIC_RATE,
  Object.entries(MUSIC).map(([id, spec]) => [id, renderMusic(id, spec)]),
);

const kb = (bytes: number): string => `${String(Math.round(bytes / 1024))} KB`;
console.log(
  `genSfx: ${String(Object.keys(SFX).length)} sfx (${kb(sfxBytes)}) + ` +
    `${String(Object.keys(MUSIC).length)} music loops (${kb(musicBytes)}) = ` +
    kb(sfxBytes + musicBytes),
);
