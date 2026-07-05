import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mulberry32 } from "../src/services/rng";

const SAMPLE_RATE = 22050;

const toWav = (samples: readonly number[]): Buffer => {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
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

const rand = mulberry32(0xca57);

interface Voice {
  freqAt: (t: number) => number;
  amp: number;
  noise: number;
}

const render = (
  durationMs: number,
  attackMs: number,
  releaseMs: number,
  voices: readonly Voice[],
): number[] => {
  const total = Math.floor((durationMs / 1000) * SAMPLE_RATE);
  const attack = Math.max(1, (attackMs / 1000) * SAMPLE_RATE);
  const release = Math.max(1, (releaseMs / 1000) * SAMPLE_RATE);
  const samples: number[] = new Array<number>(total).fill(0);
  const phases = voices.map(() => 0);
  for (let i = 0; i < total; i += 1) {
    const t = i / SAMPLE_RATE;
    const env =
      Math.min(1, i / attack) * Math.min(1, (total - i) / release);
    let value = 0;
    voices.forEach((voice, v) => {
      const freq = voice.freqAt(t);
      phases[v] = (phases[v] ?? 0) + (2 * Math.PI * freq) / SAMPLE_RATE;
      const tone = Math.sin(phases[v] ?? 0);
      const noise = (rand() * 2 - 1) * voice.noise;
      value += (tone * (1 - voice.noise) + noise) * voice.amp;
    });
    samples[i] = value * env * 0.7;
  }
  return samples;
};

const constFreq = (f: number) => (): number => f;
const sweep =
  (f0: number, f1: number, durMs: number) =>
  (t: number): number =>
    f0 + (f1 - f0) * Math.min(1, t / (durMs / 1000));

const SFX: Record<string, number[]> = {
  roll: render(260, 4, 200, [{ freqAt: sweep(420, 180, 260), amp: 0.5, noise: 0.7 }]),
  place: render(90, 2, 70, [{ freqAt: constFreq(640), amp: 0.6, noise: 0.2 }]),
  hit: render(180, 2, 150, [
    { freqAt: sweep(200, 90, 180), amp: 0.7, noise: 0.5 },
  ]),
  shield: render(260, 20, 120, [
    { freqAt: sweep(300, 720, 260), amp: 0.55, noise: 0.05 },
  ]),
  win: [
    ...render(150, 6, 60, [{ freqAt: constFreq(523), amp: 0.5, noise: 0.02 }]),
    ...render(150, 6, 60, [{ freqAt: constFreq(659), amp: 0.5, noise: 0.02 }]),
    ...render(240, 6, 140, [{ freqAt: constFreq(784), amp: 0.5, noise: 0.02 }]),
  ],
  lose: render(480, 6, 300, [{ freqAt: sweep(400, 110, 480), amp: 0.55, noise: 0.1 }]),
};

const outDir = join(process.cwd(), "public", "audio", "sfx");
mkdirSync(outDir, { recursive: true });
for (const [id, samples] of Object.entries(SFX)) {
  const path = join(outDir, `${id}.wav`);
  writeFileSync(path, toWav(samples));
  console.log(`genSfx: wrote ${path} (${String(samples.length)} samples)`);
}
