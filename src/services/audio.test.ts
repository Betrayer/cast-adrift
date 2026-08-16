import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ENDING_SFX,
  HOT_SFX,
  LOOT_SFX,
  MUSIC_IDS,
  MUSIC_SECONDS,
  SFX_GAIN,
  SFX_IDS,
  SFX_JITTER,
  SFX_VARIANTS,
  musicSources,
  sfxSources,
  variantId,
  type SfxId,
} from "@/data/audio";
import { duckMusic, musicDuckDepth } from "@/services/audio";

const ids = new Set<string>(SFX_IDS);

const wavSeconds = (path: string): number => {
  const buffer = readFileSync(path);
  const rate = buffer.readUInt32LE(24);
  const bytesPerSample = buffer.readUInt16LE(34) / 8;
  const channels = buffer.readUInt16LE(22);
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunk = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (chunk === "data") return size / (rate * bytesPerSample * channels);
    offset += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${path}`);
};

describe("audio manifest", () => {
  it("has no duplicate ids", () => {
    expect(ids.size).toBe(SFX_IDS.length);
  });

  it("only tunes ids that exist", () => {
    const keys = [
      ...Object.keys(SFX_VARIANTS),
      ...Object.keys(SFX_JITTER),
      ...Object.keys(SFX_GAIN),
      ...HOT_SFX,
    ];
    expect(keys.filter((key) => !ids.has(key))).toEqual([]);
  });

  it("maps every rarity and every ending to a real clip", () => {
    const mapped = [
      ...Object.values(LOOT_SFX),
      ...Object.values(ENDING_SFX),
    ] as SfxId[];
    expect(mapped.filter((id) => !ids.has(id))).toEqual([]);
    expect(new Set(Object.values(ENDING_SFX)).size).toBe(
      Object.keys(ENDING_SFX).length,
    );
  });

  it("puts the compressed source first and the wav fallback second", () => {
    expect(sfxSources("place")).toEqual([
      "/audio/sfx/place.webm",
      "/audio/sfx/place.wav",
    ]);
    expect(musicSources("battle")[0]).toBe("/audio/music/battle.webm");
  });

  it("names variants without renaming the base clip", () => {
    expect(variantId("place", 0)).toBe("place");
    expect(variantId("place", 2)).toBe("place3");
  });
});

describe("shipped audio files", () => {
  const dir = join(process.cwd(), "public", "audio");

  it("ships every declared clip in both formats", () => {
    const missing: string[] = [];
    for (const id of SFX_IDS) {
      for (let v = 0; v < (SFX_VARIANTS[id] ?? 1); v += 1) {
        for (const ext of ["wav", "webm"]) {
          const file = join(dir, "sfx", `${variantId(id, v)}.${ext}`);
          try {
            readFileSync(file);
          } catch {
            missing.push(file);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  // The boss layer rides on top of the battle bed at the same offset, so any
  // drift in bed length turns the layer into a phasing artefact.
  it("keeps every music bed exactly the same length", () => {
    const lengths = MUSIC_IDS.map((id) =>
      wavSeconds(join(dir, "music", `${id}.wav`)),
    );
    for (const length of lengths) {
      expect(length).toBeCloseTo(MUSIC_SECONDS, 3);
    }
  });
});

describe("music ducking", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("unions nested ducks instead of ending on the shorter one", () => {
    vi.useFakeTimers();
    duckMusic(1000);
    vi.advanceTimersByTime(200);
    duckMusic(2000);
    expect(musicDuckDepth()).toBe(2);
    vi.advanceTimersByTime(900);
    expect(musicDuckDepth()).toBe(1);
    vi.advanceTimersByTime(1400);
    expect(musicDuckDepth()).toBe(0);
  });
});
