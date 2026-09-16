import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const music = vi.hoisted(() => {
  class FakeHowl {
    readonly src: string;
    playCalls = 0;
    private readonly onplay: (() => void) | undefined;
    private level: number;
    private started = false;
    private loaded = false;
    private unloaded = false;
    private queue: (() => void)[] = [];

    constructor(options: {
      src: string[];
      volume?: number;
      onplay?: () => void;
    }) {
      this.src = options.src[0] ?? "";
      this.level = options.volume ?? 1;
      this.onplay = options.onplay;
      instances.push(this);
    }

    playing(): boolean {
      return this.started;
    }

    volume(next?: number): number {
      if (next === undefined) return this.level;
      if (!this.loaded) this.queue.push(() => void this.volume(next));
      else this.level = next;
      return this.level;
    }

    play(): number {
      this.playCalls += 1;
      if (!this.loaded) this.queue.push(() => this.begin());
      else this.begin();
      return 0;
    }

    fade(from: number, to: number, fadeMs: number): this {
      if (!this.loaded) this.queue.push(() => void this.fade(from, to, fadeMs));
      else this.level = to;
      return this;
    }

    stop(): this {
      this.started = false;
      return this;
    }

    unload(): this {
      this.unloaded = true;
      this.started = false;
      this.loaded = false;
      this.queue = [];
      return this;
    }

    finishLoading(): void {
      if (this.unloaded) return;
      this.loaded = true;
      const pending = this.queue;
      this.queue = [];
      for (const task of pending) task();
    }

    private begin(): void {
      this.started = true;
      this.onplay?.();
    }
  }

  const instances: FakeHowl[] = [];
  return { instances, FakeHowl };
});

vi.mock("howler", () => ({ Howl: music.FakeHowl }));

describe("music bed handoff", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { addEventListener: () => {}, removeEventListener: () => {} },
    });
    music.instances.length = 0;
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (originalWindow === undefined) Reflect.deleteProperty(globalThis, "window");
    else Object.defineProperty(globalThis, "window", originalWindow);
  });

  const bedsFor = (id: string): (typeof music.instances)[number][] =>
    music.instances.filter((howl) => howl.src === `/audio/music/${id}.webm`);

  it("drops a bed whose play is still queued instead of letting it start under the next one", async () => {
    const audio = await import("@/services/audio");
    audio.playMusic("menu");
    const menu = bedsFor("menu")[0];
    expect(menu?.playing()).toBe(false);

    audio.playMusic("map");
    menu?.finishLoading();

    expect(menu?.playing()).toBe(false);
    expect(menu?.volume()).toBe(0);
  });

  it("builds a fresh bed when an abandoned track is asked for again", async () => {
    const audio = await import("@/services/audio");
    audio.playMusic("menu");
    audio.playMusic("map");
    audio.playMusic("menu");

    const menuBeds = bedsFor("menu");
    expect(menuBeds).toHaveLength(2);
    const revived = menuBeds[1];
    revived?.finishLoading();
    expect(revived?.playing()).toBe(true);
    expect(revived?.volume()).toBeCloseTo(0.6, 5);
  });

  it("does not stack a second play on a bed that is still loading", async () => {
    const audio = await import("@/services/audio");
    audio.playMusic("menu");
    audio.duckMusic(1000);

    expect(bedsFor("menu")[0]?.playCalls).toBe(1);
  });
});
